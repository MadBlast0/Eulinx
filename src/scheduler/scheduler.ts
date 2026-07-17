/**
 * P05-SCHEDULER — Main Scheduler Service
 *
 * The central traffic controller of Eulinx. Decides WHEN work executes.
 * Does not execute work itself — selects, orders, checks readiness, and
 * hands runnable units to the ExecutionEngine or other runtime services.
 * (Scheduler-Part01 §Purpose, Part08 §Public API)
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { CoreError } from "@/core/error"
import type {
  SchedulingUnit,
  SchedulingState,
  SchedulerQueueSnapshot,
} from "./scheduler-types"
import { JobQueue } from "./queue"
import {
  partitionByReadiness,
  createDefaultReadinessContext,
} from "./readiness"
import type { ReadinessContext } from "./readiness"
import { RetryQueue } from "./retries"
import { DeadQueue } from "./dead-queue"
import { ConcurrencyLimiter } from "./concurrency"
import { BudgetPool } from "./budgets"
import type { BudgetPoolConfig } from "./budgets"
import { SchedulerEventEmitter } from "./scheduler-events"
import type { SchedulerUnitBlockedPayload } from "./scheduler-events"
import { MetricsCollector } from "./metrics"
import type { QueueKind } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Scheduler Configuration
// ---------------------------------------------------------------------------

export interface SchedulerConfig {
  /** Maximum concurrent running units. */
  readonly maxConcurrency: number
  /** Budget pool configuration. */
  readonly budget: BudgetPoolConfig
  /** Enable priority aging for fairness. */
  readonly enableAging: boolean
  /** Aging interval in milliseconds. */
  readonly agingIntervalMs: number
}

export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrency: 8,
  budget: {
    maxCostMicroUsd: Infinity,
    maxWorkers: 8,
    maxToolInvocations: 16,
    maxFileWrites: 32,
    maxTokens: Infinity,
    maxRuntimeMs: Infinity,
  },
  enableAging: true,
  agingIntervalMs: 30_000,
}

// ---------------------------------------------------------------------------
// Scheduler State
// ---------------------------------------------------------------------------

export type SchedulerLifecycleState = "idle" | "running" | "paused" | "stopped"

// ---------------------------------------------------------------------------
// Scheduler Service
// ---------------------------------------------------------------------------

export class Scheduler {
  private readonly config: SchedulerConfig
  private lifecycleState: SchedulerLifecycleState = "idle"

  // Queues
  private readonly incoming = new JobQueue()
  private readonly dependencyWait = new JobQueue()
  private readonly permissionWait = new JobQueue()
  private readonly approvalWait = new JobQueue()
  private readonly lockWait = new JobQueue()
  private readonly budgetWait = new JobQueue()
  private readonly runnable = new JobQueue()
  private readonly cancelled = new JobQueue()
  private readonly completed = new JobQueue()
  private readonly failed = new JobQueue()

  // Subsystems
  private readonly retryQueue: RetryQueue
  private readonly deadQueue: DeadQueue
  private readonly concurrency: ConcurrencyLimiter
  private readonly budgetPool: BudgetPool
  readonly events: SchedulerEventEmitter
  readonly metrics: MetricsCollector

  // Unit tracking
  private readonly allUnits = new Map<string, SchedulingUnit>()
  private readonly runningUnits = new Map<string, SchedulingUnit>()
  private readonly unitCreatedTimes = new Map<string, number>()
  private readonly unitScheduledTimes = new Map<string, number>()

  // Readiness context provider (injected by runtime)
  private readinessContextProvider: () => ReadinessContext = createDefaultReadinessContext

