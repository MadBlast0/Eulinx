/**
 * P05-SCH-EVENTS — Scheduler Events Tests
 *
 * Tests for the SchedulerEventEmitter and event types.
 */

import { describe, it, expect, vi } from "vitest"
import { SchedulerEventEmitter } from "./scheduler-events"
import type { SchedulerEvent } from "./scheduler-events"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent<T extends SchedulerEvent["type"]>(
  type: T,
  payload: Extract<SchedulerEvent, { type: T }>["payload"],
): SchedulerEvent {
  return { type, payload } as SchedulerEvent
}

// ---------------------------------------------------------------------------
// SchedulerEventEmitter
// ---------------------------------------------------------------------------

describe("SchedulerEventEmitter", () => {
  it("emits events to subscribers", () => {
    const emitter = new SchedulerEventEmitter()
    const handler = vi.fn()
    emitter.on("scheduler.started", handler)

    const event = makeEvent("scheduler.started", {
      maxConcurrency: 8,
      timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    })
    emitter.emit(event)

    expect(handler).toHaveBeenCalledWith(event)
  })

  it("does not emit to wrong type subscribers", () => {
    const emitter = new SchedulerEventEmitter()
    const handler = vi.fn()
    emitter.on("scheduler.stopped", handler)

    emitter.emit(
      makeEvent("scheduler.started", {
        maxConcurrency: 8,
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      }),
    )

    expect(handler).not.toHaveBeenCalled()
  })

  it("supports multiple subscribers", () => {
    const emitter = new SchedulerEventEmitter()
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    emitter.on("scheduler.started", handler1)
    emitter.on("scheduler.started", handler2)

    emitter.emit(
      makeEvent("scheduler.started", {
        maxConcurrency: 8,
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      }),
    )

    expect(handler1).toHaveBeenCalledOnce()
    expect(handler2).toHaveBeenCalledOnce()
  })

  it("unsubscribe removes handler", () => {
    const emitter = new SchedulerEventEmitter()
    const handler = vi.fn()
    const unsubscribe = emitter.on("scheduler.started", handler)

    unsubscribe()
    emitter.emit(
      makeEvent("scheduler.started", {
        maxConcurrency: 8,
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      }),
    )

    expect(handler).not.toHaveBeenCalled()
  })

  it("removeAllListeners clears all", () => {
    const emitter = new SchedulerEventEmitter()
    const handler1 = vi.fn()
    const handler2 = vi.fn()
    emitter.on("scheduler.started", handler1)
    emitter.on("scheduler.stopped", handler2)

    emitter.removeAllListeners()
    emitter.emit(
      makeEvent("scheduler.started", {
        maxConcurrency: 8,
        timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      }),
    )

    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })
})
