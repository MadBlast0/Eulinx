/**
 * P02-RUNTIME-LIFECYCLE — Runtime Lifecycle
 *
 * Start/stop/reload orchestration for the runtime service graph.
 * From RuntimeManager-Part02: startup phases, shutdown phases.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { ServiceRegistry, RuntimeServiceEntry } from "./service-registry"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Service lifecycle hook
// ---------------------------------------------------------------------------

export interface ServiceLifecycleHook {
  readonly id: string
  start(): Promise<Result<void, CoreError>>
  stop(): Promise<Result<void, CoreError>>
  healthCheck?(): Promise<Result<boolean, CoreError>>
}

// ---------------------------------------------------------------------------
// Lifecycle manager
// ---------------------------------------------------------------------------

export class RuntimeLifecycle {
  private readonly logger: Logger
  private readonly hooks = new Map<string, ServiceLifecycleHook>()

  constructor(
    private readonly registry: ServiceRegistry,
  ) {
    this.logger = createLogger("RuntimeLifecycle")
  }

  registerHook(hook: ServiceLifecycleHook): void {
    this.hooks.set(hook.id, hook)
  }

  /** Start all services in phase order. */
  async startServices(): Promise<Result<void, CoreError>> {
    const phases = this.registry.getByPhase()
    const sortedPhases = Array.from(phases.keys()).sort((a, b) => a - b)

    for (const phase of sortedPhases) {
      const services = phases.get(phase) ?? []
      this.logger.info(`Starting phase ${phase} services`, {
        services: services.map((s) => s.definition.id),
      })

      const results = await Promise.allSettled(
        services.map((service) => this.startService(service)),
      )

      for (let i = 0; i < results.length; i++) {
        const result = results[i]
        const service = services[i]
        if (result === undefined || service === undefined) continue
        if (result.status === "rejected") {
          this.registry.recordError(service.definition.id, String(result.reason))
          this.registry.markState(service.definition.id, "failed")
          if (service.definition.required) {
            return err(
              new CoreError("internal_error", `Required service failed to start: ${service.definition.id}`),
            )
          }
          this.logger.warn(`Optional service failed: ${service.definition.id}`)
        } else if (!result.value.ok) {
          this.registry.recordError(service.definition.id, result.value.error.message)
          this.registry.markState(service.definition.id, "failed")
          if (service.definition.required) {
            return err(result.value.error)
          }
          this.logger.warn(`Optional service failed: ${service.definition.id}`)
        }
      }
    }

    return ok(undefined)
  }

  private async startService(service: RuntimeServiceEntry): Promise<Result<void, CoreError>> {
    this.registry.markState(service.definition.id, "starting")
    const hook = this.hooks.get(service.definition.id)

    if (hook) {
      const result = await hook.start()
      if (!result.ok) {
        return result
      }
    }

    this.registry.markState(service.definition.id, "running")
    this.logger.info(`Service started: ${service.definition.id}`)
    return ok(undefined)
  }

  /** Stop all services in reverse phase order. */
  async stopServices(): Promise<Result<void, CoreError>> {
    const phases = this.registry.getByPhase()
    const sortedPhases = Array.from(phases.keys()).sort((a, b) => b - a)

    for (const phase of sortedPhases) {
      const services = phases.get(phase) ?? []
      this.logger.info(`Stopping phase ${phase} services`)

      await Promise.allSettled(
        services.map((service) => this.stopService(service)),
      )
    }

    return ok(undefined)
  }

  private async stopService(service: RuntimeServiceEntry): Promise<Result<void, CoreError>> {
    const hook = this.hooks.get(service.definition.id)
    if (hook) {
      const result = await hook.stop()
      if (!result.ok) {
        this.logger.error(`Service stop failed: ${service.definition.id}`, {
          error: result.error.message,
        })
      }
    }
    this.registry.markState(service.definition.id, "stopped")
    return ok(undefined)
  }

  /** Reload a single service (stop then start). */
  async reloadService(serviceId: string): Promise<Result<void, CoreError>> {
    const entry = this.registry.get(serviceId)
    if (!entry) {
      return err(new CoreError("worker_not_found", `Service not found: ${serviceId}`))
    }

    await this.stopService(entry)
    return this.startService(entry)
  }

  /** Check health of all services. */
  async checkHealth(): Promise<Result<Map<string, boolean>, CoreError>> {
    const results = new Map<string, boolean>()

    for (const entry of this.registry.getAll()) {
      const hook = this.hooks.get(entry.definition.id)
      if (hook?.healthCheck) {
        const result = await hook.healthCheck()
        results.set(entry.definition.id, result.ok ? result.value : false)
      } else {
        results.set(entry.definition.id, entry.state === "running" || entry.state === "ready")
      }
    }

    return ok(results)
  }
}
