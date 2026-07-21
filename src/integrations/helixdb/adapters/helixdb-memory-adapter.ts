/**
 * HelixDB Memory Adapter — Unified adapter replacing all 6 in-memory stores
 *
 * Backs STM, LTM, Episodic, Semantic, Working, and Vector memory stores
 * with HelixDB Memory nodes. Provides write, read, delete, count, list,
 * hybrid search (vector + text), and policy enforcement (capacity, sensitivity, TTL).
 *
 * T12.2 — Class structure
 * T12.3 — Write
 * T12.4 — CRUD
 * T12.5 — Search (hybrid vector + text)
 * T12.6 — Policy enforcement (capacity, sensitivity, TTL)
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import type { CoreError } from "@/core/error"
import type { HelixDBClient, TenantScopedClient } from "../helixdb-client"
import type {
  MemoryRecord,
  StmRecord,
  LtmRecord,
  EpisodicRecord,
  SemanticRecord,
  WorkingMemoryRecord,
  MemoryKind,
  MemoryScope,
  SensitivityLevel,
  ExpiryMode,
  LtmCategory,
  MemorySearchQuery,
  MemorySearchResult,
  MemoryPolicy,
} from "@/memory/memory-types"
import { LABEL_MEMORY, EDGE_RELATES_TO } from "../helixdb-types"
import { EmbeddingService } from "@/memory/embedding-service"

// ---------------------------------------------------------------------------
// Sensitivity ordering (public < internal < confidential < secret)
// ---------------------------------------------------------------------------

const SENSITIVITY_ORDER: Record<SensitivityLevel, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  secret: 3,
}

// ---------------------------------------------------------------------------
// Write params (T12.3)
// ---------------------------------------------------------------------------

export interface WriteMemoryParams {
  readonly content: string
  readonly scope: MemoryScope
  readonly sessionId?: SessionId
  readonly workerId?: WorkerId
  readonly sensitivity?: SensitivityLevel
  readonly tags?: readonly string[]
  readonly sourceRef?: string
  readonly summary?: string
  readonly metadata?: Record<string, unknown>
  // STM-specific
  readonly expiryMode?: ExpiryMode
  readonly ttlMs?: number
  // LTM-specific
  readonly category?: LtmCategory
  readonly reviewStatus?: "pending" | "approved" | "rejected"
  readonly promotedFrom?: string
  // Episodic-specific
  readonly eventType?: string
  readonly eventTimestamp?: IsoTimestamp
  readonly participant?: string
  readonly outcome?: string
  // Semantic-specific
  readonly factType?: "definition" | "relationship" | "rule" | "procedure"
  readonly confidence?: number
  readonly sourceIds?: readonly string[]
  // Working-specific
  readonly slot?: string
  readonly priority?: number
}

// ---------------------------------------------------------------------------
// HelixDB Memory Adapter (T12.2)
// ---------------------------------------------------------------------------

export class HelixDBMemoryAdapter {
  private readonly client: HelixDBClient | TenantScopedClient
  private readonly embeddingService: EmbeddingService
  private readonly workspaceId: WorkspaceId
  private readonly policy: MemoryPolicy

  constructor(
    client: HelixDBClient | TenantScopedClient,
    workspaceId: WorkspaceId,
    embeddingService: EmbeddingService,
    policy?: MemoryPolicy,
  ) {
    this.client = client
    this.workspaceId = workspaceId
    this.embeddingService = embeddingService
    this.policy = policy ?? {
      policyId: "default",
      workspaceId: "" as WorkspaceId,
      maxStmPerWorker: 100,
      maxLtmPerWorkspace: 500,
      stmTtlMs: 30 * 60 * 1000,
      ltmReviewRequired: true,
      autoRedactSecrets: true,
      retentionDays: 90,
      maxTokensPerQuery: 4000,
    }
  }

  // =========================================================================
  // T12.3 — Write
  // =========================================================================

  /**
   * Write a memory record to HelixDB.
   * Computes embedding, creates a Memory node, and optionally creates
   * RELATES_TO edges to similar existing memories.
   */
  async write(
    kind: MemoryKind,
    params: WriteMemoryParams,
    workspaceId?: WorkspaceId,
  ): Promise<Result<MemoryRecord, CoreError>> {
    const ws = workspaceId ?? this.workspaceId
    const id = this.generateId(kind)
    const now = new Date().toISOString() as IsoTimestamp

    // Compute embedding
    const embedding = await this.embeddingService.embed(params.content)

    // Build node properties
    const nodeProps: Record<string, unknown> = {
      id,
      workspaceId: ws,
      kind,
      scope: params.scope,
      content: params.content,
      summary: params.summary,
      sessionId: params.sessionId,
      workerId: params.workerId,
      sourceRef: params.sourceRef,
      sensitivity: params.sensitivity ?? "internal",
      tags: params.tags ?? [],
      tokenEstimate: Math.ceil(params.content.length / 4),
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata ?? {},
      embedding: embedding.vector,
    }

    // Kind-specific properties
    if (kind === "stm") {
      nodeProps.expiryMode = params.expiryMode ?? "worker_end"
      nodeProps.ttlMs = params.ttlMs ?? this.policy.stmTtlMs
      nodeProps.expiresAt = nodeProps.ttlMs
        ? new Date(Date.now() + (nodeProps.ttlMs as number)).toISOString()
        : undefined
    } else if (kind === "ltm") {
      nodeProps.category = params.category ?? "fact"
      nodeProps.reviewStatus = params.reviewStatus ??
        (this.policy.ltmReviewRequired ? "pending" : "approved")
      nodeProps.promotedFrom = params.promotedFrom
    } else if (kind === "episodic") {
      nodeProps.eventType = params.eventType ?? ""
      nodeProps.eventTimestamp = params.eventTimestamp ?? now
      nodeProps.参与者 = params.participant ?? ""
      nodeProps.outcome = params.outcome
    } else if (kind === "semantic") {
      nodeProps.factType = params.factType ?? "definition"
      nodeProps.confidence = params.confidence ?? 1.0
      nodeProps.sourceIds = params.sourceIds ?? []
    } else if (kind === "working") {
      nodeProps.slot = params.slot ?? ""
      nodeProps.priority = params.priority ?? 0
    }

    // Write to HelixDB
    const result = await this.client.query({
      query: `addN("${LABEL_MEMORY}", $props)`,
      params: { props: nodeProps },
    })

    if (!result.ok) {
      return err(result.error)
    }

    // Enforce capacity after write
    await this.enforceCapacity(kind, ws, params.workerId)

    // Attempt to create RELATES_TO edges to similar memories
    await this.linkRelatedMemories(id, params.content, ws)

    // Build and return the record
    const record = this.buildRecord(kind, params, id, now, ws)
    return ok(record)
  }

  // =========================================================================
  // T12.4 — CRUD
  // =========================================================================

  /**
   * Read a memory record by ID. Returns null if not found or expired.
   */
  async read(id: string): Promise<Result<MemoryRecord | null, CoreError>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", eq("id", "${id}")).valueMap()`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    const rows = result.value.results
    if (rows.length === 0) {
      return ok(null)
    }

    const row = rows[0]
    if (!row) {
      return ok(null)
    }

    // Check TTL expiry for STM records
    const expired = await this.checkTTL(row as Record<string, unknown>)
    if (expired) {
      // Delete expired record
      await this.client.query({
        query: `nWithLabelWhere("${LABEL_MEMORY}", eq("id", "${id}")).drop()`,
      })
      return ok(null)
    }

    const record = this.hydrateRecord(row as Record<string, unknown>)
    return ok(record)
  }

  /**
   * Delete a memory record by ID. Returns true if deleted, false if not found.
   */
  async delete(id: string): Promise<Result<boolean, CoreError>> {
    // Check existence first
    const readResult = await this.read(id)
    if (!readResult.ok) {
      return err(readResult.error)
    }

    if (readResult.value === null) {
      return ok(false)
    }

    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", eq("id", "${id}")).drop()`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    return ok(true)
  }

  /**
   * Count all memory records in a workspace.
   */
  async count(workspaceId: WorkspaceId): Promise<Result<number, CoreError>> {
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", eq("workspaceId", "${workspaceId}")).count()`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    const row = result.value.results[0]
    return ok((row?.count as number) ?? 0)
  }

  /**
   * List memory records by kind, ordered by createdAt descending.
   */
  async listByKind(
    kind: MemoryKind,
    limit?: number,
    workspaceId?: WorkspaceId,
  ): Promise<Result<readonly MemoryRecord[], CoreError>> {
    const ws = workspaceId ?? this.workspaceId
    const limitClause = limit ? `.limit(${limit})` : ""
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", and(eq("workspaceId", "${ws}"), eq("kind", "${kind}"))).orderByDesc("createdAt")${limitClause}.valueMap()`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    const records = result.value.results.map((row) =>
      this.hydrateRecord(row as Record<string, unknown>),
    )
    return ok(records)
  }

  /**
   * List memory records by session, ordered by createdAt descending.
   */
  async listBySession(
    sessionId: SessionId,
    limit?: number,
    workspaceId?: WorkspaceId,
  ): Promise<Result<readonly MemoryRecord[], CoreError>> {
    const ws = workspaceId ?? this.workspaceId
    const limitClause = limit ? `.limit(${limit})` : ""
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", and(eq("workspaceId", "${ws}"), eq("sessionId", "${sessionId}"))).orderByDesc("createdAt")${limitClause}.valueMap()`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    const records = result.value.results.map((row) =>
      this.hydrateRecord(row as Record<string, unknown>),
    )
    return ok(records)
  }

  // =========================================================================
  // T12.5 — Search (hybrid vector + text)
  // =========================================================================

  /**
   * Hybrid search combining vector similarity and BM25 text matching.
   * Results are merged, deduplicated, and ranked by a blended score:
   *   0.7 * vector_score + 0.3 * text_score
   */
  async search(
    query: MemorySearchQuery,
  ): Promise<Result<readonly MemorySearchResult[], CoreError>> {
    const maxResults = query.maxResults ?? 10
    const fetchCount = maxResults * 2

    // Compute query embedding
    const embedding = await this.embeddingService.embed(query.text)

    // Run vector search and text search in parallel via batch
    const vectorQuery = `vectorSearchNodes("${LABEL_MEMORY}", "embedding", $queryVec, ${fetchCount}, "${query.workspaceId}")`
    const textQuery = `textSearchNodes("${LABEL_MEMORY}", "content", ${this.escapeString(query.text)}, ${fetchCount}, "${query.workspaceId}")`

    const batchResult = await this.client.batch([
      { query: vectorQuery, params: { queryVec: embedding.vector } },
      { query: textQuery },
    ])

    if (!batchResult.ok) {
      return err(batchResult.error)
    }

    const vectorHits = batchResult.value.results[0]?.results ?? []
    const textHits = batchResult.value.results[1]?.results ?? []

    // Merge results with blended scoring
    const merged = new Map<
      string,
      { record: MemoryRecord; vectorScore: number; textScore: number; matchType: "semantic" | "keyword" | "exact" }
    >()

    // Process vector hits (semantic score = 1 - distance)
    for (const hit of vectorHits) {
      const record = this.hydrateRecord(hit as Record<string, unknown>)
      if (!this.passesFilters(record, query)) continue

      const vectorScore = typeof hit.$distance === "number" ? 1 - (hit.$distance as number) : 0.5
      merged.set(record.id, {
        record,
        vectorScore,
        textScore: 0,
        matchType: "semantic",
      })
    }

    // Process text hits (text score = 1 - distance)
    for (const hit of textHits) {
      const record = this.hydrateRecord(hit as Record<string, unknown>)
      if (!this.passesFilters(record, query)) continue

      const textScore = typeof hit.$distance === "number" ? 1 - (hit.$distance as number) : 0.5
      const existing = merged.get(record.id)

      if (existing) {
        // Record found in both — update text score and mark as exact match
        existing.textScore = textScore
        existing.matchType = "exact"
      } else {
        merged.set(record.id, {
          record,
          vectorScore: 0,
          textScore,
          matchType: "keyword",
        })
      }
    }

    // Compute blended scores and sort
    const results: MemorySearchResult[] = [...merged.values()]
      .map((entry) => {
        const blendedScore = entry.vectorScore * 0.7 + entry.textScore * 0.3
        return {
          record: entry.record,
          score: blendedScore,
          matchType: entry.matchType,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)

    // Apply sensitivity filtering
    const filtered = this.filterBySensitivity(results.map((r) => r.record), "internal")
    const filteredIds = new Set(filtered.map((r) => r.id))

    return ok(results.filter((r) => filteredIds.has(r.record.id)))
  }

  // =========================================================================
  // T12.6 — Policy Enforcement
  // =========================================================================

  /**
   * Enforce capacity limits for a given memory kind.
   * Prunes oldest records when over the configured limit.
   */
  private async enforceCapacity(
    kind: MemoryKind,
    workspaceId: WorkspaceId,
    workerId?: WorkerId,
  ): Promise<void> {
    if (kind === "stm") {
      await this.enforceStmCapacity(workspaceId, workerId)
    } else if (kind === "ltm") {
      await this.enforceLtmCapacity(workspaceId)
    }
  }

  /**
   * Enforce STM capacity: prune oldest STM records when count exceeds maxStmPerWorker.
   */
  private async enforceStmCapacity(
    workspaceId: WorkspaceId,
    workerId?: WorkerId,
  ): Promise<void> {
    const workerFilter = workerId
      ? `.where(eq("workerId", "${workerId}"))`
      : ""

    const countResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", and(eq("workspaceId", "${workspaceId}"), eq("kind", "stm")))${workerFilter}.count()`,
    })

    if (!countResult.ok) return

    const count = (countResult.value.results[0]?.count as number) ?? 0
    if (count <= this.policy.maxStmPerWorker) return

    const excess = count - this.policy.maxStmPerWorker
    // Best-effort pruning — don't fail the write if pruning fails
    await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", and(eq("workspaceId", "${workspaceId}"), eq("kind", "stm")))${workerFilter}.orderBy("createdAt").limit(${excess}).drop()`,
    })
  }

  /**
   * Enforce LTM capacity: prune oldest approved LTM records when over maxLtmPerWorkspace.
   */
  private async enforceLtmCapacity(workspaceId: WorkspaceId): Promise<void> {
    const countResult = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", and(eq("workspaceId", "${workspaceId}"), eq("kind", "ltm"))).count()`,
    })

    if (!countResult.ok) return

    const count = (countResult.value.results[0]?.count as number) ?? 0
    if (count <= this.policy.maxLtmPerWorkspace) return

    const excess = count - this.policy.maxLtmPerWorkspace
    await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", and(eq("workspaceId", "${workspaceId}"), and(eq("kind", "ltm"), eq("reviewStatus", "approved")))).orderBy("createdAt").limit(${excess}).drop()`,
    })
  }

  /**
   * Filter records by maximum sensitivity level.
   * Records with sensitivity > maxSensitivity are excluded.
   */
  filterBySensitivity(
    records: readonly MemoryRecord[],
    maxSensitivity: SensitivityLevel,
  ): readonly MemoryRecord[] {
    const maxLevel = SENSITIVITY_ORDER[maxSensitivity]
    return records.filter((r) => {
      const recordLevel = SENSITIVITY_ORDER[r.sensitivity] ?? 1
      return recordLevel <= maxLevel
    })
  }

  /**
   * Check if a memory record has expired based on TTL.
   * Returns true if the record is expired and should be removed.
   */
  async checkTTL(record: Record<string, unknown>): Promise<boolean> {
    const kind = record.kind as MemoryKind

    // Only STM records have TTL-based expiry
    if (kind !== "stm") return false

    const expiresAt = record.expiresAt as string | undefined
    if (!expiresAt) return false

    return Date.now() > new Date(expiresAt).getTime()
  }

  /**
   * Prune all expired STM records in the workspace.
   */
  async pruneExpired(workspaceId?: WorkspaceId): Promise<Result<number, CoreError>> {
    const ws = workspaceId ?? this.workspaceId
    const now = new Date().toISOString()

    // Find expired STM records
    const result = await this.client.query({
      query: `nWithLabelWhere("${LABEL_MEMORY}", and(eq("workspaceId", "${ws}"), and(eq("kind", "stm"), and(isNotNull("expiresAt"), lt("expiresAt", "${now}"))))).valueMap(["id"])`,
    })

    if (!result.ok) {
      return err(result.error)
    }

    const expiredIds = result.value.results
      .map((r) => r.id as string)
      .filter((id): id is string => typeof id === "string")

    if (expiredIds.length === 0) {
      return ok(0)
    }

    // Delete expired records
    for (const id of expiredIds) {
      await this.client.query({
        query: `nWithLabelWhere("${LABEL_MEMORY}", eq("id", "${id}")).drop()`,
      })
    }

    return ok(expiredIds.length)
  }

  // =========================================================================
  // Private Helpers
  // =========================================================================

  /**
   * Generate a unique ID for a memory record.
   */
  private generateId(kind: MemoryKind): string {
    const prefix =
      kind === "stm" ? "stm"
      : kind === "ltm" ? "ltm"
      : kind === "episodic" ? "ep"
      : kind === "semantic" ? "sem"
      : kind === "working" ? "wm"
      : "mem"
    const ts = Date.now().toString(36).toUpperCase()
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
    return `${prefix}_${ts}_${rand}`
  }

  /**
   * Escape a string for safe inclusion in HelixDB query strings.
   */
  private escapeString(s: string): string {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  }

  /**
   * Build a MemoryRecord from write params.
   */
  private buildRecord(
    kind: MemoryKind,
    params: WriteMemoryParams,
    id: string,
    now: IsoTimestamp,
    workspaceId: WorkspaceId,
  ): MemoryRecord {
    const sensitivity = (params.sensitivity ?? "internal") as SensitivityLevel
    const tags = params.tags ?? []
    const tokenEstimate = Math.ceil(params.content.length / 4)
    const metadata = params.metadata ?? {}

    if (kind === "stm") {
      const ttlMs = params.ttlMs ?? this.policy.stmTtlMs
      const record: StmRecord = {
        id,
        kind: "stm",
        scope: params.scope,
        workspaceId,
        sessionId: params.sessionId,
        workerId: params.workerId,
        content: params.content,
        summary: params.summary,
        sourceRef: params.sourceRef,
        sensitivity,
        tags,
        tokenEstimate,
        createdAt: now,
        updatedAt: now,
        metadata,
        expiryMode: (params.expiryMode ?? "worker_end") as ExpiryMode,
        ttlMs,
        expiresAt: ttlMs
          ? (new Date(Date.now() + ttlMs).toISOString() as IsoTimestamp)
          : undefined,
      }
      return record
    }

    if (kind === "ltm") {
      const record: LtmRecord = {
        id,
        kind: "ltm",
        scope: "workspace",
        workspaceId,
        sessionId: params.sessionId,
        workerId: params.workerId,
        content: params.content,
        summary: params.summary,
        sourceRef: params.sourceRef,
        sensitivity,
        tags,
        tokenEstimate,
        createdAt: now,
        updatedAt: now,
        metadata,
        category: (params.category ?? "fact") as LtmCategory,
        reviewStatus: params.reviewStatus ??
          (this.policy.ltmReviewRequired ? "pending" : "approved"),
        promotedFrom: params.promotedFrom,
      }
      return record
    }

    if (kind === "episodic") {
      const record: EpisodicRecord = {
        id,
        kind: "episodic",
        scope: "session",
        workspaceId,
        sessionId: params.sessionId,
        workerId: params.workerId,
        content: params.content,
        summary: params.summary,
        sourceRef: params.sourceRef,
        sensitivity,
        tags,
        tokenEstimate,
        createdAt: now,
        updatedAt: now,
        metadata,
        eventType: params.eventType ?? "",
        eventTimestamp: params.eventTimestamp ?? now,
        participant: params.participant ?? "",
        outcome: params.outcome,
      }
      return record
    }

    if (kind === "semantic") {
      const record: SemanticRecord = {
        id,
        kind: "semantic",
        scope: "workspace",
        workspaceId,
        sessionId: params.sessionId,
        workerId: params.workerId,
        content: params.content,
        summary: params.summary,
        sourceRef: params.sourceRef,
        sensitivity,
        tags,
        tokenEstimate,
        createdAt: now,
        updatedAt: now,
        metadata,
        factType: (params.factType ?? "definition") as SemanticRecord["factType"],
        confidence: params.confidence ?? 1.0,
        sourceIds: params.sourceIds ?? [],
      }
      return record
    }

    if (kind === "working") {
      const record: WorkingMemoryRecord = {
        id,
        kind: "working",
        scope: "worker",
        workspaceId,
        sessionId: params.sessionId,
        workerId: params.workerId,
        content: params.content,
        summary: params.summary,
        sourceRef: params.sourceRef,
        sensitivity,
        tags,
        tokenEstimate,
        createdAt: now,
        updatedAt: now,
        metadata,
        slot: params.slot ?? "",
        priority: params.priority ?? 0,
      }
      return record
    }

    // Fallback for "vector" kind — store as base MemoryRecord
    return {
      id,
      kind,
      scope: params.scope,
      workspaceId,
      sessionId: params.sessionId,
      workerId: params.workerId,
      content: params.content,
      summary: params.summary,
      sourceRef: params.sourceRef,
      sensitivity,
      tags,
      tokenEstimate,
      createdAt: now,
      updatedAt: now,
      metadata,
    }
  }

  /**
   * Hydrate a raw HelixDB row into a typed MemoryRecord.
   */
  private hydrateRecord(row: Record<string, unknown>): MemoryRecord {
    const kind = row.kind as MemoryKind
    const sensitivity = (row.sensitivity as SensitivityLevel) ?? "internal"

    const base = {
      id: row.id as string,
      kind,
      scope: (row.scope as MemoryScope) ?? "workspace",
      workspaceId: row.workspaceId as WorkspaceId,
      sessionId: row.sessionId as SessionId | undefined,
      workerId: row.workerId as WorkerId | undefined,
      content: row.content as string,
      summary: row.summary as string | undefined,
      sourceRef: row.sourceRef as string | undefined,
      sensitivity,
      tags: (row.tags as readonly string[]) ?? [],
      tokenEstimate:
        (row.tokenEstimate as number) ??
        Math.ceil(((row.content as string) ?? "").length / 4),
      createdAt: row.createdAt as IsoTimestamp,
      updatedAt: row.updatedAt as IsoTimestamp,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }

    if (kind === "stm") {
      const record: StmRecord = {
        ...base,
        kind: "stm",
        expiryMode: (row.expiryMode as ExpiryMode) ?? "worker_end",
        ttlMs: row.ttlMs as number | undefined,
        expiresAt: row.expiresAt as IsoTimestamp | undefined,
      }
      return record
    }

    if (kind === "ltm") {
      const record: LtmRecord = {
        ...base,
        kind: "ltm",
        category: (row.category as LtmCategory) ?? "fact",
        reviewStatus:
          (row.reviewStatus as "pending" | "approved" | "rejected") ?? "pending",
        reviewedAt: row.reviewedAt as IsoTimestamp | undefined,
        promotedFrom: row.promotedFrom as string | undefined,
      }
      return record
    }

    if (kind === "episodic") {
      const record: EpisodicRecord = {
        ...base,
        kind: "episodic",
        eventType: (row.eventType as string) ?? "",
        eventTimestamp: (row.eventTimestamp as IsoTimestamp) ?? base.createdAt,
        participant:
          (row.participant as string) ?? "",
        outcome: row.outcome as string | undefined,
      }
      return record
    }

    if (kind === "semantic") {
      const record: SemanticRecord = {
        ...base,
        kind: "semantic",
        factType:
          (row.factType as SemanticRecord["factType"]) ?? "definition",
        confidence: (row.confidence as number) ?? 1.0,
        sourceIds: (row.sourceIds as readonly string[]) ?? [],
      }
      return record
    }

    if (kind === "working") {
      const record: WorkingMemoryRecord = {
        ...base,
        kind: "working",
        scope: "worker",
        slot: (row.slot as string) ?? "",
        priority: (row.priority as number) ?? 0,
      }
      return record
    }

    return base as MemoryRecord
  }

  /**
   * Check if a record passes the search query filters.
   */
  private passesFilters(
    record: MemoryRecord,
    query: MemorySearchQuery,
  ): boolean {
    if (record.workspaceId !== query.workspaceId) return false

    if (query.kinds && query.kinds.length > 0) {
      if (!query.kinds.includes(record.kind)) return false
    }

    if (query.sessionId) {
      if (record.sessionId && record.sessionId !== query.sessionId) return false
    }

    if (query.workerId) {
      if (record.workerId && record.workerId !== query.workerId) return false
    }

    return true
  }

  /**
   * Link a newly written memory to semantically similar existing memories
   * via RELATES_TO edges. Best-effort — failures are silently ignored.
   */
  private async linkRelatedMemories(
    sourceId: string,
    content: string,
    workspaceId: WorkspaceId,
  ): Promise<void> {
    try {
      const embedding = await this.embeddingService.embed(content)

      // Find top-3 similar memories via vector search
      const result = await this.client.query({
        query: `vectorSearchNodes("${LABEL_MEMORY}", "embedding", $queryVec, 3, "${workspaceId}")`,
        params: { queryVec: embedding.vector },
      })

      if (!result.ok) return

      const hits = result.value.results.filter(
        (hit) => (hit as Record<string, unknown>).id !== sourceId,
      )

      // Create RELATES_TO edges for similar memories
      for (const hit of hits) {
        const targetId = (hit as Record<string, unknown>).id as string
        const distance = (hit as Record<string, unknown>).$distance as number
        const strength = typeof distance === "number" ? 1 - distance : 0.5

        await this.client.query({
          query: `nWithLabelWhere("${LABEL_MEMORY}", eq("id", "${sourceId}")).addE("${EDGE_RELATES_TO}", nWithLabelWhere("${LABEL_MEMORY}", eq("id", "${targetId}")), $props)`,
          params: { props: { strength, relation: "semantic_similarity" } },
        })
      }
    } catch {
      // Best-effort linking — don't fail the write
    }
  }
}
