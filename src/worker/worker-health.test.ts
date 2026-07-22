/**
 * P08-WORKER-HEALTH — Worker Health Tests
 */

import { describe, it, expect } from "vitest"
import type { WorkerId } from "@/core/types"
import {
  HeartbeatTracker,
  StallDetector,
  evaluateWorkerHealth,
  WorkerHealthMonitor,
} from "./worker-health"

function wid(id: string): WorkerId { return id as unknown as WorkerId }

describe("HeartbeatTracker", () => {
  it("records heartbeats", () => {
    const tracker = new HeartbeatTracker()
    tracker.recordHeartbeat(wid("w_1"), 1)
    tracker.recordHeartbeat(wid("w_1"), 2)

    expect(tracker.getHistory(wid("w_1")).length).toBe(2)
  })

  it("detects timed out workers", () => {
    const tracker = new HeartbeatTracker({ intervalMs: 1000, maxMissed: 1 })
    // No heartbeat recorded — should be timed out
    expect(tracker.isTimedOut(wid("w_1"))).toBe(true)
  })
})

describe("StallDetector", () => {
  it("detects stalls in working state", () => {
    const detector = new StallDetector({ workingStallMs: -1 })
    detector.recordStateEntry(wid("w_1"))

    const result = detector.checkStall(wid("w_1"), "working")
    expect(result.stalled).toBe(true)
    expect(result.reason).toContain("stalled")
  })

  it("does not stall in non-tracked states", () => {
    const detector = new StallDetector()
    detector.recordStateEntry(wid("w_1"))

    const result = detector.checkStall(wid("w_1"), "spawning")
    expect(result.stalled).toBe(false)
  })
})

describe("evaluateWorkerHealth", () => {
  it("returns healthy for idle workers", () => {
    expect(evaluateWorkerHealth({
      missedHeartbeats: 0,
      isStalled: false,
      hasError: false,
      isProcessAlive: true,
      state: "idle",
    })).toBe("healthy")
  })

  it("returns busy for working workers", () => {
    expect(evaluateWorkerHealth({
      missedHeartbeats: 0,
      isStalled: false,
      hasError: false,
      isProcessAlive: true,
      state: "working",
    })).toBe("busy")
  })

  it("returns stalled for stalled workers", () => {
    expect(evaluateWorkerHealth({
      missedHeartbeats: 0,
      isStalled: true,
      hasError: false,
      isProcessAlive: true,
      state: "working",
    })).toBe("stalled")
  })

  it("returns failed for errored workers", () => {
    expect(evaluateWorkerHealth({
      missedHeartbeats: 0,
      isStalled: false,
      hasError: true,
      isProcessAlive: true,
      state: "working",
    })).toBe("failed")
  })

  it("returns terminated for dead processes", () => {
    expect(evaluateWorkerHealth({
      missedHeartbeats: 0,
      isStalled: false,
      hasError: false,
      isProcessAlive: false,
      state: "working",
    })).toBe("terminated")
  })

  it("returns unsafe for many missed heartbeats", () => {
    expect(evaluateWorkerHealth({
      missedHeartbeats: 5,
      isStalled: false,
      hasError: false,
      isProcessAlive: true,
      state: "idle",
    })).toBe("unsafe")
  })
})

describe("WorkerHealthMonitor", () => {
  it("combines heartbeat and stall detection", () => {
    const monitor = new WorkerHealthMonitor(
      { intervalMs: 1000, maxMissed: 3, timeoutMs: 3000 },
      { workingStallMs: -1 },
    )

    monitor.recordStateEntry(wid("w_1"))
    const result = monitor.evaluateHealth(wid("w_1"), "working", true)
    expect(result.health).toBe("stalled")
  })

  it("tracks unhealthy workers", () => {
    const monitor = new WorkerHealthMonitor()
    monitor.evaluateHealth(wid("w_1"), "idle", true)
    monitor.evaluateHealth(wid("w_2"), "working", true, true)

    const unhealthy = monitor.getUnhealthyWorkers()
    expect(unhealthy.some(u => u.workerId === "w_2")).toBe(true)
  })
})
