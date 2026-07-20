/**
 * P19-OBS-PERF — Performance / Frame Budget Tests
 *
 * Docs (`Docs/16-testing`, PerformanceTesting) mandate a 60fps / 16ms frame
 * budget and a benchmark harness. These tests exercise the `withinBudget`
 * helpers and `PerformanceMonitor`. Thresholds are deliberately generous and
 * we measure rather than assert exact timings, so the suite stays fast and
 * non-flaky across CI hardware.
 */

import { describe, it, expect } from "vitest"
import {
  PerformanceMonitor,
  withinBudget,
  withinBudgetAsync,
  FRAME_BUDGET_MS,
} from "./performance"

describe("frame budget", () => {
  it("exposes the 60fps budget (~16.67ms)", () => {
    expect(FRAME_BUDGET_MS).toBeCloseTo(16.67, 1)
  })

  it("reports a trivial operation as within the frame budget", () => {
    const result = withinBudget(FRAME_BUDGET_MS, () => {
      let sum = 0
      for (let i = 0; i < 1_000; i++) sum += i
      return sum
    })

    expect(result.value).toBe(499_500)
    expect(result.budgetMs).toBe(FRAME_BUDGET_MS)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    // A tight 1k-iteration loop must comfortably fit one frame.
    expect(result.ok).toBe(true)
  })

  it("flags an operation that exceeds a tiny budget without throwing", () => {
    // Use an impossibly small budget so the busy loop always overruns it.
    const start = Date.now()
    const result = withinBudget(0.0001, () => {
      while (Date.now() - start < 2) {
        /* burn ~2ms */
      }
      return "done"
    })

    expect(result.value).toBe("done")
    expect(result.ok).toBe(false)
    expect(result.durationMs).toBeGreaterThan(result.budgetMs)
  })

  it("measures async operations", async () => {
    const result = await withinBudgetAsync(1_000, async () => {
      await new Promise((r) => setTimeout(r, 5))
      return 42
    })

    expect(result.value).toBe(42)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    // 5ms sleep against a 1s budget is always within budget.
    expect(result.ok).toBe(true)
  })

  it("completes many measured operations under a generous total budget", () => {
    const total = withinBudget(500, () => {
      const results: boolean[] = []
      for (let i = 0; i < 100; i++) {
        results.push(withinBudget(FRAME_BUDGET_MS, () => Math.sqrt(i)).ok)
      }
      return results
    })

    expect(total.value).toHaveLength(100)
    expect(total.ok).toBe(true)
  })
})

describe("PerformanceMonitor", () => {
  it("collects a metrics snapshot and tracks history", () => {
    const monitor = new PerformanceMonitor()
    const metrics = monitor.collect()

    expect(metrics.heapUsedMb).toBeGreaterThanOrEqual(0)
    expect(metrics.timestamp).toBeTruthy()
    expect(monitor.getLatest()).toEqual(metrics)
    expect(monitor.getHistory()).toHaveLength(1)
  })

  it("computes averages over recent history", () => {
    const monitor = new PerformanceMonitor()
    monitor.collect()
    monitor.collect()
    monitor.collect()

    const averages = monitor.getAverages(3)
    expect(averages.heapUsedMb).toBeGreaterThanOrEqual(0)
    expect(averages.rssMb).toBeGreaterThanOrEqual(0)
  })

  it("clears history", () => {
    const monitor = new PerformanceMonitor()
    monitor.collect()
    expect(monitor.getHistory().length).toBeGreaterThan(0)
    monitor.clear()
    expect(monitor.getHistory()).toHaveLength(0)
    expect(monitor.getLatest()).toBeUndefined()
  })
})
