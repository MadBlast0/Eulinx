/**
 * P08-WORKER-MANAGER â€” Worker Manager
 *
 * Manages the runtime pool of active Workers. Tracks state, metrics,
 * health, and provides query API for the Scheduler, Orchestrators, and UI.
 *
 * From Worker-Part01: responsibilities and object model.
 * From WorkerHierarchy-Part01: tree structure and invariants.
 * From WorkerMonitoring-Part01: health observation.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type { WorkerState, WorkerHealth } from "@/spawner/worker-state"
import type {
  WorkerBase,
  WorkerMetricsSummary,
  WorkerMonitoringHealth,
  WorkerCapabilities,
} from "./worker-types"
import type { WorkerLifecycleRecord } from "@/spawner/worker-lifecycle"

// ---------------------------------------------------------------------------
// Worker Manager Configuration
// ---------------------------------------------------------------------------

export interface WorkerManagerConfig {
  readonly maxActiveWorkers: number
  readonly maxWorkersPerWorkspace: number
  readonly maxWorkersPerSession: number
  readonly heartbeatTimeoutMs: number
  readonly stallDetectionMs: number
}

export const DEFAULT_WORKER_MANAGER_CONFIG: WorkerManagerConfig = {
  maxActiveWorkers: 64,
  maxWorkersPerWorkspace: 32,
  maxWorkersPerSession: 32,
  heartbeatTimeoutMs: 30_000,
  stallDetectionMs: 120_000,
}

// ---------------------------------------------------------------------------
// Worker Manager Events
// ---------------------------------------------------------------------------

export type WorkerManagerEventKind =
  | "worker.registered"
  | "worker.state_changed"
  | "worker.health_changed"
  | "worker.metrics_updated"
  | "worker.deregistered"
  | "worker.stall_detected"
  | "worker.heartbeat_received"

export interface WorkerManagerEvent {
  readonly kind: WorkerManagerEventKind
  readonly workerId: WorkerId
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly from?: string
  readonly to?: string
  readonly timestamp: IsoTimestamp
  readonly metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Worker Manager
// ---------------------------------------------------------------------------

export class WorkerManager {
  private readonly config: WorkerManagerConfig
  private readonly workers: Map<string, WorkerBase> = new Map()
  private readonly metrics: Map<string, WorkerMetricsSummary> = new Map()
  private readonly capabilities: Map<string, WorkerCapabilities> = new Map()
  private readonly events: WorkerManagerEvent[] = []
  private readonly eventHandlers: Array<(event: WorkerManagerEvent) => void> = []

  constructor(config: Partial<WorkerManagerConfig> = {}) {
    this.config = { ...DEFAULT_WORKER_MANAGER_CONFIG, ...config }
  }

  // ---------------------------------------------------------------------------
  // Registration (P08-WORKER-MANAGER)
  // ---------------------------------------------------------------------------

  /**
   * Register a new Worker from its lifecycle record.
   */
  registerWorker(
    record: WorkerLifecycleRecord,
    capabilities?: WorkerCapabilities,
  ): WorkerBase {
    if (this.workers.has(record.workerId)) {
      throw new Error(`Worker ${record.workerId} already registered`)
    }

    const activeCount = this.countActiveWorkers()
    if (activeCount >= this.config.maxActiveWorkers) {
      throw new Error(`Max active workers (${this.config.maxActiveWorkers}) reached`)
    }

    const workspaceCount = this.countWorkersInWorkspace(record.workspaceId)
    if (workspaceCount >= this.config.maxWorkersPerWorkspace) {
      throw new Error(`Max workers per workspace (${this.config.maxWorkersPerWorkspace}) reached`)
    }

    const worker: WorkerBase = {
      workerId: record.workerId as WorkerId,
      workspaceId: record.workspaceId as WorkspaceId,
      sessionId: record.sessionId as SessionId,
      projectId: "",
      roleId: "",
      displayName: record.workerId,
      state: record.state,
      health: record.health,
      parentWorkerId: record.parentWorkerId as WorkerId | undefined,
      depth: record.depth,
      lineage: record.lineage as WorkerId[],
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }

    this.workers.set(record.workerId, worker)
    this.metrics.set(record.workerId, {
      workerId: record.workerId as WorkerId,
      totalTokensUsed: 0,
      totalCostMicroUsd: 0,
      totalToolCalls: 0,
      totalWallClockMs: 0,
      totalArtifactsProduced: 0,
      errorCount: 0,
      retryCount: 0,
    })

    if (capabilities) {
      this.capabilities.set(record.workerId, capabilities)
    }

    this.emitEvent({
      kind: "worker.registered",
      workerId: record.workerId as WorkerId,
      workspaceId: record.workspaceId as WorkspaceId,
      sessionId: record.sessionId as SessionId,
      timestamp: this.now(),
    })

    return worker
  }

  /**
   * Register a worker from a WorkerBase directly.
   */
  registerWorkerBase(worker: WorkerBase): void {
    if (this.workers.has(worker.workerId)) {
      throw new Error(`Worker ${worker.workerId} already registered`)
    }
    this.workers.set(worker.workerId, worker)
    this.metrics.set(worker.workerId, {
      workerId: worker.workerId,
      totalTokensUsed: 0,
      totalCostMicroUsd: 0,
      totalToolCalls: 0,
      totalWallClockMs: 0,
      totalArtifactsProduced: 0,
      errorCount: 0,
      retryCount: 0,
    })
  }

  /**
   * Deregister a Worker.
   */
  deregisterWorker(workerId: WorkerId): boolean {
    const worker = this.workers.get(workerId)
    if (!worker) return false

    this.workers.delete(workerId)
    this.metrics.delete(workerId)
    this.capabilities.delete(workerId)

    this.emitEvent({
      kind: "worker.deregistered",
      workerId,
      workspaceId: worker.workspaceId,
      sessionId: worker.sessionId,
      timestamp: this.now(),
    })

    return true
  }

  // ---------------------------------------------------------------------------
  // State Transitions (P08-WORKER-LIFECYCLE)
  // ---------------------------------------------------------------------------

  /**
   * Update a Worker's state.
   */
  transitionWorker(
    workerId: WorkerId,
    newState: WorkerState,
    reason?: string,
  ): void {
    const worker = this.workers.get(workerId)
    if (!worker) throw new Error(`Worker ${workerId} not found`)

    const oldState = worker.state
    ;(worker as { state: WorkerState }).state = newState
    ;(worker as { updatedAt: IsoTimestamp }).updatedAt = this.now()

    this.emitEvent({
      kind: "worker.state_changed",
      workerId,
      workspaceId: worker.workspaceId,
      sessionId: worker.sessionId,
      from: oldState,
      to: newState,
      timestamp: this.now(),
      metadata: reason ? { reason } : undefined,
    })
  }

  // ---------------------------------------------------------------------------
  // Health (P08-WORKER-HEALTH)
  // ---------------------------------------------------------------------------

  /**
   * Update a Worker's health.
   */
  updateHealth(workerId: WorkerId, health: WorkerHealth): void {
    const worker = this.workers.get(workerId)
    if (!worker) throw new Error(`Worker ${workerId} not found`)

    const oldHealth = worker.health
    ;(worker as { health: WorkerHealth }).health = health
    ;(worker as { updatedAt: IsoTimestamp }).updatedAt = this.now()

    if (oldHealth !== health) {
      this.emitEvent({
        kind: "worker.health_changed",
        workerId,
        workspaceId: worker.workspaceId,
        sessionId: worker.sessionId,
        from: oldHealth,
        to: health,
        timestamp: this.now(),
      })
    }
  }

  /**
   * Record a heartbeat from a Worker.
   */
  recordHeartbeat(workerId: WorkerId): void {
    const worker = this.workers.get(workerId)
    if (!worker) return

    this.emitEvent({
      kind: "worker.heartbeat_received",
      workerId,
      workspaceId: worker.workspaceId,
      sessionId: worker.sessionId,
      timestamp: this.now(),
    })
  }

  /**
   * Detect stalled Workers.
   */
  detectStalledWorkers(): readonly WorkerId[] {
    const stalled: WorkerId[] = []
    const now = Date.now()

    for (const worker of this.workers.values()) {
      if (worker.state === "working" || worker.state === "waiting") {
        const updatedAt = new Date(worker.updatedAt).getTime()
        if (now - updatedAt > this.config.stallDetectionMs) {
          stalled.push(worker.workerId)
        }
      }
    }

    return stalled
  }

  // ---------------------------------------------------------------------------
  // Metrics (P08-WORKER-SCALING)
  // ---------------------------------------------------------------------------

  /**
   * Update metrics for a Worker.
   */
  updateMetrics(workerId: WorkerId, update: Partial<WorkerMetricsSummary>): void {
    const existing = this.metrics.get(workerId)
    if (!existing) return

    const updated: WorkerMetricsSummary = { ...existing, ...update }
    this.metrics.set(workerId, updated)

    this.emitEvent({
      kind: "worker.metrics_updated",
      workerId,
      workspaceId: existing.workerId as unknown as WorkspaceId,
      sessionId: "" as SessionId,
      timestamp: this.now(),
      metadata: update as Record<string, unknown>,
    })
  }

  /**
   * Get metrics for a Worker.
   */
  getMetrics(workerId: WorkerId): WorkerMetricsSummary | undefined {
    return this.metrics.get(workerId)
  }

  // ---------------------------------------------------------------------------
  // Capabilities (P08-WORKER-CAPS)
  // ---------------------------------------------------------------------------

  getCapabilities(workerId: WorkerId): WorkerCapabilities | undefined {
    return this.capabilities.get(workerId)
  }

  setCapabilities(workerId: WorkerId, caps: WorkerCapabilities): void {
    this.capabilities.set(workerId, caps)
  }

  // ---------------------------------------------------------------------------
  // Query API (P08-WORKER-REGISTRY)
  // ---------------------------------------------------------------------------

  getWorker(workerId: WorkerId): WorkerBase | undefined {
    return this.workers.get(workerId)
  }

  getWorkersInSession(sessionId: SessionId): readonly WorkerBase[] {
    return [...this.workers.values()].filter(w => w.sessionId === sessionId)
  }

  getWorkersInWorkspace(workspaceId: WorkspaceId): readonly WorkerBase[] {
    return [...this.workers.values()].filter(w => w.workspaceId === workspaceId)
  }

  getWorkersByState(state: WorkerState): readonly WorkerBase[] {
    return [...this.workers.values()].filter(w => w.state === state)
  }

  getWorkersByHealth(health: WorkerHealth): readonly WorkerBase[] {
    return [...this.workers.values()].filter(w => w.health === health)
  }

  getChildrenOf(parentWorkerId: WorkerId): readonly WorkerBase[] {
    return [...this.workers.values()].filter(w => w.parentWorkerId === parentWorkerId)
  }

  countActiveWorkers(): number {
    let count = 0
    for (const w of this.workers.values()) {
      if (w.state !== "terminated" && w.state !== "zombie") count++
    }
    return count
  }

  countWorkersInWorkspace(workspaceId: WorkspaceId): number {
    let count = 0
    for (const w of this.workers.values()) {
      if (w.workspaceId === workspaceId && w.state !== "terminated") count++
    }
    return count
  }

  countWorkersInSession(sessionId: SessionId): number {
    let count = 0
    for (const w of this.workers.values()) {
      if (w.sessionId === sessionId && w.state !== "terminated") count++
    }
    return count
  }

  getAllWorkers(): readonly WorkerBase[] {
    return [...this.workers.values()]
  }

  // ---------------------------------------------------------------------------
  // Event Subscription
  // ---------------------------------------------------------------------------

  onEvent(handler: (event: WorkerManagerEvent) => void): () => void {
    this.eventHandlers.push(handler)
    return () => {
      const idx = this.eventHandlers.indexOf(handler)
      if (idx >= 0) this.eventHandlers.splice(idx, 1)
    }
  }

  getEvents(): readonly WorkerManagerEvent[] {
    return [...this.events]
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private emitEvent(event: WorkerManagerEvent): void {
    this.events.push(event)
    for (const handler of this.eventHandlers) {
      try {
        handler(event)
      } catch {
        console.warn('eulinx: worker-manager : unexpected error in catch block')
        // Event handlers must not throw
      }
    }
  }

  private now(): IsoTimestamp {
    return new Date().toISOString() as IsoTimestamp
  }
}

