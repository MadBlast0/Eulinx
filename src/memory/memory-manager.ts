/**
 * P09-MEM-MANAGER — Memory Manager
 *
 * MemoryArchitecture-Part01 through Part04: orchestrates all memory layers.
 * Coordinates STM, LTM, episodic, semantic, working, and vector memory.
 * Enforces policies, manages search, and handles lifecycle.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type {
  MemoryRecord,
  MemoryKind,
  MemoryScope,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryPolicy,
  MemoryMetrics,
  StmRecord,
  LtmRecord,
  EpisodicRecord,
  SemanticRecord,
  WorkingMemoryRecord,
  LtmCategory,
} from "./memory-types"
import { ShortTermMemoryStore, WorkingMemoryStore } from "./memory-stm"
import { LongTermMemoryStore, EpisodicMemoryStore, SemanticMemoryStore } from "./memory-ltm"
import { VectorMemoryStore, MemorySearchEngine } from "./memory-vector"
import { DEFAULT_MEMORY_POLICY, redactSecrets, isScopeViolation, isUnsafeForInjection } from "./memory-policies"

// ---------------------------------------------------------------------------
// Memory Manager
// ---------------------------------------------------------------------------

export class MemoryManager {
  readonly stm: ShortTermMemoryStore
  readonly ltm: LongTermMemoryStore
  readonly episodic: EpisodicMemoryStore
  readonly semantic: SemanticMemoryStore
  readonly working: WorkingMemoryStore
  readonly vector: VectorMemoryStore
  readonly search: MemorySearchEngine
  readonly policy: MemoryPolicy

  private readonly policies: Map<string, MemoryPolicy> = new Map()

  constructor(policy?: Partial<MemoryPolicy>) {
    this.policy = { ...DEFAULT_MEMORY_POLICY, ...policy }
    this.stm = new ShortTermMemoryStore(this.policy)
    this.ltm = new LongTermMemoryStore(this.policy)
    this.episodic = new EpisodicMemoryStore()
    this.semantic = new SemanticMemoryStore()
    this.working = new WorkingMemoryStore()
    this.vector = new VectorMemoryStore()
    this.search = new MemorySearchEngine(this.vector)
  }

  // ---------------------------------------------------------------------------
  // Write Operations
  // ---------------------------------------------------------------------------

  /**
   * Write a short-term memory record.
   */
  writeStm(params: {
    content: string
    workspaceId: WorkspaceId
    scope?: "session" | "task" | "worker" | "execution"
    sessionId?: SessionId
    workerId?: WorkerId
    expiryMode?: "worker_end" | "task_end" | "session_end" | "time_to_live" | "manual_clear"
    ttlMs?: number
    tags?: readonly string[]
    sourceRef?: string
    sensitivity?: "public" | "internal" | "confidential" | "secret"
    autoIndex?: boolean
  }): StmRecord {
    const record = this.stm.write({
      content: params.sensitivity === "secret" && this.policy.autoRedactSecrets
        ? redactSecrets(params.content)
        : params.content,
      scope: params.scope ?? "worker",
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      workerId: params.workerId,
      expiryMode: params.expiryMode ?? "worker_end",
      ttlMs: params.ttlMs ?? this.policy.stmTtlMs,
      tags: params.tags,
      sourceRef: params.sourceRef,
      sensitivity: params.sensitivity,
    })

    if (params.autoIndex !== false) {
      this.search.indexRecord(record)
    }

    return record
  }

  /**
   * Promote a record to LTM.
   */
  promoteToLtm(params: {
    content: string
    workspaceId: WorkspaceId
    category: LtmCategory
    summary?: string
    sourceRef?: string
    promotedFrom?: string
    tags?: readonly string[]
    sessionId?: SessionId
    workerId?: WorkerId
  }): LtmRecord {
    const record = this.ltm.promote(params)
    this.search.indexRecord(record)
    return record
  }

  /**
   * Record an episodic event.
   */
  recordEpisode(params: {
    content: string
    workspaceId: WorkspaceId
    eventType: string
    eventTimestamp: IsoTimestamp
    participant: string
    outcome?: string
    sessionId?: SessionId
    workerId?: WorkerId
    tags?: readonly string[]
  }): EpisodicRecord {
    const record = this.episodic.record(params)
    this.search.indexRecord(record)
    return record
  }

  /**
   * Store a semantic fact.
   */
  storeSemanticFact(params: {
    content: string
    workspaceId: WorkspaceId
    factType: "definition" | "relationship" | "rule" | "procedure"
    confidence?: number
    sourceIds?: readonly string[]
    tags?: readonly string[]
  }): SemanticRecord {
    const record = this.semantic.store(params)
    this.search.indexRecord(record)
    return record
  }

  // ---------------------------------------------------------------------------
  // Read Operations
  // ---------------------------------------------------------------------------

  /**
   * Search memory with hybrid retrieval.
   */
  searchMemory(query: MemorySearchQuery): readonly MemorySearchResult[] {
    // Enforce max tokens per query
    const limitedQuery = {
      ...query,
      maxResults: Math.min(query.maxResults ?? 10, this.policy.maxTokensPerQuery),
    }

    return this.search.search(limitedQuery)
  }

  /**
   * Build context for injection into a worker.
   * MemoryArchitecture: "assemble smallest useful context."
   */
  buildContext(params: {
    workspaceId: WorkspaceId
    sessionId?: SessionId
    workerId?: WorkerId
    query: string
    maxTokens?: number
  }): readonly MemoryRecord[] {
    const results = this.searchMemory({
      text: params.query,
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      workerId: params.workerId,
      maxResults: 20,
    })

    // Filter out unsafe records
    const safe = results
      .filter(r => !isScopeViolation(r.record, params.workspaceId))
      .filter(r => !isUnsafeForInjection(r.record))
      .map(r => r.record)

    // Token budget
    const maxTokens = params.maxTokens ?? this.policy.maxTokensPerQuery
    let tokensUsed = 0
    const selected: MemoryRecord[] = []

    for (const record of safe) {
      if (tokensUsed + record.tokenEstimate > maxTokens) break
      selected.push(record)
      tokensUsed += record.tokenEstimate
    }

    return selected
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Operations
  // ---------------------------------------------------------------------------

  /**
   * Clear STM for a worker.
   */
  clearWorkerStm(workerId: WorkerId): number {
    return this.stm.clearByMode("worker_end", workerId)
  }

  /**
   * Clear STM for a session.
   */
  clearSessionStm(sessionId: SessionId): number {
    return this.stm.clearByMode("session_end", sessionId)
  }

  /**
   * Prune expired and retained records.
   */
  prune(): { stm: number; ltm: number; episodic: number; semantic: number } {
    const stmPruned = this.stm.pruneExpired()
    // LTM, episodic, semantic pruning would check retention policies
    return { stm: stmPruned, ltm: 0, episodic: 0, semantic: 0 }
  }

  /**
   * Get metrics across all memory stores.
   */
  getMetrics(workspaceId: WorkspaceId): MemoryMetrics {
    const stmCount = this.stm.count(workspaceId)
    const ltmCount = this.ltm.count(workspaceId)
    const episodicCount = this.episodic.count(workspaceId)
    const semanticCount = this.semantic.count(workspaceId)
    const workingCount = this.working.count()
    const vectorCount = this.vector.count(workspaceId)

    const totalRecords = stmCount + ltmCount + episodicCount + semanticCount + workingCount + vectorCount

    return {
      totalRecords,
      recordsByKind: {
        stm: stmCount,
        ltm: ltmCount,
        episodic: episodicCount,
        semantic: semanticCount,
        working: workingCount,
        vector: vectorCount,
      },
      totalTokens: totalRecords * 100, // estimate
      avgTokensPerRecord: totalRecords > 0 ? 100 : 0,
    }
  }

  // ---------------------------------------------------------------------------
  // Policy Management
  // ---------------------------------------------------------------------------

  getPolicy(workspaceId: WorkspaceId): MemoryPolicy {
    return this.policies.get(workspaceId) ?? this.policy
  }

  setPolicy(policy: MemoryPolicy): void {
    this.policies.set(policy.workspaceId, policy)
  }
}
