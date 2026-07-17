/**
 * P05-SCH-METRICS — Metrics Collector Tests
 *
 * Tests for metrics tracking, rolling averages, throughput, and reset.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { MetricsCollector } from "./metrics"

// ---------------------------------------------------------------------------
// MetricsCollector
// ---------------------------------------------------------------------------

describe("MetricsCollector", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts with zero metrics", () => {
    const metrics = new MetricsCollector()
    const snapshot = metrics.getMetrics()
    expect(snapshot.blockedCount).toBe(0)
    expect(snapshot.retryCount).toBe(0)
    expect(snapshot.cancellationCount).toBe(0)
    expect(snapshot.runningCount).toBe(0)
    expect(snapshot.totalProcessed).toBe(0)
    expect(snapshot.throughputPerMinute).toBe(0)
  })

  it("records queue lengths", () => {
    const metrics = new MetricsCollector()
    metrics.setQueueLength("runnable", 5)
    metrics.setQueueLength("running", 3)

    const snapshot = metrics.getMetrics()
    expect(snapshot.queueLengths.runnable).toBe(5)
    expect(snapshot.queueLengths.running).toBe(3)
  })

  it("computes average wait time", () => {
    const metrics = new MetricsCollector()
    metrics.recordWaitTime(100)
    metrics.recordWaitTime(200)
    metrics.recordWaitTime(300)

    const snapshot = metrics.getMetrics()
    expect(snapshot.averageWaitTimeMs).toBe(200)
  })

  it("computes average run time", () => {
    const metrics = new MetricsCollector()
    metrics.recordRunTime(500)
    metrics.recordRunTime(1500)

    const snapshot = metrics.getMetrics()
    expect(snapshot.averageRunTimeMs).toBe(1000)
  })

  it("tracks blocked count", () => {
    const metrics = new MetricsCollector()
    metrics.incrementBlocked()
    metrics.incrementBlocked()
    metrics.incrementBlocked()
    metrics.decrementBlocked()

    expect(metrics.getMetrics().blockedCount).toBe(2)
  })

  it("decrement does not go below zero", () => {
    const metrics = new MetricsCollector()
    metrics.decrementBlocked()
    expect(metrics.getMetrics().blockedCount).toBe(0)
  })

  it("tracks retry count", () => {
    const metrics = new MetricsCollector()
    metrics.incrementRetry()
    metrics.incrementRetry()

    expect(metrics.getMetrics().retryCount).toBe(2)
  })

  it("tracks cancellation count", () => {
    const metrics = new MetricsCollector()
    metrics.incrementCancellation()

    expect(metrics.getMetrics().cancellationCount).toBe(1)
  })

  it("tracks running count", () => {
    const metrics = new MetricsCollector()
    metrics.setRunningCount(5)
    expect(metrics.getMetrics().runningCount).toBe(5)
  })

  it("computes throughput within window", () => {
    const metrics = new MetricsCollector()

    // Record completions
    metrics.recordCompleted()
    metrics.recordCompleted()
    metrics.recordCompleted()

    const snapshot = metrics.getMetrics()
    expect(snapshot.throughputPerMinute).toBe(3)
  })

  it("prunes old completions from throughput window", () => {
    const metrics = new MetricsCollector()

    metrics.recordCompleted()
    // Advance past the throughput window (60s)
    vi.advanceTimersByTime(61_000)
    metrics.recordCompleted()

    const snapshot = metrics.getMetrics()
    expect(snapshot.throughputPerMinute).toBe(1)
  })

  it("tracks total processed", () => {
    const metrics = new MetricsCollector()
    metrics.setRunningCount(3)
    metrics.recordCompleted()
    metrics.recordCompleted()

    const snapshot = metrics.getMetrics()
    expect(snapshot.totalProcessed).toBe(5)
  })

  it("resets all metrics", () => {
    const metrics = new MetricsCollector()
    metrics.setQueueLength("runnable", 5)
    metrics.recordWaitTime(100)
    metrics.incrementBlocked()
    metrics.incrementRetry()
    metrics.recordCompleted()

    metrics.reset()

    const snapshot = metrics.getMetrics()
    expect(snapshot.queueLengths.runnable).toBe(0)
    expect(snapshot.averageWaitTimeMs).toBe(0)
    expect(snapshot.blockedCount).toBe(0)
    expect(snapshot.retryCount).toBe(0)
    expect(snapshot.totalProcessed).toBe(0)
  })

  it("rolls wait time window to 1000 samples", () => {
    const metrics = new MetricsCollector()
    for (let i = 0; i < 1500; i++) {
      metrics.recordWaitTime(i)
    }

    const snapshot = metrics.getMetrics()
    // Average should be from last 1000 samples (500-1499)
    const expectedAvg = (500 + 1499) / 2
    expect(snapshot.averageWaitTimeMs).toBeCloseTo(expectedAvg, 0)
  })
})
