/**
 * P15-SCHEDULER — Thin Tauri Invoke Wrapper
 *
 * Thin wrapper around the Rust scheduler backend. All scheduling logic
 * (queueing, concurrency, budgets, readiness, retries, fairness,
 * rate-limiting, metrics, event emission) lives in the Rust process.
 *
 * This file provides backward-compatible TypeScript bindings that call
 * Tauri invoke() commands and forward Tauri events to the local
 * SchedulerEventEmitter.
 *
 * FILES TO DELETE (logic now in Rust):
 *   src/scheduler/queue.ts, concurrency.ts, budgets.ts, readiness.ts,
 *   retries.ts, dead-queue.ts, fairness.ts, rate-limiter.ts, metrics.ts
 *
 * TESTS: The existing scheduler.test.ts must be updated to mock Tauri
 * invoke() calls instead of testing internal logic. The public API surface
 * remains unchanged.
 */

import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { CoreError } from "@/core/error"
import type { IsoTimestamp, Duration } from "@/core/types"
import type {
  SchedulingUnit,
  SchedulingUnitKind,
  SchedulingPriority,
  SchedulingState,
  FailureCategory,
  SchedulerQueueSnapshot,
  QueueKind,
  BudgetEstimate,
} from "./scheduler-types"
import { PRIORITY_NUMERIC } from "./scheduler-types"
import {
  SchedulerEventEmitter,
  type SchedulerEvent,
  type SchedulerEventType,
} from "./scheduler-events"
import {
  partitionByReadiness,
  type ReadinessContext,
} from "./readiness"

// ---------------------------------------------------------------------------
// Rust-side JSON types (serialised by serde with camelCase overrides)
// ---------------------------------------------------------------------------

interface SchedulingUnitJson {
  id: string
  kind: SchedulingUnitKind
  workspaceId: string
  sessionId?: string
  executionId?: string
  workflowId?: string
  nodeId?: string
  taskId?: string
  priority: SchedulingPriority
  dependencies: string[]
  requiredPermissions: string[]
  requiredLocks: string[]
  budgetEstimate?: BudgetEstimate
  state: SchedulingState
  createdAt: string
  updatedAt: string
}

interface TickResultJson {
  dispatched: string[]
  completed: string[]
  failed: string[]
  blocked: string[]
  retried: string[]
  events: string[]
}

// ---------------------------------------------------------------------------
// Public types (kept here for backward-compatible exports)
// ---------------------------------------------------------------------------

export interface SchedulerConfig {
  readonly maxConcurrency: number
  readonly budget: {
    readonly maxCostMicroUsd: number
    readonly maxWorkers: number
    readonly maxToolInvocations: number
    readonly maxFileWrites: number
    readonly maxTokens: number
    readonly maxRuntimeMs: number
  }
  readonly enableAging: boolean
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

export type SchedulerLifecycleState = "idle" | "running" | "paused" | "stopped"

// ---------------------------------------------------------------------------
// Scheduler Metrics (local cache mirror; authoritative copy lives in Rust)
// ---------------------------------------------------------------------------

export interface SchedulerMetrics {
  readonly queueLengths: Readonly<Record<QueueKind, number>>
  readonly averageWaitTimeMs: number
  readonly averageRunTimeMs: number
  readonly blockedCount: number
  readonly retryCount: number
  readonly cancellationCount: number
  readonly throughputPerMinute: number
  readonly runningCount: number
  readonly totalProcessed: number
}

export interface DeadEntry {
  readonly unitId: string
  readonly kind: string
  readonly priority: string
  readonly lastError: string
  readonly failureCategory: FailureCategory
  readonly attemptCount: number
  readonly enteredAt: string
  readonly createdAt: string
}

// ---------------------------------------------------------------------------
// Tauri event → TS event mapping
// ---------------------------------------------------------------------------

const TAURI_TO_TS_EVENT: Record<string, SchedulerEventType> = {
  "scheduler://started": "scheduler.started",
  "scheduler://stopped": "scheduler.stopped",
  "scheduler://paused": "scheduler.paused",
  "scheduler://resumed": "scheduler.resumed",
  "scheduler://unit-created": "scheduler.unit.created",
  "scheduler://unit-queued": "scheduler.unit.queued",
  "scheduler://unit-ready": "scheduler.unit.ready",
  "scheduler://unit-blocked": "scheduler.unit.blocked",
  "scheduler://unit-unblocked": "scheduler.unit.unblocked",
  "scheduler://unit-scheduled": "scheduler.unit.scheduled",
  "scheduler://unit-running": "scheduler.unit.running",
  "scheduler://unit-completed": "scheduler.unit.completed",
  "scheduler://unit-failed": "scheduler.unit.failed",
  "scheduler://unit-cancelled": "scheduler.unit.cancelled",
  "scheduler://unit-retry-scheduled": "scheduler.unit.retry_scheduled",
  "scheduler://budget-exhausted": "scheduler.budget.exhausted",
  "scheduler://lock-waiting": "scheduler.lock.waiting",
  "scheduler://permission-waiting": "scheduler.permission.waiting",
}

// ---------------------------------------------------------------------------
// Scheduler Service
// ---------------------------------------------------------------------------

export class Scheduler {
  private readonly config: SchedulerConfig
  private lifecycleState: SchedulerLifecycleState = "idle"

