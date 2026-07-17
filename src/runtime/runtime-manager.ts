/**
 * P02-RUNTIME-MANAGER — Runtime Manager
 *
 * Top-level coordinator for all deterministic runtime services.
 * From RuntimeManager-Part01 through Part06: the kernel supervisor.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

import { RuntimeStateMachine } from "./runtime-state"
import { ServiceRegistry } from "./service-registry"
import { RuntimeConfigManager } from "./runtime-config"
import { RuntimeHealthMonitor } from "./runtime-health"
import { RuntimeDiagnosticsCollector } from "./runtime-diag"
import { RuntimeLifecycle, type ServiceLifecycleHook } from "./runtime-lifecycle"
import { bootstrapServiceRegistry } from "./runtime-bootstrap"
import { RuntimeShutdown, type StopOptions } from "./runtime-shutdown"
import { RuntimeRecovery } from "./runtime-recovery"
import type { RuntimeHealthSnapshot } from "./runtime-health"
import type { RuntimeConfig } from "./runtime-config"
import type {
  RuntimeCommand,
  RuntimeCommandResult,
} from "./runtime-commands"
import { commandResultOk, commandResultErr } from "./runtime-commands"

// ---------------------------------------------------------------------------
// Stop options re-export
// ---------------------------------------------------------------------------

export type { StopOptions } from "./runtime-shutdown"

// ---------------------------------------------------------------------------
// Runtime Manager
// ---------------------------------------------------------------------------

export class RuntimeManager {
  private readonly logger: Logger
  private readonly stateMachine: RuntimeStateMachine
  private readonly registry: ServiceRegistry
  private readonly configManager: RuntimeConfigManager
  private readonly healthMonitor: RuntimeHealthMonitor
  private readonly diagnostics: RuntimeDiagnosticsCollector
  private readonly lifecycle: RuntimeLifecycle
  private readonly shutdown: RuntimeShutdown
  private readonly recovery: RuntimeRecovery

  private activeWorkspaceId?: string
  private activeSessionId?: string
  private activeExecutionCount = 0
  private activeWorkerCount = 0
  private pendingApprovalCount = 0
  private blockedTaskCount = 0

  constructor(configOverrides?: Partial<RuntimeConfig>) {
    this.logger = createLogger("RuntimeManager")
    this.stateMachine = new RuntimeStateMachine((from, to) => {
      this.logger.info(`Runtime state: ${from} → ${to}`)
      this.diagnostics.info("state", `State transition: ${from} → ${to}`)
    })
    this.registry = new ServiceRegistry()
    this.configManager = new RuntimeConfigManager(configOverrides)
    this.healthMonitor = new RuntimeHealthMonitor()
    this.diagnostics = new RuntimeDiagnosticsCollector()
    this.lifecycle = new RuntimeLifecycle(
      this.registry,
    )
    this.shutdown = new RuntimeShutdown(
      this.stateMachine,
      this.lifecycle,
      this.configManager.config,
    )
    this.recovery = new RuntimeRecovery(
      this.stateMachine,
      this.registry,
      this.lifecycle,
      this.configManager.config,
    )
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Start the runtime. */
  async start(): Promise<Result<void, CoreError>> {
    if (this.stateMachine.state !== "uninitialized" && this.stateMachine.state !== "stopped") {
      return err(new CoreError("validation_error", `Cannot start runtime in state: ${this.stateMachine.state}`))
    }

    const transition = this.stateMachine.transition("starting")
    if (!transition.ok) return err(transition.error)

    // Load configuration
    const configResult = await this.configManager.load()
    if (!configResult.ok) {
      this.stateMachine.transition("failed")
      return err(configResult.error)
    }

    // Bootstrap service registry
    bootstrapServiceRegistry(this.registry)

    // Start services in phase order
    const startResult = await this.lifecycle.startServices()
    if (!startResult.ok) {
      this.stateMachine.transition("failed")
      return err(startResult.error)
    }

    // Mark ready then running
    this.stateMachine.transition("ready")
    this.stateMachine.transition("running")

    this.diagnostics.markStarted()
    this.logger.info("Runtime started successfully")

    // Start health checks
    this.startHealthChecks()

    return ok(undefined)
  }

  /** Stop the runtime gracefully. */
  async stop(options?: StopOptions): Promise<Result<void, CoreError>> {
    this.stopHealthChecks()
    return this.shutdown.shutdown(options)
  }

  /** Pause the runtime. */
  async pause(reason: string): Promise<Result<void, CoreError>> {
    this.logger.info(`Runtime pausing: ${reason}`)

    if (this.stateMachine.state === "running") {
      return this.stateMachine.transition("paused") as Result<void, CoreError>
    }
    if (this.stateMachine.state === "degraded") {
      return ok(undefined) // Already limited
    }
    return err(new CoreError("validation_error", `Cannot pause runtime in state: ${this.stateMachine.state}`))
  }

  /** Resume the runtime from paused state. */
  async resume(): Promise<Result<void, CoreError>> {
    if (this.stateMachine.state === "paused") {
      return this.stateMachine.transition("running") as Result<void, CoreError>
    }
    return err(new CoreError("validation_error", `Cannot resume runtime in state: ${this.stateMachine.state}`))
  }

  /** Get current health snapshot. */
  async getHealth(): Promise<RuntimeHealthSnapshot> {
    return this.healthMonitor.getSnapshot(
      this.stateMachine.state,
      this.registry,
      {
        activeExecutions: this.activeExecutionCount,
        activeWorkers: this.activeWorkerCount,
        pendingApprovals: this.pendingApprovalCount,
        blockedTasks: this.blockedTaskCount,
        activeWorkspaceId: this.activeWorkspaceId,
        activeSessionId: this.activeSessionId,
      },
    )
  }

  /** Execute a typed command through the runtime. */
  async executeCommand(command: RuntimeCommand): Promise<RuntimeCommandResult> {
    // Validate runtime is accepting commands
    if (!this.stateMachine.canAcceptCommands) {
      return commandResultErr(command.id, new CoreError("runtime_unavailable", `Runtime not accepting commands (state: ${this.stateMachine.state})`))
    }

    // Validate command shape
    if (!command.type || typeof command.type !== "string") {
      return commandResultErr(command.id, new CoreError("validation_error", "Invalid command type"))
    }

    this.diagnostics.info("command", `Executing command: ${command.type}`, {
      commandId: command.id,
      requestedBy: command.requestedBy,
    })

    // Route command
    return this.routeCommand(command)
  }

  // -----------------------------------------------------------------------
  // Service hooks
  // -----------------------------------------------------------------------

  /** Register a lifecycle hook for a service. */
  registerServiceHook(hook: ServiceLifecycleHook): void {
    this.lifecycle.registerHook(hook)
  }

  /** Attempt runtime recovery. */
  async recover(): Promise<Result<void, CoreError>> {
    return this.recovery.recover()
  }

  // -----------------------------------------------------------------------
  // State accessors
  // -----------------------------------------------------------------------

  get state() {
    return this.stateMachine.state
  }

  get config(): RuntimeConfig {
    return this.configManager.config
  }

  /** Whether the runtime is accepting commands. */
  get canAcceptCommands(): boolean {
    return this.stateMachine.canAcceptCommands
  }

  /** Get diagnostics snapshot. */
  getDiagnostics() {
    return this.diagnostics.collect(
      this.stateMachine.state,
      this.healthMonitor.getSnapshot(
        this.stateMachine.state,
        this.registry,
        {
          activeExecutions: this.activeExecutionCount,
          activeWorkers: this.activeWorkerCount,
        },
      ),
      this.registry.getAll(),
    )
  }

  // -----------------------------------------------------------------------
  // Internal: command routing
  // -----------------------------------------------------------------------

  private async routeCommand(command: RuntimeCommand): Promise<RuntimeCommandResult> {
    switch (command.type) {
      case "runtime.health.get":
        return commandResultOk(command.id, await this.getHealth())

      case "runtime.diagnostics":
        return commandResultOk(command.id, this.getDiagnostics())

      case "runtime.pause":
        return this.handlePause(command)
      case "runtime.resume":
        return this.handleResume(command)
      case "runtime.stop":
        return this.handleStop(command)

      default:
        return commandResultErr(
          command.id,
          new CoreError("method_unknown", `Unknown command type: ${command.type}`),
        )
    }
  }

  private async handlePause(command: RuntimeCommand): Promise<RuntimeCommandResult> {
    const reason = (command.payload.reason as string) ?? "User requested pause"
    const result = await this.pause(reason)
    if (!result.ok) return commandResultErr(command.id, result.error)
    return commandResultOk(command.id, { state: this.state }, ["runtime.paused"])
  }

  private async handleResume(command: RuntimeCommand): Promise<RuntimeCommandResult> {
    const result = await this.resume()
    if (!result.ok) return commandResultErr(command.id, result.error)
    return commandResultOk(command.id, { state: this.state }, ["runtime.resumed"])
  }

  private async handleStop(command: RuntimeCommand): Promise<RuntimeCommandResult> {
    const force = command.payload.force as boolean | undefined
    const result = await this.stop({ force, reason: "Command: runtime.stop" })
    if (!result.ok) return commandResultErr(command.id, result.error)
    return commandResultOk(command.id, { state: this.state }, ["runtime.stopped"])
  }

  // -----------------------------------------------------------------------
  // Health checks
  // -----------------------------------------------------------------------

  private startHealthChecks(): void {
    this.healthMonitor.startPeriodicChecks(
      this.configManager.config.healthCheckIntervalMs,
      () => this.healthMonitor.getSnapshot(
        this.stateMachine.state,
        this.registry,
        {
          activeExecutions: this.activeExecutionCount,
          activeWorkers: this.activeWorkerCount,
          pendingApprovals: this.pendingApprovalCount,
          blockedTasks: this.blockedTaskCount,
          activeWorkspaceId: this.activeWorkspaceId,
          activeSessionId: this.activeSessionId,
        },
      ),
    )
  }

  private stopHealthChecks(): void {
    this.healthMonitor.stopPeriodicChecks()
  }
}
