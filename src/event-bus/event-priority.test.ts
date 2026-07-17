import { describe, it, expect } from "vitest"
import { EventPriorityQueue, EVENT_PRIORITY_MAP } from "./event-priority"
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

describe("EVENT_PRIORITY_MAP", () => {
  it("has critical priority for invariant violations", () => {
    expect(EVENT_PRIORITY_MAP["runtime.invariant_violated"]).toBe("critical")
    expect(EVENT_PRIORITY_MAP["eventbus.log_write_failed"]).toBe("critical")
  })

  it("has high priority for state changes", () => {
    expect(EVENT_PRIORITY_MAP["worker.spawned"]).toBe("high")
    expect(EVENT_PRIORITY_MAP["worker.completed"]).toBe("high")
    expect(EVENT_PRIORITY_MAP["merge.applied"]).toBe("high")
    expect(EVENT_PRIORITY_MAP["permission.granted"]).toBe("high")
  })

  it("has low priority for high-frequency events", () => {
    expect(EVENT_PRIORITY_MAP["worker.output_streamed"]).toBe("low")
    expect(EVENT_PRIORITY_MAP["process.output_streamed"]).toBe("low")
    expect(EVENT_PRIORITY_MAP["execution.progress_reported"]).toBe("low")
  })
})

describe("EventPriorityQueue", () => {
  it("dequeues by priority (critical before low)", () => {
    const queue = new EventPriorityQueue()
    queue.enqueue(createTestEvent("worker.output_streamed", 1)) // low
    queue.enqueue(createTestEvent("runtime.invariant_violated", 2)) // critical
    queue.enqueue(createTestEvent("worker.spawned", 3)) // high

    const first = queue.dequeue()
    expect(first?.type).toBe("runtime.invariant_violated")

    const second = queue.dequeue()
    expect(second?.type).toBe("worker.spawned")

    const third = queue.dequeue()
    expect(third?.type).toBe("worker.output_streamed")
  })

  it("within same priority, dequeues by sequence", () => {
    const queue = new EventPriorityQueue()
    queue.enqueue(createTestEvent("worker.spawned", 5)) // high, seq 5
    queue.enqueue(createTestEvent("worker.ready", 3)) // high, seq 3
    queue.enqueue(createTestEvent("worker.completed", 4)) // high, seq 4

    expect(queue.dequeue()?.sequence).toBe(3)
    expect(queue.dequeue()?.sequence).toBe(4)
    expect(queue.dequeue()?.sequence).toBe(5)
  })

  it("drain returns all events in priority order", () => {
    const queue = new EventPriorityQueue()
    queue.enqueue(createTestEvent("worker.output_streamed", 1)) // low
    queue.enqueue(createTestEvent("runtime.invariant_violated", 2)) // critical
    queue.enqueue(createTestEvent("worker.spawned", 3)) // high

    const events = queue.drain()
    expect(events.map((e) => e.type)).toEqual([
      "runtime.invariant_violated",
      "worker.spawned",
      "worker.output_streamed",
    ])
  })

  it("reports length and isEmpty", () => {
    const queue = new EventPriorityQueue()
    expect(queue.isEmpty).toBe(true)
    expect(queue.length).toBe(0)

    queue.enqueue(createTestEvent("a", 1))
    expect(queue.isEmpty).toBe(false)
    expect(queue.length).toBe(1)

    queue.dequeue()
    expect(queue.isEmpty).toBe(true)
  })

  it("dequeue returns undefined when empty", () => {
    const queue = new EventPriorityQueue()
    expect(queue.dequeue()).toBeUndefined()
  })

  it("peek returns without removing", () => {
    const queue = new EventPriorityQueue()
    queue.enqueue(createTestEvent("runtime.invariant_violated", 1))

    expect(queue.peek()?.type).toBe("runtime.invariant_violated")
    expect(queue.length).toBe(1)
  })
})
