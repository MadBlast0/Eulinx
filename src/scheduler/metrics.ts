/**
 * P05-SCH-METRICS — Scheduler Metrics & Observability
 *
 * Tracks scheduling metrics for UI display, replay integration, and
 * debugging (Scheduler-Part07 §Metrics).
 */

import type { QueueKind, SchedulingState, SchedulerQueueSnapshot, QueueSnapshotEntry } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Scheduler Metrics
// ---------------------------------------------------------------------------

export interface SchedulerMetrics {
  /** Number of units in each queue. */
  readonly queueLengths: Readonly<Record<QueueKind, number>>
  /** Average wait time from creation to first ready state (ms). */
  readonly averageWaitTimeMs: number
  /** Average run time from scheduled to completed (ms). */
  readonly averageRunTimeMs: number
  /** Total number of currently blocked units. */
  readonly blockedCount: number
  /** Total retry count. */
  readonly retryCount: number
  /** Total cancellation count. */
  readonly cancellationCount: number
  /** Throughput: units completed per minute. */
  readonly throughputPerMinute: number
  /** Number of currently running units. */
  readonly runningCount: number
  /** Total units ever processed. */
  readonly totalProcessed: number
}

// ---------------------------------------------------------------------------
// Metrics Collector
// ---------------------------------------------------------------------------

export class MetricsCollector {
  private readonly queueLengths = new Map<QueueKind, number>()
  private waitTimes: number[] = []
  private runTimes: number[] = []
  private blockedCount = 0
  private retryCount = 0
  private cancellationCount = 0
  private totalCompleted = 0
  private totalScheduled = 0
  private completedTimestamps: number[] = []
  private runningCount = 0

  private static readonly THROUGHPUT_WINDOW_MS = 60_000

  /** Update the count for a specific queue. */
  setQueueLength(queue: QueueKind, length: number): void {
    this.queueLengths.set(queue, length)
  }

  /** Record a wait time (creation → ready). */
  recordWaitTime(ms: number): void {
    this.waitTimes.push(ms)
    // Keep last 1000 samples for rolling average
    if (this.waitTimes.length > 1000) {
      this.waitTimes = this.waitTimes.slice(-1000)
    }
  }

  /** Record a run time (scheduled → completed). */
  recordRunTime(ms: number): void {
    this.runTimes.push(ms)
    if (this.runTimes.length > 1000) {
      this.runTimes = this.runTimes.slice(-1000)
    }
  }

  /** Increment blocked count. */
  incrementBlocked(): void {
    this.blockedCount++
  }

  /** Decrement blocked count. */
  decrementBlocked(): void {
    this.blockedCount = Math.max(0, this.blockedCount - 1)
  }

  /** Increment retry count. */
  incrementRetry(): void {
    this.retryCount++
  }

  /** Increment cancellation count. */
  incrementCancellation(): void {
    this.cancellationCount++
  }

  /** Record a completed unit. */
  recordCompleted(): void {
    this.totalCompleted++
    this.completedTimestamps.push(Date.now())
    // Prune old timestamps outside the throughput window
    const cutoff = Date.now() - MetricsCollector.THROUGHPUT_WINDOW_MS
    while (this.completedTimestamps.length > 0) {
      const first = this.completedTimestamps[0]
      if (first === undefined || first >= cutoff) break
      this.completedTimestamps.shift()
    }
  }

  /** Record a scheduled unit. */
  recordScheduled(): void {
    this.totalScheduled++
  }

  /** Update running count. */
  setRunningCount(count: number): void {
    this.runningCount = count
  }

  /** Get current metrics snapshot. */
  getMetrics(): SchedulerMetrics {
    const queueLengths: Record<QueueKind, number> = {
      incoming: 0,
      dependency_wait: 0,
      permission_wait: 0,
      approval_wait: 0,
      lock_wait: 0,
      budget_wait: 0,
      runnable: 0,
      running: 0,
      retry: 0,
      cancelled: 0,
      completed: 0,
      failed: 0,
    }
    for (const [key, value] of this.queueLengths) {
      queueLengths[key] = value
    }

    const now = Date.now()
    const cutoff = now - MetricsCollector.THROUGHPUT_WINDOW_MS
    const recentCompleted = this.completedTimestamps.filter((t) => t >= cutoff)

    return {
      queueLengths,
      averageWaitTimeMs: this.average(this.waitTimes),
      averageRunTimeMs: this.average(this.runTimes),
      blockedCount: this.blockedCount,
      retryCount: this.retryCount,
      cancellationCount: this.cancellationCount,
      throughputPerMinute: recentCompleted.length,
      runningCount: this.runningCount,
      totalProcessed: this.totalCompleted + this.runningCount,
    }
  }

  reset(): void {
    this.queueLengths.clear()
    this.waitTimes = []
    this.runTimes = []
    this.blockedCount = 0
    this.retryCount = 0
    this.cancellationCount = 0
    this.totalCompleted = 0
    this.totalScheduled = 0
    this.completedTimestamps = []
    this.runningCount = 0
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }
}

// ---------------------------------------------------------------------------
// Queue Snapshot Builder
// ---------------------------------------------------------------------------

/**
 * Build a SchedulerQueueSnapshot from internal state.
 */
export function buildQueueSnapshot(
  queues: Readonly<Record<QueueKind, readonly { id: string; kind: string; priority: string; state: SchedulingState; createdAt: string }[]>>,
  runningCount: number,
): SchedulerQueueSnapshot {
  const now = Date.now()
  const snapshotQueues: Record<QueueKind, QueueSnapshotEntry[]> = {
    incoming: [],
    dependency_wait: [],
    permission_wait: [],
    approval_wait: [],
    lock_wait: [],
    budget_wait: [],
    runnable: [],
    running: [],
    retry: [],
    cancelled: [],
    completed: [],
    failed: [],
  }

  let totalBlocked = 0

  for (const [key, units] of Object.entries(queues)) {
    const queueKind = key as QueueKind
    for (const unit of units) {
      const entry: QueueSnapshotEntry = {
        unitId: unit.id,
        kind: unit.kind as QueueSnapshotEntry["kind"],
        priority: unit.priority as QueueSnapshotEntry["priority"],
        state: unit.state,
        queuedAt: unit.createdAt as QueueSnapshotEntry["queuedAt"],
        ageMs: now - new Date(unit.createdAt).getTime(),
      }
      snapshotQueues[queueKind].push(entry)
      if (queueKind.endsWith("_wait")) {
        totalBlocked++
      }
    }
  }

  return {
    queues: snapshotQueues,
    runningCount,
    totalBlocked,
    timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
  }
}
