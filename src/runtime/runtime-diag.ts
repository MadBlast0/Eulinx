/**
 * P02-RUNTIME-DIAG — Runtime Diagnostics
 *
 * Structured diagnostic information for debugging, logging, and UI display.
 * From RuntimeManager-Part06: diagnostics commands.
 */

import type { RuntimeState } from "./runtime-state"
import type { RuntimeHealthSnapshot, OverallHealth } from "./runtime-health"
import type { RuntimeServiceEntry } from "./service-registry"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Diagnostic entry
// ---------------------------------------------------------------------------

export interface DiagnosticEntry {
  readonly timestamp: string
  readonly level: "info" | "warn" | "error"
  readonly category: string
  readonly message: string
  readonly details?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Runtime diagnostics
// ---------------------------------------------------------------------------

export interface RuntimeDiagnostics {
  readonly startedAt?: string
  readonly uptimeMs: number
  readonly runtimeState: RuntimeState
  readonly overallHealth: OverallHealth
  readonly serviceCount: number
  readonly healthyServiceCount: number
  readonly failedServiceCount: number
  readonly activeWorkerCount: number
  readonly activeExecutionCount: number
  readonly recentEvents: readonly DiagnosticEntry[]
}

// ---------------------------------------------------------------------------
// Diagnostics collector
// ---------------------------------------------------------------------------

export class RuntimeDiagnosticsCollector {
  private readonly logger: Logger
  private readonly events: DiagnosticEntry[] = []
  private readonly maxEvents: number
  private startedAt?: string

  constructor(maxEvents = 200) {
    this.logger = createLogger("RuntimeDiag")
    this.maxEvents = maxEvents
  }

  markStarted(): void {
    this.startedAt = new Date().toISOString()
    this.record("info", "startup", "Runtime started")
  }

  record(level: DiagnosticEntry["level"], category: string, message: string, details?: Record<string, unknown>): void {
    const entry: DiagnosticEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
    }
    this.events.push(entry)
    if (this.events.length > this.maxEvents) {
      this.events.shift()
    }
    this.logger[level](`[${category}] ${message}`, details)
  }

  info(category: string, message: string, details?: Record<string, unknown>): void {
    this.record("info", category, message, details)
  }

  warn(category: string, message: string, details?: Record<string, unknown>): void {
    this.record("warn", category, message, details)
  }

  error(category: string, message: string, details?: Record<string, unknown>): void {
    this.record("error", category, message, details)
  }

  /** Build a full diagnostics snapshot. */
  collect(
    runtimeState: RuntimeState,
    health: RuntimeHealthSnapshot,
    services: readonly RuntimeServiceEntry[],
  ): RuntimeDiagnostics {
    const now = Date.now()
    const startedAtMs = this.startedAt ? new Date(this.startedAt).getTime() : now

    return {
      startedAt: this.startedAt,
      uptimeMs: now - startedAtMs,
      runtimeState,
      overallHealth: health.overallStatus,
      serviceCount: services.length,
      healthyServiceCount: services.filter((s) => s.state === "ready" || s.state === "running").length,
      failedServiceCount: services.filter((s) => s.state === "failed").length,
      activeWorkerCount: health.activeWorkerCount,
      activeExecutionCount: health.activeExecutionCount,
      recentEvents: [...this.events].slice(-50),
    }
  }

  getEvents(): readonly DiagnosticEntry[] {
    return [...this.events]
  }

  clearEvents(): void {
    this.events.length = 0
  }
}
