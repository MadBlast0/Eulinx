/**
 * P09-MEM-LTM / P09-MEM-EPISODIC / P09-MEM-SEMANTIC — Long-Term Memory
 *
 * LongTermMemory-Part01 through Part03: durable facts, promotion, review.
 * Episodic memory: event history with participants and outcomes.
 * Semantic memory: facts, definitions, relationships, rules.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type {
  LtmRecord,
  LtmCategory,
  EpisodicRecord,
  SemanticRecord,
  MemoryPolicy,
} from "./memory-types"

// ---------------------------------------------------------------------------
// LTM Store
// ---------------------------------------------------------------------------

export class LongTermMemoryStore {
  private readonly records: Map<string, LtmRecord> = new Map()
  private readonly policy: MemoryPolicy

  constructor(policy: MemoryPolicy) {
    this.policy = policy
  }

  /**
   * Promote a record to LTM.
   * LongTermMemory-Part01: "created through promotion from lower-scope memory or explicit user entry."
   */
  promote(params: {
    content: string
    workspaceId: WorkspaceId
    category: LtmCategory
    summary?: string
    sourceRef?: string
    promotedFrom?: string
    tags?: readonly string[]
    sensitivity?: "public" | "internal" | "confidential" | "secret"
    sessionId?: SessionId
    workerId?: WorkerId
    metadata?: Record<string, unknown>
  }): LtmRecord {
    // Check capacity
    const workspaceRecords = this.getForWorkspace(params.workspaceId)
    if (workspaceRecords.length >= this.policy.maxLtmPerWorkspace) {
      // Evict oldest approved
      const oldest = workspaceRecords
        .filter(r => r.reviewStatus === "approved")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0]
      if (oldest) this.records.delete(oldest.id)
    }

    const id = `ltm_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const now = new Date().toISOString() as IsoTimestamp

    const record: LtmRecord = {
      id,
      kind: "ltm",
      scope: "workspace",
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      workerId: params.workerId,
      content: params.content,
      summary: params.summary,
      sensitivity: params.sensitivity ?? "internal",
      tags: params.tags ?? [],
      tokenEstimate: Math.ceil(params.content.length / 4),
      createdAt: now,
      updatedAt: now,
      category: params.category,
      promotedFrom: params.promotedFrom,
      reviewStatus: this.policy.ltmReviewRequired ? "pending" : "approved",
      sourceRef: params.sourceRef,
      metadata: params.metadata ?? {},
    }

    this.records.set(id, record)
    return record
  }

  /**
   * Write an LTM record directly (user entry).
   */
  write(params: {
    content: string
    workspaceId: WorkspaceId
    category: LtmCategory
    summary?: string
    tags?: readonly string[]
    sensitivity?: "public" | "internal" | "confidential" | "secret"
    metadata?: Record<string, unknown>
  }): LtmRecord {
    return this.promote(params)
  }

  /**
   * Review an LTM record.
   */
  review(id: string, status: "approved" | "rejected"): void {
    const record = this.records.get(id)
    if (!record) throw new Error(`LTM record ${id} not found`)

    const now = new Date().toISOString() as IsoTimestamp
    const updated: LtmRecord = {
      ...record,
      reviewStatus: status,
      reviewedAt: now,
      updatedAt: now,
    }
    this.records.set(id, updated)
  }

  /**
   * Read an LTM record.
   */
  read(id: string): LtmRecord | undefined {
    return this.records.get(id)
  }

  /**
   * Get all LTM records for a workspace.
   */
  getForWorkspace(workspaceId: WorkspaceId): readonly LtmRecord[] {
    return [...this.records.values()].filter(r => r.workspaceId === workspaceId)
  }

  /**
   * Get LTM by category.
   */
  getByCategory(workspaceId: WorkspaceId, category: LtmCategory): readonly LtmRecord[] {
    return this.getForWorkspace(workspaceId).filter(r => r.category === category)
  }

  /**
   * Get approved LTM records only.
   */
  getApproved(workspaceId: WorkspaceId): readonly LtmRecord[] {
    return this.getForWorkspace(workspaceId).filter(r => r.reviewStatus === "approved")
  }

  /**
   * Delete an LTM record (forget).
   */
  delete(id: string): boolean {
    return this.records.delete(id)
  }

  /**
   * Forget records matching a predicate.
   */
  forget(predicate: (record: LtmRecord) => boolean): number {
    let count = 0
    for (const [id, record] of this.records) {
      if (predicate(record)) {
        this.records.delete(id)
        count++
      }
    }
    return count
  }

  /**
   * Count records.
   */
  count(workspaceId?: WorkspaceId): number {
    if (workspaceId) return this.getForWorkspace(workspaceId).length
    return this.records.size
  }
}

// ---------------------------------------------------------------------------
// Episodic Memory Store
// ---------------------------------------------------------------------------

export class EpisodicMemoryStore {
  private readonly records: Map<string, EpisodicRecord> = new Map()

  /**
   * Record an episode (event).
   */
  record(params: {
    content: string
    workspaceId: WorkspaceId
    eventType: string
    eventTimestamp: IsoTimestamp
    participant: string
    outcome?: string
    sessionId?: SessionId
    workerId?: WorkerId
    tags?: readonly string[]
    sourceRef?: string
    metadata?: Record<string, unknown>
  }): EpisodicRecord {
    const id = `ep_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const now = new Date().toISOString() as IsoTimestamp

    const record: EpisodicRecord = {
      id,
      kind: "episodic",
      scope: "session",
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      workerId: params.workerId,
      content: params.content,
      sensitivity: "internal",
      tags: params.tags ?? [],
      tokenEstimate: Math.ceil(params.content.length / 4),
      createdAt: now,
      updatedAt: now,
      eventType: params.eventType,
      eventTimestamp: params.eventTimestamp,
      participant: params.participant,
      outcome: params.outcome,
      sourceRef: params.sourceRef,
      metadata: params.metadata ?? {},
    }

    this.records.set(id, record)
    return record
  }

  /**
   * Get episodes for a session.
   */
  getForSession(sessionId: SessionId): readonly EpisodicRecord[] {
    return [...this.records.values()].filter(r => r.sessionId === sessionId)
  }

  /**
   * Get episodes for a workspace.
   */
  getForWorkspace(workspaceId: WorkspaceId): readonly EpisodicRecord[] {
    return [...this.records.values()].filter(r => r.workspaceId === workspaceId)
  }

  /**
   * Delete an episode.
   */
  delete(id: string): boolean {
    return this.records.delete(id)
  }

  count(workspaceId?: WorkspaceId): number {
    if (workspaceId) return this.getForWorkspace(workspaceId).length
    return this.records.size
  }
}

