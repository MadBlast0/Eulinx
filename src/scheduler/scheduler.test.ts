/**
 * P05-SCHEDULER — Main Scheduler Service Tests
 *
 * Tests for lifecycle (start/stop/pause/resume), enqueue, tick, cancel,
 * complete, fail, queue snapshot, and metrics integration.
 */

import { describe, it, expect, beforeEach } from "vitest"
import { Scheduler, DEFAULT_SCHEDULER_CONFIG } from "./scheduler"
import type { SchedulerConfig } from "./scheduler"
import type { SchedulingUnit } from "./scheduler-types"
import { createDefaultReadinessContext } from "./readiness"
import type { ReadinessContext } from "./readiness"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
  id: string,
  overrides: Partial<SchedulingUnit> = {},
): SchedulingUnit {
  return {
    id,
    kind: "task",
    workspaceId: "ws-1" as SchedulingUnit["workspaceId"],
    priority: "normal",
    dependencies: [],
    requiredPermissions: [],
    requiredLocks: [],
    state: "created",
    createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    updatedAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    ...overrides,
  }
}

function allPassContext(): ReadinessContext {
  return createDefaultReadinessContext()
}

function createScheduler(config?: Partial<SchedulerConfig>): Scheduler {
  return new Scheduler({
    ...DEFAULT_SCHEDULER_CONFIG,
    ...config,
  })
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe("Scheduler lifecycle", () => {
  let scheduler: Scheduler

  beforeEach(() => {
    scheduler = createScheduler()
  })

  it("starts in idle state", () => {
    expect(scheduler.state).toBe("idle")
  })

  it("starts successfully", () => {
    const result = scheduler.start()
    expect(result.ok).toBe(true)
    expect(scheduler.state).toBe("running")
  })

  it("rejects start when already running", () => {
    scheduler.start()
    const result = scheduler.start()
    expect(result.ok).toBe(false)
  })

  it("stops successfully", () => {
    scheduler.start()
    const result = scheduler.stop()
    expect(result.ok).toBe(true)
    expect(scheduler.state).toBe("stopped")
  })

  it("rejects stop when already stopped", () => {
    scheduler.stop()
    const result = scheduler.stop()
    expect(result.ok).toBe(false)
  })

  it("pauses successfully", () => {
    scheduler.start()
    const result = scheduler.pause("test")
    expect(result.ok).toBe(true)
    expect(scheduler.state).toBe("paused")
  })

  it("rejects pause when not running", () => {
    const result = scheduler.pause("test")
    expect(result.ok).toBe(false)
  })

  it("resumes successfully", () => {
    scheduler.start()
    scheduler.pause("test")
    const result = scheduler.resume()
    expect(result.ok).toBe(true)
    expect(scheduler.state).toBe("running")
  })

  it("rejects resume when not paused", () => {
    scheduler.start()
    const result = scheduler.resume()
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Enqueue
// ---------------------------------------------------------------------------

describe("Scheduler.enqueue", () => {
  let scheduler: Scheduler

  beforeEach(() => {
    scheduler = createScheduler()
    scheduler.start()
  })

  it("enqueues a unit successfully", () => {
    const unit = makeUnit("u1")
    const result = scheduler.enqueue(unit)
    expect(result.ok).toBe(true)
    expect(scheduler.getUnit("u1")).toBeDefined()
  })

  it("rejects duplicate enqueue", () => {
    scheduler.enqueue(makeUnit("u1"))
    const result = scheduler.enqueue(makeUnit("u1"))
    expect(result.ok).toBe(false)
  })

  it("rejects enqueue when stopped", () => {
    scheduler.stop()
    const result = scheduler.enqueue(makeUnit("u1"))
    expect(result.ok).toBe(false)
  })

  it("emits created and queued events", () => {
    const events: string[] = []
    scheduler.events.on("scheduler.unit.created", (e) => events.push(e.type))
    scheduler.events.on("scheduler.unit.queued", (e) => events.push(e.type))

    scheduler.enqueue(makeUnit("u1"))
    expect(events).toEqual(["scheduler.unit.created", "scheduler.unit.queued"])
  })
})

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

describe("Scheduler.tick", () => {
  let scheduler: Scheduler

  beforeEach(() => {
    scheduler = createScheduler()
    scheduler.start()
  })

  it("does nothing when not running", () => {
    scheduler.stop()
    // Enqueue is rejected when scheduler is stopped
    const result = scheduler.enqueue(makeUnit("u1"))
    expect(result.ok).toBe(false)
    scheduler.tick()
    // No unit was registered
    expect(scheduler.getUnit("u1")).toBeUndefined()
  })

  it("processes ready units through to running in one tick", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    // tick processes incoming → readiness check → dispatch in one pass
    const unit = scheduler.getUnit("u1")
    expect(unit?.state).toBe("running")
  })

  it("moves blocked units to wait queues", () => {
    scheduler.setReadinessContextProvider(() => ({
      ...allPassContext(),
      runtimeReady: false,
    }))
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    const unit = scheduler.getUnit("u1")
    expect(unit?.state).toBe("waiting_for_dependencies")
  })

  it("dispatches ready units to running", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    const unit = scheduler.getUnit("u1")
    expect(unit?.state).toBe("running")
    expect(scheduler.getRunningUnits()).toHaveLength(1)
  })

  it("respects concurrency limits", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    const s = createScheduler({ maxConcurrency: 2 })
    s.start()
    s.setReadinessContextProvider(() => allPassContext())

    s.enqueue(makeUnit("u1"))
    s.enqueue(makeUnit("u2"))
    s.enqueue(makeUnit("u3"))
    s.tick()

    expect(s.getRunningUnits()).toHaveLength(2)
    expect(s.getUnit("u3")?.state).toBe("ready")
  })

  it("does not re-evaluate units in wait queues when blocked", () => {
    scheduler.setReadinessContextProvider(() => ({
      ...allPassContext(),
      runtimeReady: false,
    }))
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()
    scheduler.tick()

    expect(scheduler.getUnit("u1")?.state).toBe("waiting_for_dependencies")
  })
})

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

describe("Scheduler.cancel", () => {
  let scheduler: Scheduler

  beforeEach(() => {
    scheduler = createScheduler()
    scheduler.start()
  })

  it("cancels a queued unit", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    const result = scheduler.cancel("u1", "user request")
    expect(result.ok).toBe(true)
    expect(scheduler.getUnit("u1")?.state).toBe("cancelled")
  })

  it("cancels a running unit", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    const result = scheduler.cancel("u1", "user request")
    expect(result.ok).toBe(true)
    expect(scheduler.getRunningUnits()).toHaveLength(0)
  })

  it("rejects cancel for nonexistent unit", () => {
    const result = scheduler.cancel("nonexistent", "test")
    expect(result.ok).toBe(false)
  })

  it("rejects cancel for terminal unit", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()
    scheduler.complete("u1")

    const result = scheduler.cancel("u1", "too late")
    expect(result.ok).toBe(false)
  })

  it("emits cancelled event", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    let cancelledPayload: unknown
    scheduler.events.on("scheduler.unit.cancelled", (e) => {
      cancelledPayload = e.payload
    })

    scheduler.cancel("u1", "user request")
    expect(cancelledPayload).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Complete / Fail
// ---------------------------------------------------------------------------

describe("Scheduler.complete", () => {
  let scheduler: Scheduler

  beforeEach(() => {
    scheduler = createScheduler()
    scheduler.start()
  })

  it("completes a running unit", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    const result = scheduler.complete("u1")
    expect(result.ok).toBe(true)
    expect(scheduler.getUnit("u1")?.state).toBe("completed")
    expect(scheduler.getRunningUnits()).toHaveLength(0)
  })

  it("rejects complete for non-running unit", () => {
    scheduler.enqueue(makeUnit("u1"))
    const result = scheduler.complete("u1")
    expect(result.ok).toBe(false)
  })
})

describe("Scheduler.fail", () => {
  let scheduler: Scheduler

  beforeEach(() => {
    scheduler = createScheduler()
    scheduler.start()
  })

  it("fails a running unit", () => {
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    const result = scheduler.fail("u1", "something broke")
    expect(result.ok).toBe(true)
    expect(scheduler.getUnit("u1")?.state).toBe("failed")
    expect(scheduler.getRunningUnits()).toHaveLength(0)
  })

  it("rejects fail for non-running unit", () => {
    scheduler.enqueue(makeUnit("u1"))
    const result = scheduler.fail("u1", "error")
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Queue Snapshot
// ---------------------------------------------------------------------------

describe("Scheduler.getQueueSnapshot", () => {
  it("returns empty snapshot for fresh scheduler", () => {
    const scheduler = createScheduler()
    const snapshot = scheduler.getQueueSnapshot()
    expect(snapshot.runningCount).toBe(0)
    expect(snapshot.totalBlocked).toBe(0)
    expect(Object.keys(snapshot.queues)).toHaveLength(12)
  })

  it("includes running units in snapshot", () => {
    const scheduler = createScheduler()
    scheduler.start()
    scheduler.setReadinessContextProvider(() => allPassContext())
    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    const snapshot = scheduler.getQueueSnapshot()
    expect(snapshot.runningCount).toBe(1)
    expect(snapshot.queues.running).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

describe("Scheduler metrics", () => {
  it("tracks metrics through lifecycle", () => {
    const scheduler = createScheduler()
    scheduler.start()
    scheduler.setReadinessContextProvider(() => allPassContext())

    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()
    scheduler.complete("u1")

    const metrics = scheduler.getMetrics()
    expect(metrics.runningCount).toBe(0)
  })

  it("tracks cancellations", () => {
    const scheduler = createScheduler()
    scheduler.start()
    scheduler.setReadinessContextProvider(() => allPassContext())

    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()
    scheduler.cancel("u1", "test")

    const metrics = scheduler.getMetrics()
    expect(metrics.cancellationCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe("Scheduler events", () => {
  it("emits lifecycle events", () => {
    const scheduler = createScheduler()
    const events: string[] = []

    scheduler.events.on("scheduler.started", (e) => events.push(e.type))
    scheduler.events.on("scheduler.stopped", (e) => events.push(e.type))
    scheduler.events.on("scheduler.paused", (e) => events.push(e.type))
    scheduler.events.on("scheduler.resumed", (e) => events.push(e.type))

    scheduler.start()
    scheduler.pause("test")
    scheduler.resume()
    scheduler.stop()

    expect(events).toEqual([
      "scheduler.started",
      "scheduler.paused",
      "scheduler.resumed",
      "scheduler.stopped",
    ])
  })

  it("emits unit lifecycle events", () => {
    const scheduler = createScheduler()
    scheduler.start()
    scheduler.setReadinessContextProvider(() => allPassContext())

    const events: string[] = []
    scheduler.events.on("scheduler.unit.created", (e) => events.push(e.type))
    scheduler.events.on("scheduler.unit.queued", (e) => events.push(e.type))
    scheduler.events.on("scheduler.unit.ready", (e) => events.push(e.type))
    scheduler.events.on("scheduler.unit.scheduled", (e) => events.push(e.type))
    scheduler.events.on("scheduler.unit.running", (e) => events.push(e.type))

    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    expect(events).toContain("scheduler.unit.created")
    expect(events).toContain("scheduler.unit.queued")
    expect(events).toContain("scheduler.unit.ready")
    expect(events).toContain("scheduler.unit.scheduled")
    expect(events).toContain("scheduler.unit.running")
  })

  it("emits blocked events for blocked units", () => {
    const scheduler = createScheduler()
    scheduler.start()
    scheduler.setReadinessContextProvider(() => ({
      ...allPassContext(),
      runtimeReady: false,
    }))

    const events: string[] = []
    scheduler.events.on("scheduler.unit.blocked", (e) => events.push(e.type))

    scheduler.enqueue(makeUnit("u1"))
    scheduler.tick()

    expect(events).toContain("scheduler.unit.blocked")
  })
})

// ---------------------------------------------------------------------------
// Multiple Units Integration
// ---------------------------------------------------------------------------

describe("Scheduler integration", () => {
  it("schedules multiple units respecting priority", () => {
    const scheduler = createScheduler({ maxConcurrency: 10 })
    scheduler.start()
    scheduler.setReadinessContextProvider(() => allPassContext())

    scheduler.enqueue(makeUnit("low", { priority: "low" }))
    scheduler.enqueue(makeUnit("critical", { priority: "critical" }))
    scheduler.enqueue(makeUnit("normal", { priority: "normal" }))
    scheduler.tick()

    const running = scheduler.getRunningUnits()
    expect(running).toHaveLength(3)
    // All should be running since maxConcurrency is 10
  })

  it("handles dependency blocking and unblocking", () => {
    const scheduler = createScheduler()
    scheduler.start()

    let ctx: ReadinessContext = {
      ...allPassContext(),
      completedUnitIds: new Set(),
    }
    scheduler.setReadinessContextProvider(() => ctx)

    scheduler.enqueue(makeUnit("dep"))
    scheduler.enqueue(makeUnit("u1", { dependencies: ["dep"] }))

    scheduler.tick()

    expect(scheduler.getUnit("dep")?.state).toBe("running")
    expect(scheduler.getUnit("u1")?.state).toBe("waiting_for_dependencies")

    // Complete the dependency
    scheduler.complete("dep")

    // Now the dependent should become ready
    ctx = {
      ...allPassContext(),
      completedUnitIds: new Set(["dep"]),
    }
    scheduler.tick()

    expect(scheduler.getUnit("u1")?.state).toBe("running")
  })

  it("handles full lifecycle: enqueue → tick → running → complete", () => {
    const scheduler = createScheduler()
    scheduler.start()
    scheduler.setReadinessContextProvider(() => allPassContext())

    scheduler.enqueue(makeUnit("u1"))
    expect(scheduler.getUnit("u1")?.state).toBe("queued")

    scheduler.tick()
    expect(scheduler.getUnit("u1")?.state).toBe("running")

    scheduler.complete("u1")
    expect(scheduler.getUnit("u1")?.state).toBe("completed")
    expect(scheduler.getRunningUnits()).toHaveLength(0)
  })
})
