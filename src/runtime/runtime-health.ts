/**
 * P02-RUNTIME-HEALTH — Runtime Health System
 *
 * Liveness/readiness checks, health snapshots, stall detection.
 * From RuntimeManager-Part03: RuntimeHealthSnapshot, service health states.
 */

import type { RuntimeState } from "./runtime-state"
import type { RuntimeServiceHealth, ServiceRegistry } from "./service-registry"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Health status
// ---------------------------------------------------------------------------

export type OverallHealth = "healthy" | "degraded" | "unsafe" | "failed"

// ---------------------------------------------------------------------------
// Runtime health snapshot
// ---------------------------------------------------------------------------

export interface RuntimeHealthSnapshot {
  readonly runtimeState: RuntimeState
  readonly overallStatus: OverallHealth
  readonly services: readonly RuntimeServiceHealth[]
  readonly activeWorkspaceId?: string
  readonly activeSessionId?: string
  readonly activeExecutionCount: number
  readonly activeWorkerCount: number
  readonly pendingApprovalCount: number
  readonly blockedTaskCount: number
  readonly updatedAt: string
}

// ---------------------------------------------------------------------------
// Health monitor
// ---------------------------------------------------------------------------

export class RuntimeHealthMonitor {
  private readonly logger: Logger
  private healthCheckTimer?: ReturnType<typeof setInterval>
  private readonly listeners: Array<(snapshot: RuntimeHealthSnapshot) => void> = []

  constructor() {
    this.logger = createLogger("RuntimeHealth")
  }

  /** Compute overall health from service states. */
  computeOverallHealth(registry: ServiceRegistry): OverallHealth {
    const services = registry.getHealthSnapshot()
    const requiredServices = services.filter((s) => s.required)

    const failedRequired = requiredServices.filter((s) => s.state === "failed")
    if (failedRequired.length > 0) {
      return "failed"
    }

    const safetyCritical = ["PermissionManager", "WorkspaceManager", "LockManager", "EventBus"]
    const unsafeServices = requiredServices.filter(
      (s) => safetyCritical.includes(s.serviceName) && s.state !== "ready" && s.state !== "running",
    )
    if (unsafeServices.length > 0) {
      return "unsafe"
    }

    const unhealthyRequired = requiredServices.filter(
      (s) => s.state !== "ready" && s.state !== "running",
    )
    if (unhealthyRequired.length > 0) {
      return "degraded"
    }

    const degradedOptional = services.filter(
      (s) => !s.required && s.state !== "ready" && s.state !== "running" && s.state !== "registered",
    )
    if (degradedOptional.length > 0) {
      return "degraded"
    }

    return "healthy"
  }

  /** Build a full health snapshot. */
  getSnapshot(
    runtimeState: RuntimeState,
    registry: ServiceRegistry,
    counters?: {
      activeExecutions?: number
      activeWorkers?: number
      pendingApprovals?: number
      blockedTasks?: number
      activeWorkspaceId?: string
      activeSessionId?: string
    },
  ): RuntimeHealthSnapshot {
    return {
      runtimeState,
      overallStatus: this.computeOverallHealth(registry),
      services: registry.getHealthSnapshot(),
      activeWorkspaceId: counters?.activeWorkspaceId,
      activeSessionId: counters?.activeSessionId,
      activeExecutionCount: counters?.activeExecutions ?? 0,
      activeWorkerCount: counters?.activeWorkers ?? 0,
      pendingApprovalCount: counters?.pendingApprovals ?? 0,
      blockedTaskCount: counters?.blockedTasks ?? 0,
      updatedAt: new Date().toISOString(),
    }
  }

  /** Start periodic health checks. */
  startPeriodicChecks(
    intervalMs: number,
    checker: () => RuntimeHealthSnapshot,
  ): void {
    this.stopPeriodicChecks()
    this.healthCheckTimer = setInterval(() => {
      const snapshot = checker()
      for (const listener of this.listeners) {
        listener(snapshot)
      }
      if (snapshot.overallStatus === "unsafe" || snapshot.overallStatus === "failed") {
        this.logger.error("Runtime health critical", {
          status: snapshot.overallStatus,
          state: snapshot.runtimeState,
        })
      } else if (snapshot.overallStatus === "degraded") {
        this.logger.warn("Runtime health degraded", {
          status: snapshot.overallStatus,
        })
      }
    }, intervalMs)
    this.logger.info(`Health checks started (interval: ${intervalMs}ms)`)
  }

  stopPeriodicChecks(): void {
    if (this.healthCheckTimer !== undefined) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
  }

  onHealthChange(listener: (snapshot: RuntimeHealthSnapshot) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const idx = this.listeners.indexOf(listener)
      if (idx >= 0) this.listeners.splice(idx, 1)
    }
  }

  /** Detect stalled runtime: services are up but no progress. */
  detectStall(snapshot: RuntimeHealthSnapshot, previousSnapshot?: RuntimeHealthSnapshot): boolean {
    if (!previousSnapshot) return false

    // Same worker count and execution count for two consecutive checks = stall
    return (
      snapshot.activeExecutionCount === previousSnapshot.activeExecutionCount &&
      snapshot.activeWorkerCount === previousSnapshot.activeWorkerCount &&
      snapshot.runtimeState === previousSnapshot.runtimeState &&
      snapshot.runtimeState === "running"
    )
  }
}