// ---------------------------------------------------------------------------
// Semantic Memory Store
// ---------------------------------------------------------------------------

export class SemanticMemoryStore {
  private readonly records: Map<string, SemanticRecord> = new Map()

  /**
   * Store a semantic fact.
   */
  store(params: {
    content: string
    workspaceId: WorkspaceId
    factType: "definition" | "relationship" | "rule" | "procedure"
    confidence?: number
    sourceIds?: readonly string[]
    tags?: readonly string[]
    sourceRef?: string
    metadata?: Record<string, unknown>
  }): SemanticRecord {
    const id = `sem_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const now = new Date().toISOString() as IsoTimestamp

    const record: SemanticRecord = {
      id,
      kind: "semantic",
      scope: "workspace",
      workspaceId: params.workspaceId,
      content: params.content,
      sensitivity: "internal",
      tags: params.tags ?? [],
      tokenEstimate: Math.ceil(params.content.length / 4),
      createdAt: now,
      updatedAt: now,
      factType: params.factType,
      confidence: params.confidence ?? 1.0,
      sourceIds: params.sourceIds ?? [],
      sourceRef: params.sourceRef,
      metadata: params.metadata ?? {},
    }

    this.records.set(id, record)
    return record
  }

  /**
   * Get semantic facts for a workspace.
   */
  getForWorkspace(workspaceId: WorkspaceId): readonly SemanticRecord[] {
    return [...this.records.values()].filter(r => r.workspaceId === workspaceId)
  }

  /**
   * Get by fact type.
   */
  getByType(workspaceId: WorkspaceId, factType: SemanticRecord["factType"]): readonly SemanticRecord[] {
    return this.getForWorkspace(workspaceId).filter(r => r.factType === factType)
  }

  /**
   * Delete a semantic record.
   */
  delete(id: string): boolean {
    return this.records.delete(id)
  }

  count(workspaceId?: WorkspaceId): number {
    if (workspaceId) return this.getForWorkspace(workspaceId).length
    return this.records.size
  }
}
