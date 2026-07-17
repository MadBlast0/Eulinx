import { describe, it, expect } from "vitest"
import { EventQueue } from "./event-queue"
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

describe("EventQueue", () => {
  describe("core queue", () => {
    it("enqueues and dequeues events in order", () => {
      const queue = new EventQueue("core", 10)
      const evt1 = createTestEvent("worker.spawned", 1)
      const evt2 = createTestEvent("worker.ready", 2)

      queue.push(evt1)
      queue.push(evt2)

      expect(queue.length).toBe(2)
      expect(queue.pop()?.event.sequence).toBe(1)
      expect(queue.pop()?.event.sequence).toBe(2)
      expect(queue.length).toBe(0)
    })

    it("returns undefined when empty", () => {
      const queue = new EventQueue("core", 10)
      expect(queue.pop()).toBeUndefined()
    })

    it("tracks stats", () => {
      const queue = new EventQueue("core", 5)
      queue.push(createTestEvent("a", 1))
      queue.push(createTestEvent("b", 2))

      const stats = queue.stats
      expect(stats.depth).toBe(2)
      expect(stats.capacity).toBe(5)
      expect(stats.totalEnqueued).toBe(2)
      expect(stats.totalDropped).toBe(0)
    })
  })

  describe("plugin queue", () => {
    it("drops oldest on full", () => {
      const queue = new EventQueue("plugin", 3)
      queue.push(createTestEvent("a", 1))
      queue.push(createTestEvent("b", 2))
      queue.push(createTestEvent("c", 3))

      const dropped = queue.push(createTestEvent("d", 4))
      expect(dropped).toBeDefined()
      expect(dropped?.type).toBe("a")
      expect(queue.length).toBe(3)
      expect(queue.stats.totalDropped).toBe(1)
    })

    it("tryPush fails on full", () => {
      const queue = new EventQueue("plugin", 2)
      queue.push(createTestEvent("a", 1))
      queue.push(createTestEvent("b", 2))

      const result = queue.tryPush(createTestEvent("c", 3))
      expect(result.success).toBe(true)
      expect(result.dropped).toBeDefined()
      expect(queue.length).toBe(2)
    })
  })

  describe("drain", () => {
    it("removes and returns all entries", () => {
      const queue = new EventQueue("core", 10)
      queue.push(createTestEvent("a", 1))
      queue.push(createTestEvent("b", 2))

      const drained = queue.drain()
      expect(drained.length).toBe(2)
      expect(queue.length).toBe(0)
    })
  })

  describe("oldestAgeMs", () => {
    it("returns undefined for empty queue", () => {
      const queue = new EventQueue("core", 10)
      expect(queue.oldestAgeMs()).toBeUndefined()
    })

    it("returns age for non-empty queue", () => {
      const queue = new EventQueue("core", 10)
      queue.push(createTestEvent("a", 1))
      const age = queue.oldestAgeMs()
      expect(age).toBeGreaterThanOrEqual(0)
    })
  })
})