  constructor(config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG) {
    this.config = config
    this.retryQueue = new RetryQueue()
    this.deadQueue = new DeadQueue()
    this.concurrency = new ConcurrencyLimiter({ maxConcurrent: config.maxConcurrency })
    this.budgetPool = new BudgetPool(config.budget)
    this.events = new SchedulerEventEmitter()
    this.metrics = new MetricsCollector()
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  get state(): SchedulerLifecycleState {
    return this.lifecycleState
  }

  start(): Result<void, CoreError> {
    if (this.lifecycleState === "running") {
      return err(new CoreError("validation_error", "Scheduler is already running"))
    }
    this.lifecycleState = "running"
    this.events.emit({
      type: "scheduler.started",
      payload: {
        maxConcurrency: this.config.maxConcurrency,
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      },
    })
    return ok(undefined)
  }

  stop(): Result<void, CoreError> {
    if (this.lifecycleState === "stopped") {
      return err(new CoreError("validation_error", "Scheduler is already stopped"))
    }
    this.lifecycleState = "stopped"
    this.events.emit({
      type: "scheduler.stopped",
      payload: {
        reason: "user_request",
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      },
    })
    return ok(undefined)
  }

  pause(reason: string): Result<void, CoreError> {
    if (this.lifecycleState !== "running") {
      return err(new CoreError("validation_error", "Scheduler is not running"))
    }
    this.lifecycleState = "paused"
    this.events.emit({
      type: "scheduler.paused",
      payload: {
        reason,
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      },
    })
    return ok(undefined)
  }

  resume(): Result<void, CoreError> {
    if (this.lifecycleState !== "paused") {
      return err(new CoreError("validation_error", "Scheduler is not paused"))
    }
    this.lifecycleState = "running"
    this.events.emit({
      type: "scheduler.resumed",
      payload: {
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      },
    })
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Readiness Context Injection
  // -----------------------------------------------------------------------

  setReadinessContextProvider(provider: () => ReadinessContext): void {
    this.readinessContextProvider = provider
  }

  // -----------------------------------------------------------------------
  // Enqueue (Scheduler-Part08 §Public API)
  // -----------------------------------------------------------------------

  /**
   * Enqueue a new scheduling unit.
   *
   * The unit enters the incoming queue, then is evaluated for readiness
   * on the next tick.
   */
  enqueue(unit: SchedulingUnit): Result<void, CoreError> {
    if (this.lifecycleState === "stopped") {
      return err(new CoreError("runtime_unavailable", "Scheduler is stopped"))
    }

    if (this.allUnits.has(unit.id)) {
      return err(new CoreError("validation_error", `Unit ${unit.id} already enqueued`))
    }

    // Set initial state
    const now = new Date().toISOString() as import("@/core/types").IsoTimestamp
    const queuedUnit: SchedulingUnit = {
      ...unit,
      state: "queued",
      updatedAt: now,
    }

    this.allUnits.set(unit.id, queuedUnit)
    this.unitCreatedTimes.set(unit.id, Date.now())
    this.incoming.enqueue(queuedUnit)

    this.metrics.setQueueLength("incoming", this.incoming.size)

    this.events.emit({
      type: "scheduler.unit.created",
      payload: {
        unitId: unit.id,
        kind: unit.kind,
        priority: unit.priority,
        state: "queued",
        workspaceId: unit.workspaceId,
        timestamp: now,
      },
    })

    this.events.emit({
      type: "scheduler.unit.queued",
      payload: {
        unitId: unit.id,
        kind: unit.kind,
        priority: unit.priority,
        state: "queued",
        workspaceId: unit.workspaceId,
        timestamp: now,
      },
    })

    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Tick (main scheduling loop)
  // -----------------------------------------------------------------------

  /**
   * Process one scheduling cycle:
   * 1. Move units from incoming through readiness checks
   * 2. Evaluate blocked units for unblocking
   * 3. Dispatch ready units
   * 4. Check retry eligibility
   */
  tick(): Result<void, CoreError> {
    if (this.lifecycleState !== "running") {
      return ok(undefined)
    }

    const ctx = this.readinessContextProvider()

    // 1. Process incoming queue
    this.processIncoming(ctx)

    // 2. Re-evaluate blocked queues
    this.reevaluateBlocked(ctx)

    // 3. Dispatch ready units
    this.dispatchReady()

    // 4. Check retry queue
    this.processRetries()

    // Update metrics
    this.updateMetrics()

    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Cancel (Scheduler-Part08 §Public API)
  // -----------------------------------------------------------------------

  /**
   * Cancel a scheduling unit.
   *
   * Removes the unit from whichever queue it's in, releases resources,
   * and emits a cancellation event.
   */
  cancel(unitId: string, reason: string): Result<void, CoreError> {
    const unit = this.allUnits.get(unitId)
    if (!unit) {
      return err(new CoreError("validation_error", `Unit ${unitId} not found`))
    }

    const terminal: SchedulingState[] = ["completed", "failed", "cancelled", "skipped"]
    if (terminal.includes(unit.state)) {
      return err(new CoreError("validation_error", `Unit ${unitId} is already in terminal state ${unit.state}`))
    }

    // Remove from any queue
    this.removeFromAllQueues(unitId)

    // Release resources
    if (this.runningUnits.has(unitId)) {
      this.concurrency.release(unitId)
      this.budgetPool.release(unitId)
      this.runningUnits.delete(unitId)
      this.unitScheduledTimes.delete(unitId)
    }
    this.retryQueue.remove(unitId)

    // Update state
    const now = new Date().toISOString() as import("@/core/types").IsoTimestamp
    unit.state = "cancelled"
    unit.updatedAt = now

    // Add to cancelled queue
    this.cancelled.enqueue(unit)

    this.metrics.incrementCancellation()
    this.metrics.setRunningCount(this.runningUnits.size)

    this.events.emit({
      type: "scheduler.unit.cancelled",
      payload: {
        unitId,
        kind: unit.kind,
        priority: unit.priority,
        reason,
        requestedBy: "user",
        timestamp: now,
      },
    })

    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Complete / Fail
  // -----------------------------------------------------------------------

  /**
   * Mark a running unit as completed.
   */
  complete(unitId: string): Result<void, CoreError> {
    const unit = this.runningUnits.get(unitId)
    if (!unit) {
      return err(new CoreError("validation_error", `Unit ${unitId} is not running`))
    }

    const now = Date.now()
    const scheduledAt = this.unitScheduledTimes.get(unitId) ?? now
    const runTimeMs = now - scheduledAt

    this.concurrency.release(unitId)
    this.budgetPool.release(unitId)
    this.runningUnits.delete(unitId)
    this.unitScheduledTimes.delete(unitId)
    this.unitCreatedTimes.delete(unitId)

    const ts = new Date(now).toISOString() as import("@/core/types").IsoTimestamp
    unit.state = "completed"
    unit.updatedAt = ts
    this.completed.enqueue(unit)

    const createdTs = this.unitCreatedTimes.get(unitId) ?? now
    this.metrics.recordWaitTime(scheduledAt - createdTs)
    this.metrics.recordRunTime(runTimeMs)
    this.metrics.recordCompleted()
    this.metrics.setRunningCount(this.runningUnits.size)

    this.events.emit({
      type: "scheduler.unit.completed",
      payload: {
        unitId,
        kind: unit.kind,
        priority: unit.priority,
        durationMs: runTimeMs as import("@/core/types").Duration,
        attempt: 1,
        timestamp: ts,
      },
    })

    return ok(undefined)
  }

  /**
   * Mark a running unit as failed.
   */
  fail(unitId: string, error: string, category: import("./scheduler-types").FailureCategory = "unknown_error"): Result<void, CoreError> {
    const unit = this.runningUnits.get(unitId)
    if (!unit) {
      return err(new CoreError("validation_error", `Unit ${unitId} is not running`))
    }

    const now = Date.now()
    this.concurrency.release(unitId)
    this.budgetPool.release(unitId)
    this.runningUnits.delete(unitId)
    this.unitScheduledTimes.delete(unitId)

    const ts = new Date(now).toISOString() as import("@/core/types").IsoTimestamp
    unit.state = "failed"
    unit.updatedAt = ts

    // Try retry
    const retryEntry = this.retryQueue.scheduleRetry(
      unitId,
      1, // attempt tracking would need to be maintained per unit
      error,
      category,
    )

    if (retryEntry) {
      this.metrics.incrementRetry()
      this.events.emit({
        type: "scheduler.unit.failed",
        payload: {
          unitId,
          kind: unit.kind,
          priority: unit.priority,
          failureCategory: category,
          error,
          attempt: retryEntry.attempt,
          willRetry: true,
          timestamp: ts,
        },
      })
      this.events.emit({
        type: "scheduler.unit.retry_scheduled",
        payload: {
          unitId,
          kind: unit.kind,
          attempt: retryEntry.attempt,
          maxAttempts: this.retryQueue["policy"].maxAttempts,
          delayMs: retryEntry.nextEligibleAt - now as import("@/core/types").Duration,
          nextEligibleAt: new Date(retryEntry.nextEligibleAt).toISOString() as import("@/core/types").IsoTimestamp,
          timestamp: ts,
        },
      })
    } else {
      // Permanent failure → dead queue
      this.deadQueue.add({
        unitId,
        kind: unit.kind,
        priority: unit.priority,
        lastError: error,
        failureCategory: category,
        attemptCount: 1,
        enteredAt: ts,
        createdAt: unit.createdAt,
      })
      this.failed.enqueue(unit)

      this.events.emit({
        type: "scheduler.unit.failed",
        payload: {
          unitId,
          kind: unit.kind,
          priority: unit.priority,
          failureCategory: category,
          error,
          attempt: 1,
          willRetry: false,
          timestamp: ts,
        },
      })
    }

    this.metrics.setRunningCount(this.runningUnits.size)
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  getUnit(unitId: string): SchedulingUnit | undefined {
    return this.allUnits.get(unitId)
  }

  getRunningUnits(): readonly SchedulingUnit[] {
    return [...this.runningUnits.values()]
  }

  getQueueSnapshot(): SchedulerQueueSnapshot {
    const queues: Record<QueueKind, { id: string; kind: string; priority: string; state: SchedulingState; createdAt: string }[]> = {
      incoming: this.incoming.toArray().map(unitToSnapshot),
      dependency_wait: this.dependencyWait.toArray().map(unitToSnapshot),
      permission_wait: this.permissionWait.toArray().map(unitToSnapshot),
      approval_wait: this.approvalWait.toArray().map(unitToSnapshot),
      lock_wait: this.lockWait.toArray().map(unitToSnapshot),
      budget_wait: this.budgetWait.toArray().map(unitToSnapshot),
      runnable: this.runnable.toArray().map(unitToSnapshot),
      running: [...this.runningUnits.values()].map(unitToSnapshot),
      retry: this.retryQueue.getAll().map((e) => ({
        id: e.unitId,
        kind: e.failureCategory,
        priority: "normal",
        state: "queued" as SchedulingState,
        createdAt: new Date(e.nextEligibleAt).toISOString(),
      })),
      cancelled: this.cancelled.toArray().map(unitToSnapshot),
      completed: this.completed.toArray().map(unitToSnapshot),
      failed: this.failed.toArray().map(unitToSnapshot),
    }

    const now = Date.now()
    const snapshotQueues: Record<QueueKind, import("./scheduler-types").QueueSnapshotEntry[]> = {
      incoming: [],
      dependency_wait: [],
      permission_wait: [],
      approval_wait: [],
      lock_wait: [],
      budget_wait: [],
      runnable: [],
      running: [],
      retry: [],
      cancelled: [],
      completed: [],
      failed: [],
    }

    let totalBlocked = 0

    for (const [key, units] of Object.entries(queues)) {
      const queueKind = key as QueueKind
      for (const unit of units) {
        const entry: import("./scheduler-types").QueueSnapshotEntry = {
          unitId: unit.id,
          kind: unit.kind as import("./scheduler-types").SchedulingUnitKind,
          priority: unit.priority as import("./scheduler-types").SchedulingPriority,
          state: unit.state,
          queuedAt: unit.createdAt as import("@/core/types").IsoTimestamp,
          ageMs: now - new Date(unit.createdAt).getTime(),
        }
        snapshotQueues[queueKind].push(entry)
        if (queueKind.endsWith("_wait")) {
          totalBlocked++
        }
      }
    }

    return {
      queues: snapshotQueues,
      runningCount: this.runningUnits.size,
      totalBlocked,
      timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    }
  }

  getMetrics() {
    return this.metrics.getMetrics()
  }

  getDeadQueue(): readonly import("./dead-queue").DeadEntry[] {
    return this.deadQueue.getAll()
  }

  // -----------------------------------------------------------------------
  // Private: Queue Processing
  // -----------------------------------------------------------------------

  private processIncoming(ctx: ReadinessContext): void {
    const units: SchedulingUnit[] = []
    while (!this.incoming.isEmpty) {
      const unit = this.incoming.dequeue()
      if (unit) units.push(unit)
    }

    const { ready, blocked } = partitionByReadiness(units, ctx)

    for (const unit of ready) {
      unit.state = "ready"
      unit.updatedAt = new Date().toISOString() as import("@/core/types").IsoTimestamp
      this.runnable.enqueue(unit)
      this.events.emit({
        type: "scheduler.unit.ready",
        payload: {
          unitId: unit.id,
          kind: unit.kind,
          priority: unit.priority,
          state: "ready",
          workspaceId: unit.workspaceId,
          timestamp: unit.updatedAt,
        },
      })
    }

    for (const { unit, result } of blocked) {
      const blocker = result.blockers[0]
      if (!blocker) continue
      const waitQueue = this.getWaitQueueForBlocker(blocker.kind)
      unit.state = this.getWaitStateForBlocker(blocker.kind)
      unit.updatedAt = new Date().toISOString() as import("@/core/types").IsoTimestamp
      waitQueue.enqueue(unit)

      this.metrics.incrementBlocked()

      const payload: SchedulerUnitBlockedPayload = {
        unitId: unit.id,
        kind: unit.kind,
        priority: unit.priority,
        blockerKind: blocker.kind,
        blockerMessage: blocker.message,
        blockingObjectId: blocker.blockingObjectId,
        recoverable: blocker.recoverable,
        timestamp: unit.updatedAt,
      }
      this.events.emit({ type: "scheduler.unit.blocked", payload })
    }
  }

  private reevaluateBlocked(ctx: ReadinessContext): void {
    const blockedQueues = [
      { queue: this.dependencyWait, kind: "dependency" as const },
      { queue: this.permissionWait, kind: "permission" as const },
      { queue: this.approvalWait, kind: "approval" as const },
      { queue: this.lockWait, kind: "lock" as const },
      { queue: this.budgetWait, kind: "budget" as const },
    ]

    for (const { queue } of blockedQueues) {
      const units: SchedulingUnit[] = []
      while (!queue.isEmpty) {
        const unit = queue.dequeue()
        if (unit) units.push(unit)
      }

      const { ready, blocked } = partitionByReadiness(units, ctx)

      for (const unit of ready) {
        unit.state = "ready"
        unit.updatedAt = new Date().toISOString() as import("@/core/types").IsoTimestamp
        this.runnable.enqueue(unit)
        this.metrics.decrementBlocked()
        this.events.emit({
          type: "scheduler.unit.unblocked",
          payload: {
            unitId: unit.id,
            kind: unit.kind,
            priority: unit.priority,
            resolvedBlockerKind: "dependency",
            timestamp: unit.updatedAt,
          },
        })
        this.events.emit({
          type: "scheduler.unit.ready",
          payload: {
            unitId: unit.id,
            kind: unit.kind,
            priority: unit.priority,
            state: "ready",
            workspaceId: unit.workspaceId,
            timestamp: unit.updatedAt,
          },
        })
      }

      for (const { unit } of blocked) {
        queue.enqueue(unit)
      }
    }
  }

  private dispatchReady(): void {
    while (!this.runnable.isEmpty) {
      const unit = this.runnable.peek()
      if (!unit || !this.concurrency.canAcquire(unit.kind)) break

      this.runnable.dequeue()
      if (!this.concurrency.acquire(unit.id, unit.kind)) continue

      // Reserve budget if estimate provided
      if (unit.budgetEstimate) {
        const reservation = this.budgetPool.reserve(unit.id, unit.budgetEstimate)
        if (!reservation) {
          // Budget unavailable — put back
          this.concurrency.release(unit.id)
          this.runnable.enqueue(unit)
          break
        }
      }

      const now = Date.now()
      unit.state = "running"
      unit.updatedAt = new Date(now).toISOString() as import("@/core/types").IsoTimestamp
      this.runningUnits.set(unit.id, unit)
      this.unitScheduledTimes.set(unit.id, now)

      this.events.emit({
        type: "scheduler.unit.scheduled",
        payload: {
          unitId: unit.id,
          kind: unit.kind,
          priority: unit.priority,
          state: "running",
          workspaceId: unit.workspaceId,
          timestamp: unit.updatedAt,
        },
      })
      this.events.emit({
        type: "scheduler.unit.running",
        payload: {
          unitId: unit.id,
          kind: unit.kind,
          priority: unit.priority,
          state: "running",
          workspaceId: unit.workspaceId,
          timestamp: unit.updatedAt,
        },
      })
    }
  }

  private processRetries(): void {
    const eligible = this.retryQueue.getEligible()
    for (const entry of eligible) {
      this.retryQueue.remove(entry.unitId)
      const unit = this.allUnits.get(entry.unitId)
      if (unit) {
        unit.state = "queued"
        unit.updatedAt = new Date().toISOString() as import("@/core/types").IsoTimestamp
        this.incoming.enqueue(unit)
      }
    }
  }

  private removeFromAllQueues(unitId: string): void {
    this.incoming.remove(unitId)
    this.dependencyWait.remove(unitId)
    this.permissionWait.remove(unitId)
    this.approvalWait.remove(unitId)
    this.lockWait.remove(unitId)
    this.budgetWait.remove(unitId)
    this.runnable.remove(unitId)
  }

  private getWaitQueueForBlocker(kind: import("./scheduler-types").BlockerKind): JobQueue {
    const mapping: Record<import("./scheduler-types").BlockerKind, JobQueue> = {
      dependency: this.dependencyWait,
      runtime_state: this.dependencyWait,
      permission: this.permissionWait,
      approval: this.approvalWait,
      lock: this.lockWait,
      budget: this.budgetWait,
      resource: this.dependencyWait,
      tool_unavailable: this.dependencyWait,
      workspace_unavailable: this.dependencyWait,
    }
    return mapping[kind]
  }

  private getWaitStateForBlocker(kind: import("./scheduler-types").BlockerKind): SchedulingState {
    const mapping: Record<import("./scheduler-types").BlockerKind, SchedulingState> = {
      dependency: "waiting_for_dependencies",
      runtime_state: "waiting_for_dependencies",
      permission: "waiting_for_permission",
      approval: "waiting_for_approval",
      lock: "waiting_for_lock",
      budget: "waiting_for_budget",
      resource: "waiting_for_dependencies",
      tool_unavailable: "waiting_for_dependencies",
      workspace_unavailable: "waiting_for_dependencies",
    }
    return mapping[kind]
  }

  private updateMetrics(): void {
    this.metrics.setQueueLength("incoming", this.incoming.size)
    this.metrics.setQueueLength("dependency_wait", this.dependencyWait.size)
    this.metrics.setQueueLength("permission_wait", this.permissionWait.size)
    this.metrics.setQueueLength("approval_wait", this.approvalWait.size)
    this.metrics.setQueueLength("lock_wait", this.lockWait.size)
    this.metrics.setQueueLength("budget_wait", this.budgetWait.size)
    this.metrics.setQueueLength("runnable", this.runnable.size)
    this.metrics.setQueueLength("running", this.runningUnits.size)
    this.metrics.setQueueLength("retry", this.retryQueue.size)
    this.metrics.setQueueLength("cancelled", this.cancelled.size)
    this.metrics.setQueueLength("completed", this.completed.size)
    this.metrics.setQueueLength("failed", this.failed.size)
    this.metrics.setRunningCount(this.runningUnits.size)
  }
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function unitToSnapshot(unit: SchedulingUnit) {
  return {
    id: unit.id,
    kind: unit.kind,
    priority: unit.priority,
    state: unit.state,
    createdAt: unit.createdAt,
  }
}
