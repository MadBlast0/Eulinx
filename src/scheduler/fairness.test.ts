/**
 * P05-SCH-FAIR — Fairness Tests
 *
 * Tests for priority aging, round-robin distribution, and concurrency caps.
 */

import { describe, it, expect } from "vitest"
import {
  computeAgedPriority,
  computeFairnessScore,
  RoundRobinDistributor,
  ConcurrencyTracker,
  DEFAULT_FAIRNESS_CONFIG,
} from "./fairness"
import type { SchedulingUnit } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
  id: string,
  priority: SchedulingUnit["priority"] = "normal",
  createdAt: string = new Date().toISOString(),
): SchedulingUnit {
  return {
    id,
    kind: "task",
    workspaceId: "ws-1" as SchedulingUnit["workspaceId"],
    priority,
    dependencies: [],
    requiredPermissions: [],
    requiredLocks: [],
    state: "queued",
    createdAt: createdAt as import("@/core/types").IsoTimestamp,
    updatedAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
  }
}

// ---------------------------------------------------------------------------
// Priority Aging
// ---------------------------------------------------------------------------

describe("computeAgedPriority", () => {
  it("returns same priority with zero wait", () => {
    expect(computeAgedPriority("normal", 0)).toBe("normal")
  })

  it("ages low to normal after one interval", () => {
    expect(
      computeAgedPriority("low", DEFAULT_FAIRNESS_CONFIG.agingIntervalMs),
    ).toBe("normal")
  })

  it("ages background to normal after two intervals", () => {
    expect(
      computeAgedPriority(
        "background",
        DEFAULT_FAIRNESS_CONFIG.agingIntervalMs * 2,
      ),
    ).toBe("normal")
  })

  it("never ages above critical", () => {
    expect(
      computeAgedPriority("critical", DEFAULT_FAIRNESS_CONFIG.agingIntervalMs * 5),
    ).toBe("critical")
  })

  it("caps aging at maxAgingLevels", () => {
    const longWait = DEFAULT_FAIRNESS_CONFIG.agingIntervalMs * 100
    // background → low → normal → high (3 levels max), cannot reach critical
    expect(
      computeAgedPriority("background", longWait),
    ).toBe("high")
  })
})

// ---------------------------------------------------------------------------
// Fairness Score
// ---------------------------------------------------------------------------

describe("computeFairnessScore", () => {
  it("returns lower score for higher priority", () => {
    const now = Date.now()
    const critUnit = makeUnit("c", "critical")
    const lowUnit = makeUnit("l", "low")

    expect(computeFairnessScore(critUnit, now)).toBeLessThan(
      computeFairnessScore(lowUnit, now),
    )
  })

  it("aged low-priority scores better than fresh low-priority", () => {
    const now = Date.now()
    const freshLow = makeUnit("fresh", "low", new Date(now).toISOString())
    const agedLow = makeUnit(
      "aged",
      "low",
      new Date(now - DEFAULT_FAIRNESS_CONFIG.agingIntervalMs * 3).toISOString(),
    )

    expect(computeFairnessScore(agedLow, now)).toBeLessThan(
      computeFairnessScore(freshLow, now),
    )
  })
})

// ---------------------------------------------------------------------------
// Round-Robin Distributor
// ---------------------------------------------------------------------------

describe("RoundRobinDistributor", () => {
  it("returns undefined when no groups registered", () => {
    const rr = new RoundRobinDistributor<string>()
    expect(rr.next()).toBeUndefined()
  })

  it("round-robins through groups", () => {
    const rr = new RoundRobinDistributor<string>()
    rr.register("a")
    rr.register("b")
    rr.register("c")

    expect(rr.next()).toBe("a")
    expect(rr.next()).toBe("b")
    expect(rr.next()).toBe("c")
    expect(rr.next()).toBe("a")
  })

  it("unregisters a group", () => {
    const rr = new RoundRobinDistributor<string>()
    rr.register("a")
    rr.register("b")
    rr.unregister("a")

    expect(rr.next()).toBe("b")
    expect(rr.getActiveGroups()).toEqual(["b"])
  })

  it("tracks counts per group", () => {
    const rr = new RoundRobinDistributor<string>()
    rr.register("a")
    rr.increment("a")
    rr.increment("a")

    expect(rr.getCount("a")).toBe(2)
  })

  it("decrements group count", () => {
    const rr = new RoundRobinDistributor<string>()
    rr.register("a")
    rr.increment("a")
    rr.decrement("a")

    expect(rr.getCount("a")).toBe(0)
  })

  it("does not go below zero on decrement", () => {
    const rr = new RoundRobinDistributor<string>()
    rr.register("a")
    rr.decrement("a")
    expect(rr.getCount("a")).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Concurrency Tracker
// ---------------------------------------------------------------------------

describe("ConcurrencyTracker", () => {
  it("allows scheduling within limits", () => {
    const tracker = new ConcurrencyTracker()
    const config = { maxPerGroup: 2, maxPerWorkspace: 4 }

    expect(tracker.canSchedule("group-1", "ws-1", config)).toBe(true)
  })

  it("blocks when group limit reached", () => {
    const tracker = new ConcurrencyTracker()
    const config = { maxPerGroup: 2, maxPerWorkspace: 4 }

    tracker.acquire("group-1", "ws-1")
    tracker.acquire("group-1", "ws-1")
    expect(tracker.canSchedule("group-1", "ws-1", config)).toBe(false)
  })

  it("blocks when workspace limit reached", () => {
    const tracker = new ConcurrencyTracker()
    const config = { maxPerGroup: 10, maxPerWorkspace: 2 }

    tracker.acquire("g1", "ws-1")
    tracker.acquire("g2", "ws-1")
    expect(tracker.canSchedule("g3", "ws-1", config)).toBe(false)
  })

  it("tracks counts correctly", () => {
    const tracker = new ConcurrencyTracker()

    tracker.acquire("g1", "ws-1")
    tracker.acquire("g1", "ws-1")
    tracker.acquire("g2", "ws-1")

    expect(tracker.getGroupCount("g1")).toBe(2)
    expect(tracker.getGroupCount("g2")).toBe(1)
    expect(tracker.getWorkspaceCount("ws-1")).toBe(3)
  })

  it("releases correctly", () => {
    const tracker = new ConcurrencyTracker()
    const config = { maxPerGroup: 10, maxPerWorkspace: 10 }

    tracker.acquire("g1", "ws-1")
    tracker.release("g1", "ws-1")

    expect(tracker.getGroupCount("g1")).toBe(0)
    expect(tracker.getWorkspaceCount("ws-1")).toBe(0)
    expect(tracker.canSchedule("g1", "ws-1", config)).toBe(true)
  })

  it("resets all counts", () => {
    const tracker = new ConcurrencyTracker()

    tracker.acquire("g1", "ws-1")
    tracker.acquire("g2", "ws-1")
    tracker.reset()

    expect(tracker.getGroupCount("g1")).toBe(0)
    expect(tracker.getWorkspaceCount("ws-1")).toBe(0)
  })
})
