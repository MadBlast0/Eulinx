/**
 * P09-MEM-STM / P09-MEM-WORKING — Short-Term & Working Memory
 *
 * TemporaryMemory-Part01: short-lived context for sessions, tasks, workers.
 * Expiry modes: worker_end, task_end, execution_end, session_end, ttl, manual.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type { StmRecord, ExpiryMode, WorkingMemoryRecord, MemoryPolicy } from "./memory-types"

// ---------------------------------------------------------------------------
// STM Store
// ---------------------------------------------------------------------------

export class ShortTermMemoryStore {
  private readonly records: Map<string, StmRecord> = new Map()
  private readonly policy: MemoryPolicy

  constructor(policy: MemoryPolicy) {
    this.policy = policy
  }

  /**
   * Write a short-term memory record.
   */
  write(params: {
    content: string
    scope: "session" | "task" | "worker" | "execution"
    workspaceId: WorkspaceId
    sessionId?: SessionId
    workerId?: WorkerId
    expiryMode: ExpiryMode
    ttlMs?: number
    tags?: readonly string[]
    sourceRef?: string
    sensitivity?: "public" | "internal" | "confidential" | "secret"
    metadata?: Record<string, unknown>
  }): StmRecord {
    const id = `stm_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const now = new Date().toISOString() as IsoTimestamp

    // Check capacity
    const existing = this.getForScope(params.workspaceId, params.workerId)
    if (existing.length >= this.policy.maxStmPerWorker) {
      // Evict oldest
      const sorted = [...existing].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      const oldest = sorted[0]
      if (oldest) this.records.delete(oldest.id)
    }

    const record: StmRecord = {
      id,
      kind: "stm",
      scope: params.scope,
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      workerId: params.workerId,
      content: params.content,
      sensitivity: params.sensitivity ?? "internal",
      tags: params.tags ?? [],
      tokenEstimate: Math.ceil(params.content.length / 4),
      createdAt: now,
      updatedAt: now,
      expiresAt: params.ttlMs
        ? new Date(Date.now() + params.ttlMs).toISOString() as IsoTimestamp
        : undefined,
      expiryMode: params.expiryMode,
      ttlMs: params.ttlMs,
      sourceRef: params.sourceRef,
      metadata: params.metadata ?? {},
    }

    this.records.set(id, record)
    return record
  }

  /**
   * Read a short-term memory record.
   */
  read(id: string): StmRecord | undefined {
    const record = this.records.get(id)
    if (!record) return undefined
    if (this.isExpired(record)) {
      this.records.delete(id)
      return undefined
    }
    return record
  }

  /**
   * Get all STM records for a scope.
   */
  getForScope(workspaceId: WorkspaceId, workerId?: WorkerId): readonly StmRecord[] {
    return [...this.records.values()].filter(r => {
      if (r.workspaceId !== workspaceId) return false
      if (workerId && r.workerId !== workerId) return false
      return !this.isExpired(r)
    })
  }

  /**
   * Clear STM by expiry mode.
   */
  clearByMode(mode: ExpiryMode, contextId?: string): number {
    let count = 0
    for (const [id, record] of this.records) {
      if (record.expiryMode === mode) {
        if (mode === "worker_end" && contextId && record.workerId !== contextId) continue
        if (mode === "task_end" && contextId && record.metadata.taskId !== contextId) continue
        if (mode === "session_end" && contextId && record.sessionId !== contextId) continue
        this.records.delete(id)
        count++
      }
    }
    return count
  }

  /**
   * Clear all expired records.
   */
  pruneExpired(): number {
    let count = 0
    for (const [id, record] of this.records) {
      if (this.isExpired(record)) {
        this.records.delete(id)
        count++
      }
    }
    return count
  }

  /**
   * Delete a specific record.
   */
  delete(id: string): boolean {
    return this.records.delete(id)
  }

  /**
   * Count records.
   */
  count(workspaceId?: WorkspaceId): number {
    if (workspaceId) {
      return [...this.records.values()].filter(r => r.workspaceId === workspaceId).length
    }
    return this.records.size
  }

  private isExpired(record: StmRecord): boolean {
    if (record.expiresAt) {
      return Date.now() > new Date(record.expiresAt).getTime()
    }
    return false
  }
}

// ---------------------------------------------------------------------------
// Working Memory Store
// ---------------------------------------------------------------------------

export class WorkingMemoryStore {
  private readonly slots: Map<string, WorkingMemoryRecord> = new Map()

  /**
   * Set a working memory slot.
   */
  set(params: {
    slot: string
    content: string
    workspaceId: WorkspaceId
    sessionId?: SessionId
    workerId?: WorkerId
    priority?: number
    tags?: readonly string[]
    sourceRef?: string
  }): WorkingMemoryRecord {
    const id = `wm_${params.slot}_${Date.now().toString(36).toUpperCase()}`
    const now = new Date().toISOString() as IsoTimestamp

    const record: WorkingMemoryRecord = {
      id,
      kind: "working",
      scope: "worker",
      workspaceId: params.workspaceId,
      sessionId: params.sessionId,
      workerId: params.workerId,
      content: params.content,
      sensitivity: "internal",
      tags: params.tags ?? [],
      tokenEstimate: Math.ceil(params.content.length / 4),
      createdAt: now,
      updatedAt: now,
      slot: params.slot,
      priority: params.priority ?? 0,
      sourceRef: params.sourceRef,
      metadata: {},
    }

    this.slots.set(params.slot, record)
    return record
  }

  /**
   * Get a working memory slot.
   */
  get(slot: string): WorkingMemoryRecord | undefined {
    return this.slots.get(slot)
  }

  /**
   * Get all working memory for a worker.
   */
  getForWorker(workerId: WorkerId): readonly WorkingMemoryRecord[] {
    return [...this.slots.values()].filter(r => r.workerId === workerId)
  }

  /**
   * Clear a working memory slot.
   */
  clear(slot: string): boolean {
    return this.slots.delete(slot)
  }

  /**
   * Clear all working memory for a worker.
   */
  clearWorker(workerId: WorkerId): number {
    let count = 0
    for (const [slot, record] of this.slots) {
      if (record.workerId === workerId) {
        this.slots.delete(slot)
        count++
      }
    }
    return count
  }

  /**
   * Get all slots.
   */
  getAll(): readonly WorkingMemoryRecord[] {
    return [...this.slots.values()]
  }

  /**
   * Count slots.
   */
  count(): number {
    return this.slots.size
  }
}
