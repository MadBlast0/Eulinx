/**
 * P19-OBS-HEALTH — Health Check System
 *
 * System health checks: liveness, readiness, dependency checks.
 * From RuntimeManager-Part01 §Runtime Health.
 */

import type { HealthCheckResult, HealthSnapshot, HealthStatus } from "./observability-types"

// ---------------------------------------------------------------------------
// Health Check Function
// ---------------------------------------------------------------------------

export type HealthCheckFn = () => Promise<HealthCheckResult> | HealthCheckResult

// ---------------------------------------------------------------------------
// Health Monitor
// ---------------------------------------------------------------------------

export class HealthMonitor {
  private readonly checks = new Map<string, { name: string; fn: HealthCheckFn }>()
  private readonly history = new Map<string, HealthCheckResult[]>()
  private maxHistory = 100

  /**
   * Register a health check.
   */
  register(name: string, fn: HealthCheckFn): void {
    this.checks.set(name, { name, fn })
  }

  /**
   * Unregister a health check.
   */
  unregister(name: string): void {
    this.checks.delete(name)
    this.history.delete(name)
  }

  /**
   * Run all health checks and return a snapshot.
   */
  async check(): Promise<HealthSnapshot> {
    const results: HealthCheckResult[] = []

    for (const [, check] of this.checks) {
      const start = Date.now()
      try {
        const result = await check.fn()
        results.push(result)
        this.recordHistory(check.name, result)
      } catch (error) {
        const errorResult: HealthCheckResult = {
          name: check.name,
          status: "unhealthy",
          message: error instanceof Error ? error.message : String(error),
          durationMs: Date.now() - start,
          checkedAt: new Date().toISOString() as any,
        }
        results.push(errorResult)
        this.recordHistory(check.name, errorResult)
      }
    }

    const overallStatus = this.computeOverallStatus(results)
    const mem = process.memoryUsage()

    return {
      status: overallStatus,
      checks: results,
      uptime: process.uptime(),
      version: "0.0.1",
      nodeVersion: process.version,
      platform: `${process.platform} ${process.arch}`,
      memoryUsage: {
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        rssBytes: mem.rss,
        externalBytes: mem.external,
      },
      timestamp: new Date().toISOString() as any,
    }
  }

  /**
   * Get history for a specific check.
   */
  getHistory(name: string): HealthCheckResult[] {
    return this.history.get(name) ?? []
  }

  private recordHistory(name: string, result: HealthCheckResult): void {
    const history = this.history.get(name) ?? []
    history.push(result)
    if (history.length > this.maxHistory) {
      history.shift()
    }
    this.history.set(name, history)
  }

  private computeOverallStatus(results: readonly HealthCheckResult[]): HealthStatus {
    if (results.some((r) => r.status === "unhealthy")) return "unhealthy"
    if (results.some((r) => r.status === "degraded")) return "degraded"
    return "healthy"
  }
}

// ---------------------------------------------------------------------------
// Built-in Checks
// ---------------------------------------------------------------------------

export function createMemoryCheck(thresholdPercent: number = 80): HealthCheckFn {
  return () => {
    const mem = process.memoryUsage()
    const percent = (mem.heapUsed / mem.heapTotal) * 100
    const status: HealthStatus = percent > thresholdPercent ? "degraded" : "healthy"
    return {
      name: "memory",
      status,
      message: `Heap usage: ${percent.toFixed(1)}%`,
      durationMs: 0,
      checkedAt: new Date().toISOString() as any,
      details: { heapUsed: mem.heapUsed, heapTotal: mem.heapTotal, percent },
    }
  }
}

export function createUptimeCheck(): HealthCheckFn {
  return () => ({
    name: "uptime",
    status: "healthy",
    message: `Uptime: ${Math.round(process.uptime())}s`,
    durationMs: 0,
    checkedAt: new Date().toISOString() as any,
  })
}
