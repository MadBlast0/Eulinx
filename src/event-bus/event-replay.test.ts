/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest"
import { ReplayBus } from "./event-replay"
import type { EulinxEventUnion } from "./event-types"
import type { WorkspaceId } from "@/core/types"

function createTestEvent(type: string, sequence: number): EulinxEventUnion {
  return {
    eventId: `evt_${sequence}`,
    sequence,
    type,
    payload: {},
    source: { service: "RuntimeManager" },
    workspaceId: "ws_test" as WorkspaceId,
    replayGrade: true,
    emittedAt: new Date().toISOString(),
  } as EulinxEventUnion
}

describe("ReplayBus", () => {
  it("loads events and detects gaps", () => {
    const bus = new ReplayBus()
    const events = [
      createTestEvent("worker.spawned", 1),
      createTestEvent("worker.ready", 2),
      createTestEvent("worker.completed", 5), // gap: 3, 4 missing
    ]

    const result = bus.load(events, "replay_1")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.handle.isPartial).toBe(true)
      expect(result.handle.gapRanges.length).toBe(1)
      expect(result.handle.gapRanges[0]!.fromSequence).toBe(3)
      expect(result.handle.gapRanges[0]!.toSequence).toBe(4)
    }
  })

  it("loads events without gaps", () => {
    const bus = new ReplayBus()
    const events = [
      createTestEvent("worker.spawned", 1),
      createTestEvent("worker.ready", 2),
      createTestEvent("worker.completed", 3),
    ]

    const result = bus.load(events, "replay_1")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.handle.isPartial).toBe(false)
      expect(result.handle.gapRanges.length).toBe(0)
    }
  })

  it("fails on empty events", () => {
    const bus = new ReplayBus()
    const result = bus.load([], "replay_1")
    expect(result.ok).toBe(false)
  })

  it("delivers events to subscribers during play", () => {
    const bus = new ReplayBus()
    const events = [
      createTestEvent("worker.spawned", 1),
      createTestEvent("worker.ready", 2),
      createTestEvent("worker.completed", 3),
    ]

    bus.load(events, "replay_1")

    const received: EulinxEventUnion[] = []
    bus.subscribe({
      subscriptionId: "sub_1",
      handler: (event) => received.push(event),
      filter: { topics: ["worker.*"] },
    })

    bus.play()

    expect(received.length).toBe(3)
    expect(received[0]!.type).toBe("worker.spawned")
    expect(received[1]!.type).toBe("worker.ready")
    expect(received[2]!.type).toBe("worker.completed")
  })

  it("filters events by topic pattern", () => {
    const bus = new ReplayBus()
    const events = [
      createTestEvent("worker.spawned", 1),
      createTestEvent("merge.applied", 2),
      createTestEvent("worker.ready", 3),
    ]

    bus.load(events, "replay_1")

    const received: EulinxEventUnion[] = []
    bus.subscribe({
      subscriptionId: "sub_1",
      handler: (event) => received.push(event),
      filter: { topics: ["worker.*"] },
    })

    bus.play()

    expect(received.length).toBe(2)
    expect(received[0]!.type).toBe("worker.spawned")
    expect(received[1]!.type).toBe("worker.ready")
  })

  it("delivers events in sequence order (globally ordered)", () => {
    const bus = new ReplayBus()
    const events = [
      createTestEvent("merge.applied", 3),
      createTestEvent("worker.spawned", 1),
      createTestEvent("worker.completed", 2),
    ]

    bus.load(events, "replay_1")

    const received: EulinxEventUnion[] = []
    bus.subscribe({
      subscriptionId: "sub_1",
      handler: (event) => received.push(event),
      filter: { topics: ["*"] },
    })

    bus.play()

    expect(received.map((e) => e.sequence)).toEqual([1, 2, 3])
  })

  it("has no publish method (structural safety)", () => {
    const bus = new ReplayBus()
    expect((bus as unknown as Record<string, unknown>).publish).toBeUndefined()
  })

  it("pause and resume work", () => {
    const bus = new ReplayBus()
    const events = [
      createTestEvent("worker.spawned", 1),
      createTestEvent("worker.ready", 2),
      createTestEvent("worker.completed", 3),
    ]

    bus.load(events, "replay_1")
    bus.pause()
    const handle = bus.getHandle()
    expect(handle?.state).toBe("ready") // can't pause before play

    bus.play()
    expect(bus.getHandle()?.state).toBe("completed")
  })

  it("reset clears all state", () => {
    const bus = new ReplayBus()
    bus.load([createTestEvent("worker.spawned", 1)], "replay_1")
    bus.subscribe({
      subscriptionId: "sub_1",
      handler: () => {},
      filter: { topics: ["*"] },
    })

    bus.reset()
    expect(bus.getHandle()).toBeNull()
    expect(bus.getEvents().length).toBe(0)
  })
})
