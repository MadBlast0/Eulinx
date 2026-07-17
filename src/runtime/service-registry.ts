/**
 * P02-RUNTIME-REGISTRY — Service Registry
 *
 * Catalog of runtime services with dependency ordering, startup phases, and health tracking.
 * From RuntimeManager-Part02: services start in dependency order across 5 phases.
 */

import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { Logger } from "@/core/logger"
import { createLogger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Service definition
// ---------------------------------------------------------------------------

export type ServiceState = "registered" | "starting" | "ready" | "running" | "degraded" | "stopped" | "failed"

export interface RuntimeServiceDefinition {
  readonly id: string
  readonly name: string
  readonly required: boolean
  readonly phase: number
  readonly dependencies: readonly string[]
}

export interface RuntimeServiceEntry {
  readonly definition: RuntimeServiceDefinition
  state: ServiceState
  lastHeartbeatAt?: string
  lastError?: string
  startedAt?: string
  stoppedAt?: string
  metrics?: Record<string, number>
}

// ---------------------------------------------------------------------------
// Service health
// ---------------------------------------------------------------------------

export interface RuntimeServiceHealth {
  readonly serviceId: string
  readonly serviceName: string
  readonly state: ServiceState
  readonly required: boolean
  readonly lastHeartbeatAt?: string
  readonly lastError?: string
  readonly metrics?: Record<string, number>
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export class ServiceRegistry {
  private readonly services = new Map<string, RuntimeServiceEntry>()
  private readonly logger: Logger

  constructor() {
    this.logger = createLogger("ServiceRegistry")
  }

  register(definition: RuntimeServiceDefinition): Result<void, CoreError> {
    if (this.services.has(definition.id)) {
      return err(new CoreError("validation_error", `Service already registered: ${definition.id}`))
    }

    const entry: RuntimeServiceEntry = {
      definition,
      state: "registered",
    }
    this.services.set(definition.id, entry)
    this.logger.debug(`Registered service: ${definition.id} (phase ${definition.phase}, required=${definition.required})`)
    return ok(undefined)
  }

  unregister(serviceId: string): Result<void, CoreError> {
    if (!this.services.has(serviceId)) {
      return err(new CoreError("worker_not_found", `Service not found: ${serviceId}`))
    }
    this.services.delete(serviceId)
    return ok(undefined)
  }

  get(serviceId: string): RuntimeServiceEntry | undefined {
    return this.services.get(serviceId)
  }

  has(serviceId: string): boolean {
    return this.services.has(serviceId)
  }

  getAll(): readonly RuntimeServiceEntry[] {
    return Array.from(this.services.values())
  }

  /** Get services grouped by startup phase. */
  getByPhase(): Map<number, RuntimeServiceEntry[]> {
    const phases = new Map<number, RuntimeServiceEntry[]>()
    for (const entry of this.services.values()) {
      const phase = entry.definition.phase
      const list = phases.get(phase) ?? []
      list.push(entry)
      phases.set(phase, list)
    }
    return phases
  }

  /** Check if all dependencies of a service are ready. */
  areDependenciesReady(serviceId: string): boolean {
    const entry = this.services.get(serviceId)
    if (!entry) return false

    for (const depId of entry.definition.dependencies) {
      const dep = this.services.get(depId)
      if (!dep || (dep.state !== "ready" && dep.state !== "running")) {
        return false
      }
    }
    return true
  }

  /** Get services whose dependencies are all satisfied. */
  getReadyToStart(): RuntimeServiceEntry[] {
    return this.getAll().filter(
      (e) => e.state === "registered" && this.areDependenciesReady(e.definition.id),
    )
  }

  markState(serviceId: string, state: ServiceState): Result<void, CoreError> {
    const entry = this.services.get(serviceId)
    if (!entry) {
      return err(new CoreError("worker_not_found", `Service not found: ${serviceId}`))
    }
    entry.state = state
    if (state === "running" || state === "ready") {
      entry.startedAt = new Date().toISOString()
      entry.lastHeartbeatAt = new Date().toISOString()
    }
    if (state === "stopped" || state === "failed") {
      entry.stoppedAt = new Date().toISOString()
    }
    return ok(undefined)
  }

  heartbeat(serviceId: string): Result<void, CoreError> {
    const entry = this.services.get(serviceId)
    if (!entry) {
      return err(new CoreError("worker_not_found", `Service not found: ${serviceId}`))
    }
    entry.lastHeartbeatAt = new Date().toISOString()
    return ok(undefined)
  }

  recordError(serviceId: string, message: string): void {
    const entry = this.services.get(serviceId)
    if (entry) {
      entry.lastError = message
    }
  }

  setMetrics(serviceId: string, metrics: Record<string, number>): void {
    const entry = this.services.get(serviceId)
    if (entry) {
      entry.metrics = { ...entry.metrics, ...metrics }
    }
  }

  /** Compute health snapshot for all services. */
  getHealthSnapshot(): RuntimeServiceHealth[] {
    return this.getAll().map((entry) => ({
      serviceId: entry.definition.id,
      serviceName: entry.definition.name,
      state: entry.state,
      required: entry.definition.required,
      lastHeartbeatAt: entry.lastHeartbeatAt,
      lastError: entry.lastError,
      metrics: entry.metrics,
    }))
  }

  /** Check if all required services are healthy. */
  allRequiredHealthy(): boolean {
    return this.getAll()
      .filter((e) => e.definition.required)
      .every((e) => e.state === "ready" || e.state === "running")
  }

  /** Get required services that are not healthy. */
  getUnhealthyRequired(): RuntimeServiceEntry[] {
    return this.getAll().filter(
      (e) => e.definition.required && e.state !== "ready" && e.state !== "running",
    )
  }

  clear(): void {
    this.services.clear()
  }
}
