/**
 * P15-ORCH — Base Orchestrator
 *
 * Abstract base for all orchestrator roles. Owns: plan slice, workers, memory scope,
 * task queue, budget, artifacts, verification expectations.
 * From AIArchitecture-Part02 §What an Orchestrator Is.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type {
  WorkerId,
  TaskId,
  ArtifactId,
  IsoTimestamp,
  JsonObject,
} from "@/core/types"

import type {
  OrchestratorId,
  OrchestratorConfig,
  OrchestratorSnapshot,
  OrchestratorState,
  OrchestratorRole,
  OrchestratorLevel,
  OrchestratorEvent,
  OrchestratorEventType,
  ProgressReport,
} from "./orchestrator-types"

// ---------------------------------------------------------------------------
// Base Orchestrator
// ---------------------------------------------------------------------------

export abstract class BaseOrchestrator {
  protected readonly logger: Logger
  private readonly _events: OrchestratorEvent[] = []
  private _state: OrchestratorState = "pending"
  private _childOrchestratorIds: OrchestratorId[] = []
  private _assignedWorkerIds: WorkerId[] = []
  private _taskIds: TaskId[] = []
  private _artifactIds: ArtifactId[] = []
  private _budgetSpent = 0
  private _currentPass = 0
  private _error?: string
  private _startedAt?: IsoTimestamp
  private _completedAt?: IsoTimestamp

  constructor(protected readonly config: OrchestratorConfig) {
    this.logger = createLogger(`Orchestrator:${config.role}:${config.id}`)
  }

  // -----------------------------------------------------------------------
  // Identity
  // -----------------------------------------------------------------------

  get id(): OrchestratorId {
    return this.config.id
  }

  get role(): OrchestratorRole {
    return this.config.role
  }

  get level(): OrchestratorLevel {
    return this.config.level
  }

  get state(): OrchestratorState {
    return this._state
  }

  get parentOrchestratorId(): OrchestratorId | undefined {
    return this.config.parentOrchestratorId
  }

  // -----------------------------------------------------------------------
  // State snapshot
  // -----------------------------------------------------------------------

  getSnapshot(): OrchestratorSnapshot {
    return {
      config: this.config,
      state: this._state,
      childOrchestratorIds: [...this._childOrchestratorIds],
      assignedWorkerIds: [...this._assignedWorkerIds],
      taskIds: [...this._taskIds],
      artifactIds: [...this._artifactIds],
      budgetSpent: this._budgetSpent,
      currentPass: this._currentPass,
      maxPasses: this.config.refinementMode === "low" ? 1
        : this.config.refinementMode === "medium" ? 2
        : this.config.refinementMode === "high" ? 4
        : 8,
      startedAt: this._startedAt,
      completedAt: this._completedAt,
      error: this._error,
    }
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  async start(): Promise<Result<void, CoreError>> {
    if (this._state !== "pending") {
      return err(new CoreError("validation_error", `Cannot start orchestrator in state: ${this._state}`))
    }

    this._state = "planning"
    this._startedAt = new Date().toISOString() as IsoTimestamp
    this.emit("orchestrator.started")

    // Subclass implements the actual planning logic
    const planResult = await this.onPlan()
    if (!planResult.ok) {
      this._state = "failed"
      this._error = planResult.error.message
      this.emit("orchestrator.failed")
      return err(planResult.error)
    }

    this._state = "delegating"
    this.emit("orchestrator.state_changed")

    // Subclass delegates work
    const delegateResult = await this.onDelegate()
    if (!delegateResult.ok) {
      this._state = "failed"
      this._error = delegateResult.error.message
      this.emit("orchestrator.failed")
      return err(delegateResult.error)
    }

    this._state = "running"
    this.emit("orchestrator.state_changed")

    return ok(undefined)
  }

  async complete(): Promise<Result<void, CoreError>> {
    if (this._state !== "running" && this._state !== "delegating" && this._state !== "awaiting_approval") {
      return err(new CoreError("validation_error", `Cannot complete orchestrator in state: ${this._state}`))
    }

    this._state = "completing"
    this.emit("orchestrator.state_changed")

    const result = await this.onComplete()
    if (!result.ok) {
      this._state = "failed"
      this._error = result.error.message
      this.emit("orchestrator.failed")
      return err(result.error)
    }

    this._state = "completed"
    this._completedAt = new Date().toISOString() as IsoTimestamp
    this.emit("orchestrator.completed")
    return ok(undefined)
  }

  async cancel(reason: string): Promise<Result<void, CoreError>> {
    if (this._state === "completed" || this._state === "cancelled") {
      return err(new CoreError("validation_error", `Cannot cancel orchestrator in state: ${this._state}`))
    }

    this._state = "cancelled"
    this._error = reason
    this._completedAt = new Date().toISOString() as IsoTimestamp
    this.emit("orchestrator.cancelled")
    return ok(undefined)
  }

  async pause(reason: string): Promise<Result<void, CoreError>> {
    if (this._state !== "running" && this._state !== "delegating") {
      return err(new CoreError("validation_error", `Cannot pause orchestrator in state: ${this._state}`))
    }

    this._state = "paused"
    this._error = reason
    this.emit("orchestrator.state_changed")
    return ok(undefined)
  }

  async resume(): Promise<Result<void, CoreError>> {
    if (this._state !== "paused") {
      return err(new CoreError("validation_error", `Cannot resume orchestrator in state: ${this._state}`))
    }

    this._state = "running"
    this._error = undefined
    this.emit("orchestrator.state_changed")
    return ok(undefined)
  }

  // -----------------------------------------------------------------------
  // Child management
  // -----------------------------------------------------------------------

  addChild(childId: OrchestratorId): void {
    this._childOrchestratorIds.push(childId)
    this.emit("orchestrator.child_spawned", { childId })
  }

  completeChild(childId: OrchestratorId): void {
    this.emit("orchestrator.child_completed", { childId })
  }

  failChild(childId: OrchestratorId, error: string): void {
    this.emit("orchestrator.child_failed", { childId, error })
  }

  // -----------------------------------------------------------------------
  // Worker management
  // -----------------------------------------------------------------------

  assignWorker(workerId: WorkerId): void {
    this._assignedWorkerIds.push(workerId)
    this.emit("orchestrator.worker_assigned", { workerId })
  }

  completeWorker(workerId: WorkerId): void {
    this.emit("orchestrator.worker_completed", { workerId })
  }

  // -----------------------------------------------------------------------
  // Task management
  // -----------------------------------------------------------------------

  addTask(taskId: TaskId): void {
    this._taskIds.push(taskId)
  }

  // -----------------------------------------------------------------------
  // Artifact management
  // -----------------------------------------------------------------------

  addArtifact(artifactId: ArtifactId): void {
    this._artifactIds.push(artifactId)
  }

  // -----------------------------------------------------------------------
  // Budget
  // -----------------------------------------------------------------------

  spendBudget(amountMicroUsd: number): Result<void, CoreError> {
    this._budgetSpent += amountMicroUsd
    const remaining = this.config.budgetAllocated - this._budgetSpent
    if (remaining <= 0) {
      this.emit("orchestrator.budget_exceeded", { spent: this._budgetSpent })
      return err(new CoreError("refinement_budget_exceeded", "Budget exhausted"))
    }
    if (remaining < this.config.budgetAllocated * 0.1) {
      this.emit("orchestrator.budget_warning", { remaining })
    }
    return ok(undefined)
  }

  get budgetRemaining(): number {
    return Math.max(0, this.config.budgetAllocated - this._budgetSpent)
  }

  // -----------------------------------------------------------------------
  // Pass tracking
  // -----------------------------------------------------------------------

  incrementPass(): number {
    this._currentPass++
    return this._currentPass
  }

  // -----------------------------------------------------------------------
  // Progress (AIArchitecture-Part02 §Reporting Hierarchy)
  // -----------------------------------------------------------------------

  getProgress(childReports: readonly ProgressReport[] = []): ProgressReport {
    const tasksCompleted = this._taskIds.length
    return {
      orchestratorId: this.id,
      role: this.role,
      level: this.level,
      percentComplete: this._state === "completed" ? 100 : this._state === "pending" ? 0 : 50,
      tasksTotal: tasksCompleted,
      tasksCompleted,
      tasksFailed: 0,
      workersActive: this._assignedWorkerIds.length,
      budgetSpent: this._budgetSpent,
      budgetTotal: this.config.budgetAllocated,
      artifactsProduced: this._artifactIds.length,
      childReports,
      reportedAt: new Date().toISOString() as IsoTimestamp,
    }
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  protected emit(type: OrchestratorEventType, data?: Record<string, unknown>): void {
    const event: OrchestratorEvent = {
      type,
      orchestratorId: this.id,
      timestamp: new Date().toISOString() as IsoTimestamp,
      data: data as JsonObject | undefined,
    }
    this._events.push(event)
    this.logger.debug(`Event: ${type}`)
  }

  getEvents(): readonly OrchestratorEvent[] {
    return [...this._events]
  }

  // -----------------------------------------------------------------------
  // Abstract hooks (subclass implements)
  // -----------------------------------------------------------------------

  /** Plan the work. Called during start() after state → planning. */
  protected abstract onPlan(): Promise<Result<void, CoreError>>

  /** Delegate work to children/workers. Called after onPlan. */
  protected abstract onDelegate(): Promise<Result<void, CoreError>>

  /** Called when complete() is invoked. Subclass does finalization. */
  protected abstract onComplete(): Promise<Result<void, CoreError>>

  /** Human-readable description of this orchestrator's current task. */
  abstract describe(): string
}
