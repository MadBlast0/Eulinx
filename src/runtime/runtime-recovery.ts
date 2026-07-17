/**
 * P02-RUNTIME-RECOVERY — Runtime Recovery
 *
 * Crash recovery, service restart, and state restoration.
 * From RuntimeManager-Part05: failure handling and recovery mode.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { RuntimeConfig } from "./runtime-config"
import type { RuntimeStateMachine } from "./runtime-state"
import type { ServiceRegistry } from "./service-registry"
import type { RuntimeLifecycle } from "./runtime-lifecycle"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Recovery manager
// ---------------------------------------------------------------------------

export class RuntimeRecovery {
  private readonly logger: Logger
  private recoveryAttempts = 0

  constructor(
    private readonly stateMachine: RuntimeStateMachine,
    private readonly registry: ServiceRegistry,
    private readonly lifecycle: RuntimeLifecycle,
    private readonly config: RuntimeConfig,
  ) {
    this.logger = createLogger("RuntimeRecovery")
  }

  /** Enter recovery mode and attempt to restore health. */
  async recover(): Promise<Result<void, CoreError>> {
    if (this.recoveryAttempts >= this.config.maxRecoveryAttempts) {
      this.logger.error("Max recovery attempts reached, stopping runtime")
      return err(new CoreError("internal_error", "Max recovery attempts exceeded"))
    }

    this.recoveryAttempts++
    this.logger.info(`Recovery attempt ${this.recoveryAttempts}/${this.config.maxRecoveryAttempts}`)

    const transition = this.stateMachine.transition("recovery")
    if (!transition.ok) {
      return err(transition.error)
    }

    // Find failed services
    const failedServices = this.registry
      .getAll()
      .filter((s) => s.state === "failed" && s.definition.required)

    if (failedServices.length === 0) {
      this.logger.info("No failed required services found, transitioning to running")
      this.stateMachine.transition("running")
      return ok(undefined)
    }

    // Attempt to restart each failed service
    for (const service of failedServices) {
      this.logger.info(`Attempting recovery of service: ${service.definition.id}`)

      // Check if dependencies are still healthy
      if (!this.registry.areDependenciesReady(service.definition.id)) {
        this.logger.warn(`Cannot recover ${service.definition.id}: dependencies not ready`)
        continue
      }

      const result = await this.lifecycle.reloadService(service.definition.id)
      if (result.ok) {
        this.logger.info(`Service recovered: ${service.definition.id}`)
      } else {
        this.logger.error(`Service recovery failed: ${service.definition.id}`, {
          error: result.error.message,
        })
        this.registry.recordError(service.definition.id, result.error.message)
      }
    }

    // Check if all required services are now healthy
    if (this.registry.allRequiredHealthy()) {
      this.logger.info("All required services recovered")
      this.recoveryAttempts = 0
      this.stateMachine.transition("running")
      return ok(undefined)
    }

    // Still degraded
    this.logger.warn("Recovery incomplete, remaining in degraded state")
    this.stateMachine.transition("degraded")
    return ok(undefined)
  }

  /** Reset recovery attempt counter (call after successful full recovery). */
  resetAttempts(): void {
    this.recoveryAttempts = 0
  }

  get attempts(): number {
    return this.recoveryAttempts
  }
}