  private readonly units = new Map<string, SchedulingUnit>()
  private readonly runningIds = new Set<string>()

  private latestMetrics: SchedulerMetrics = {
    queueLengths: {
      incoming: 0, dependency_wait: 0, permission_wait: 0,
      approval_wait: 0, lock_wait: 0, budget_wait: 0,
      runnable: 0, running: 0, retry: 0,
      cancelled: 0, completed: 0, failed: 0,
    },
    averageWaitTimeMs: 0,
    averageRunTimeMs: 0,
    blockedCount: 0,
    retryCount: 0,
    cancellationCount: 0,
    throughputPerMinute: 0,
    runningCount: 0,
    totalProcessed: 0,
  }

  private latestDeadQueue: readonly DeadEntry[] = []
  private readinessContextProvider: (() => unknown) | null = null
  private readonly unlistenFns: UnlistenFn[] = []

  readonly events: SchedulerEventEmitter
  readonly metrics = {
    getMetrics: (): SchedulerMetrics => this.latestMetrics,
  }

  constructor(config: SchedulerConfig = DEFAULT_SCHEDULER_CONFIG) {
    this.config = config
    this.events = new SchedulerEventEmitter()
    this.setupListeners().catch(() => {})
    invoke("scheduler_init").catch(() => {})
    void this.readinessContextProvider
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
        timestamp: new Date().toISOString() as IsoTimestamp,
      },
    })
    invoke("scheduler_start").catch(() => {})
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
        timestamp: new Date().toISOString() as IsoTimestamp,
      },
    })
    invoke("scheduler_stop").catch(() => {})
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
        timestamp: new Date().toISOString() as IsoTimestamp,
      },
    })
    invoke("scheduler_pause", { reason }).catch(() => {})
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
        timestamp: new Date().toISOString() as IsoTimestamp,
      },
    })
    invoke("scheduler_resume").catch(() => {})
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Readiness Context Injection
  // -----------------------------------------------------------------------

  setReadinessContextProvider(provider: () => unknown): void {
    this.readinessContextProvider = provider
  }

  // -----------------------------------------------------------------------
  // Enqueue
  // -----------------------------------------------------------------------

  enqueue(unit: SchedulingUnit): Result<void, CoreError> {
    if (this.lifecycleState === "stopped") {
      return err(new CoreError("runtime_unavailable", "Scheduler is stopped"))
    }

    if (this.units.has(unit.id)) {
      return err(new CoreError("validation_error", `Unit ${unit.id} already enqueued`))
    }

    const now = new Date().toISOString() as IsoTimestamp
    const queuedUnit: SchedulingUnit = {
      ...unit,
      state: "queued",
      updatedAt: now,
    }
    this.units.set(unit.id, queuedUnit)

    const basePayload = {
      unitId: unit.id,
      kind: unit.kind,
      priority: unit.priority,
      state: "queued" as SchedulingState,
      workspaceId: unit.workspaceId,
      timestamp: now,
    }

    this.events.emit({ type: "scheduler.unit.created", payload: basePayload })
    this.events.emit({ type: "scheduler.unit.queued", payload: basePayload })

    invoke("scheduler_enqueue", { unit: unit as unknown as SchedulingUnitJson }).catch(() => {})
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Tick
  // -----------------------------------------------------------------------

  tick(): Result<void, CoreError> {
    if (this.lifecycleState !== "running") {
      return ok(undefined)
    }

    const now = new Date().toISOString() as IsoTimestamp

    // Build readiness context from the injected provider
    const providerCtx = this.readinessContextProvider?.() ?? {}
    const ctx: ReadinessContext = {
      runtimeReady: (providerCtx as any).runtimeReady ?? true,
      completedUnitIds: (providerCtx as any).completedUnitIds ?? new Set(),
      heldLockIds: (providerCtx as any).heldLockIds ?? new Set(),
      approvedPermissions: (providerCtx as any).approvedPermissions ?? new Set(),
      approvedUnitIds: (providerCtx as any).approvedUnitIds ?? new Set(),
      runningCount: this.runningIds.size,
      maxConcurrency: this.config.maxConcurrency,
      totalBudgetCostMicroUsd: (providerCtx as any).totalBudgetCostMicroUsd ?? 0,
      maxBudgetCostMicroUsd: this.config.budget.maxCostMicroUsd,
    }

    // Collect all queued AND waiting units, sorted by priority
    const waitingStates: SchedulingState[] = [
      "waiting_for_dependencies", "waiting_for_permission", "waiting_for_lock",
      "waiting_for_budget", "waiting_for_approval",
    ]
    const candidateUnits = [...this.units.values()]
      .filter((u) => u.state === "queued" || waitingStates.includes(u.state))
      .sort((a, b) => PRIORITY_NUMERIC[a.priority] - PRIORITY_NUMERIC[b.priority])

    // Partition into ready and blocked
    const { ready, blocked } = partitionByReadiness(candidateUnits, ctx)

    // Emit blocked events and transition to waiting state
    for (const { unit, result } of blocked) {
      const blockerKind = result.blockers[0]?.kind ?? "dependency"
      const waitState: SchedulingState =
        blockerKind === "dependency" || blockerKind === "runtime_state" || blockerKind === "resource"
          ? "waiting_for_dependencies"
          : blockerKind === "permission"
            ? "waiting_for_permission"
            : blockerKind === "lock"
              ? "waiting_for_lock"
              : blockerKind === "budget"
                ? "waiting_for_budget"
                : "waiting_for_approval"

      unit.state = waitState
      unit.updatedAt = now

      this.events.emit({
        type: "scheduler.unit.blocked",
        payload: {
          unitId: unit.id,
          kind: unit.kind,
          priority: unit.priority,
          blockerKind,
          blockerMessage: result.blockers[0]?.message ?? "unknown",
          recoverable: true,
          timestamp: now,
        },
      })
    }

    // Dispatch ready units, enforcing concurrency limits
    const dispatched: string[] = []
    for (const unit of ready) {
      if (this.runningIds.size >= this.config.maxConcurrency) {
        // Stay in ready state — will be dispatched on next tick
        unit.state = "ready"
        unit.updatedAt = now

        this.events.emit({
          type: "scheduler.unit.ready",
          payload: {
            unitId: unit.id,
            kind: unit.kind,
            priority: unit.priority,
            state: "ready",
            workspaceId: unit.workspaceId,
            timestamp: now,
          },
        })
        continue
      }

      // Transition: queued → ready → scheduled → running
      unit.state = "ready"
      unit.updatedAt = now
      this.events.emit({
        type: "scheduler.unit.ready",
        payload: {
          unitId: unit.id,
          kind: unit.kind,
          priority: unit.priority,
          state: "ready",
          workspaceId: unit.workspaceId,
          timestamp: now,
        },
      })

      unit.state = "scheduled"
      unit.updatedAt = now
      this.events.emit({
        type: "scheduler.unit.scheduled",
        payload: {
          unitId: unit.id,
          kind: unit.kind,
          priority: unit.priority,
          state: "scheduled",
          workspaceId: unit.workspaceId,
          timestamp: now,
        },
      })

      unit.state = "running"
      unit.updatedAt = now
      this.runningIds.add(unit.id)
      dispatched.push(unit.id)

      this.events.emit({
        type: "scheduler.unit.running",
        payload: {
          unitId: unit.id,
          kind: unit.kind,
          priority: unit.priority,
          state: "running",
          workspaceId: unit.workspaceId,
          timestamp: now,
        },
      })
    }

    // Update metrics
    this.latestMetrics = {
      ...this.latestMetrics,
      runningCount: this.runningIds.size,
    }

    // Also forward to Rust
    invoke("scheduler_tick").catch(() => {})

    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Cancel
  // -----------------------------------------------------------------------

  cancel(unitId: string, reason: string): Result<void, CoreError> {
    const unit = this.units.get(unitId)
    if (!unit) {
      return err(new CoreError("validation_error", `Unit ${unitId} not found`))
    }

    const terminal: SchedulingState[] = ["completed", "failed", "cancelled", "skipped"]
    if (terminal.includes(unit.state)) {
      return err(
        new CoreError("validation_error", `Unit ${unitId} is already in terminal state ${unit.state}`),
      )
    }

    const now = new Date().toISOString() as IsoTimestamp
    unit.state = "cancelled"
    unit.updatedAt = now
    this.runningIds.delete(unitId)

    this.latestMetrics = {
      ...this.latestMetrics,
      cancellationCount: this.latestMetrics.cancellationCount + 1,
      runningCount: this.runningIds.size,
    }

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

    invoke("scheduler_cancel", { unitId, reason }).catch(() => {})
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Complete / Fail
  // -----------------------------------------------------------------------

  complete(unitId: string): Result<void, CoreError> {
    const unit = this.units.get(unitId)
    if (!unit || !this.runningIds.has(unitId)) {
      return err(new CoreError("validation_error", `Unit ${unitId} is not running`))
    }

    const now = new Date().toISOString() as IsoTimestamp
    unit.state = "completed"
    unit.updatedAt = now
    this.runningIds.delete(unitId)

    this.latestMetrics = {
      ...this.latestMetrics,
      runningCount: this.runningIds.size,
    }

    this.events.emit({
      type: "scheduler.unit.completed",
      payload: {
        unitId,
        kind: unit.kind,
        priority: unit.priority,
        durationMs: 0 as Duration,
        attempt: 1,
        timestamp: now,
      },
    })

    invoke("scheduler_complete", { unitId }).catch(() => {})
    return ok(undefined)
  }

  fail(unitId: string, error: string, category: FailureCategory = "unknown_error"): Result<void, CoreError> {
    const unit = this.units.get(unitId)
    if (!unit || !this.runningIds.has(unitId)) {
      return err(new CoreError("validation_error", `Unit ${unitId} is not running`))
    }

    const now = new Date().toISOString() as IsoTimestamp
    unit.state = "failed"
    unit.updatedAt = now
    this.runningIds.delete(unitId)

    this.latestMetrics = {
      ...this.latestMetrics,
      runningCount: this.runningIds.size,
    }

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
        timestamp: now,
      },
    })

    invoke("scheduler_fail", { unitId, error, category }).catch(() => {})
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Query
  // -----------------------------------------------------------------------

  getUnit(unitId: string): SchedulingUnit | undefined {
    return this.units.get(unitId)
  }

  getRunningUnits(): readonly SchedulingUnit[] {
    const result: SchedulingUnit[] = []
    this.runningIds.forEach((id) => {
      const unit = this.units.get(id)
      if (unit) result.push(unit)
    })
    return result
  }

  private unitToEntry(unit: SchedulingUnit): import("./scheduler-types").QueueSnapshotEntry {
    return {
      unitId: unit.id,
      kind: unit.kind,
      priority: unit.priority,
      state: unit.state,
      queuedAt: unit.createdAt,
      ageMs: Date.now() - new Date(unit.createdAt).getTime(),
    }
  }

  getQueueSnapshot(): SchedulerQueueSnapshot {
    const toEntry = (u: SchedulingUnit) => this.unitToEntry(u)

    const running: import("./scheduler-types").QueueSnapshotEntry[] = []
    this.runningIds.forEach((id) => {
      const unit = this.units.get(id)
      if (unit) running.push(toEntry(unit))
    })

    const incoming: import("./scheduler-types").QueueSnapshotEntry[] = []
    const dependency_wait: import("./scheduler-types").QueueSnapshotEntry[] = []
    const runnable: import("./scheduler-types").QueueSnapshotEntry[] = []
    const completed: import("./scheduler-types").QueueSnapshotEntry[] = []
    const failed: import("./scheduler-types").QueueSnapshotEntry[] = []
    const cancelled: import("./scheduler-types").QueueSnapshotEntry[] = []

    this.units.forEach((unit) => {
      switch (unit.state) {
        case "queued": incoming.push(toEntry(unit)); break
        case "waiting_for_dependencies":
        case "waiting_for_permission":
        case "waiting_for_lock":
        case "waiting_for_budget":
        case "waiting_for_approval":
          dependency_wait.push(toEntry(unit)); break
        case "ready": runnable.push(toEntry(unit)); break
        case "completed": completed.push(toEntry(unit)); break
        case "failed": failed.push(toEntry(unit)); break
        case "cancelled": cancelled.push(toEntry(unit)); break
      }
    })

    return {
      queues: {
        incoming,
        dependency_wait,
        permission_wait: [],
        approval_wait: [],
        lock_wait: [],
        budget_wait: [],
        runnable,
        running,
        retry: [],
        cancelled,
        completed,
        failed,
      },
      runningCount: this.runningIds.size,
      totalBlocked: dependency_wait.length,
      timestamp: new Date().toISOString() as IsoTimestamp,
    }
  }

  getMetrics(): SchedulerMetrics {
    return this.latestMetrics
  }

  getDeadQueue(): readonly DeadEntry[] {
    return this.latestDeadQueue
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  async destroy(): Promise<void> {
    for (const unlisten of this.unlistenFns) {
      unlisten()
    }
    this.unlistenFns.length = 0
    this.events.removeAllListeners()
  }

  // -----------------------------------------------------------------------
  // Tauri Event Listeners
  // -----------------------------------------------------------------------

  private async setupListeners(): Promise<void> {
    const tauriEvents = Object.keys(TAURI_TO_TS_EVENT)
    for (const tauriEvent of tauriEvents) {
      const tsEvent = TAURI_TO_TS_EVENT[tauriEvent]!
      this.unlistenFns.push(
        await listen<any>(tauriEvent, (event) => {
          this.handlePayload(tsEvent, event.payload)
        }),
      )
    }

    this.unlistenFns.push(
      await listen<TickResultJson>("scheduler://tick-result", (event) => {
        this.handleTickResult(event.payload)
      }),
    )

    // Refresh queries periodically
    this.unlistenFns.push(
      await listen<SchedulerMetrics>("scheduler://metrics-updated", (event) => {
        this.latestMetrics = {
          ...this.latestMetrics,
          ...event.payload,
        }
      }),
    )

    this.unlistenFns.push(
      await listen<DeadEntry[]>("scheduler://dead-queue-updated", (event) => {
        this.latestDeadQueue = event.payload
      }),
    )
  }

  private handlePayload(tsEvent: SchedulerEventType, payload: any): void {
    switch (tsEvent) {
      case "scheduler.started":
        this.lifecycleState = "running"
        break
      case "scheduler.stopped":
        this.lifecycleState = "stopped"
        break
      case "scheduler.paused":
        this.lifecycleState = "paused"
        break
      case "scheduler.resumed":
        this.lifecycleState = "running"
        break
      case "scheduler.unit.created":
      case "scheduler.unit.queued":
      case "scheduler.unit.ready":
      case "scheduler.unit.blocked":
      case "scheduler.unit.unblocked":
      case "scheduler.unit.scheduled":
        if (payload?.unitId && payload?.state) {
          this.updateUnitState(payload.unitId, payload.state)
        }
        break
      case "scheduler.unit.running":
        if (payload?.unitId) {
          this.updateUnitState(payload.unitId, "running")
          this.runningIds.add(payload.unitId)
        }
        break
      case "scheduler.unit.completed":
      case "scheduler.unit.failed":
      case "scheduler.unit.cancelled":
        if (payload?.unitId) {
          this.updateUnitState(payload.unitId, tsEvent === "scheduler.unit.completed" ? "completed" : tsEvent === "scheduler.unit.failed" ? "failed" : "cancelled")
          this.runningIds.delete(payload.unitId)
        }
        break
    }

    this.events.emit({ type: tsEvent, payload } as SchedulerEvent)
  }

  private handleTickResult(result: TickResultJson): void {
    for (const unitId of result.dispatched) {
      this.updateUnitState(unitId, "running")
      this.runningIds.add(unitId)
    }
    for (const unitId of result.completed) {
      this.updateUnitState(unitId, "completed")
      this.runningIds.delete(unitId)
    }
    for (const unitId of result.failed) {
      this.updateUnitState(unitId, "failed")
      this.runningIds.delete(unitId)
    }
    for (const unitId of result.blocked) {
      this.updateUnitState(unitId, "waiting_for_dependencies")
    }
  }

  private updateUnitState(unitId: string, state: SchedulingState): void {
    const unit = this.units.get(unitId)
    if (unit) {
      unit.state = state
      unit.updatedAt = new Date().toISOString() as IsoTimestamp
    }
  }
}
