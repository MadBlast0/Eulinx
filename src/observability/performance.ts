/**
 * P19-OBS-PERF — Performance Monitoring
 *
 * System performance metrics: CPU, memory, event loop, GC.
 * From RuntimeManager-Part01 §Runtime Diagnostics.
 */

import type { PerformanceMetrics } from "./observability-types"

// ---------------------------------------------------------------------------
// Performance Monitor
// ---------------------------------------------------------------------------

export class PerformanceMonitor {
  private readonly history: PerformanceMetrics[] = []
  private readonly maxHistory = 1_000
  private intervalId: ReturnType<typeof setInterval> | null = null

  /**
   * Collect current performance metrics.
   */
  collect(): PerformanceMetrics {
    const mem = process.memoryUsage()
    const metrics: PerformanceMetrics = {
      uptime: process.uptime(),
      cpuUsagePercent: this.getCpuUsage(),
      memoryUsageMb: Math.round(mem.heapUsed / 1024 / 1024),
      eventLoopLagMs: 0,
      activeHandles: (process as any)._getActiveHandles?.()?.length ?? 0,
      activeRequests: (process as any)._getActiveRequests?.()?.length ?? 0,
      gcPauseMs: 0,
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
      rssMb: Math.round(mem.rss / 1024 / 1024),
      timestamp: new Date().toISOString() as any,
    }
    this.history.push(metrics)
    if (this.history.length > this.maxHistory) {
      this.history.shift()
    }
    return metrics
  }

  /**
   * Start periodic collection.
   */
  start(intervalMs: number = 10_000): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => this.collect(), intervalMs)
  }

  /**
   * Stop periodic collection.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Get the latest metrics.
   */
  getLatest(): PerformanceMetrics | undefined {
    return this.history[this.history.length - 1]
  }

  /**
   * Get metrics history.
   */
  getHistory(): PerformanceMetrics[] {
    return this.history
  }

  /**
   * Get average metrics over recent history.
   */
  getAverages(count: number = 10): Partial<PerformanceMetrics> {
    const recent = this.history.slice(-count)
    if (recent.length === 0) return {}

    return {
      cpuUsagePercent: this.avg(recent.map((m) => m.cpuUsagePercent)),
      memoryUsageMb: Math.round(this.avg(recent.map((m) => m.memoryUsageMb))),
      eventLoopLagMs: this.avg(recent.map((m) => m.eventLoopLagMs)),
      heapUsedMb: Math.round(this.avg(recent.map((m) => m.heapUsedMb))),
      rssMb: Math.round(this.avg(recent.map((m) => m.rssMb))),
    }
  }

  /**
   * Clear history.
   */
  clear(): void {
    this.history.length = 0
  }

  private getCpuUsage(): number {
    const cpus = process.cpuUsage()
    return ((cpus.user + cpus.system) / 1_000_000) * 100
  }

  private avg(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((a, b) => a + b, 0) / values.length
  }
}
