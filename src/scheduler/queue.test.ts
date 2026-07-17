/**
 * P05-SCH-QUEUE — JobQueue Tests
 *
 * Tests for MinHeap ordering, JobQueue operations (enqueue, dequeue, remove,
 * peek, findByKind, findByPriority, findHighestPriority, clear).
 */

import { describe, it, expect } from "vitest"
import { MinHeap, JobQueue } from "./queue"
import type { SchedulingUnit } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
  id: string,
  priority: SchedulingUnit["priority"] = "normal",
  overrides: Partial<SchedulingUnit> = {},
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
    createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    updatedAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// MinHeap Tests
// ---------------------------------------------------------------------------

describe("MinHeap", () => {
  it("starts empty", () => {
    const heap = new MinHeap()
    expect(heap.size).toBe(0)
    expect(heap.isEmpty).toBe(true)
    expect(heap.peek()).toBeUndefined()
    expect(heap.extractMin()).toBeUndefined()
  })

  it("inserts and extracts a single element", () => {
    const heap = new MinHeap()
    const unit = makeUnit("u1", "normal")
    heap.insert(unit, 0)
    expect(heap.size).toBe(1)
    expect(heap.peek()).toBe(unit)
    expect(heap.extractMin()).toBe(unit)
    expect(heap.size).toBe(0)
  })

  it("orders by priority: critical before high before normal", () => {
    const heap = new MinHeap()
    const normal = makeUnit("normal", "normal")
    const critical = makeUnit("critical", "critical")
    const high = makeUnit("high", "high")

    heap.insert(normal, 0)
    heap.insert(critical, 1)
    heap.insert(high, 2)

    expect(heap.extractMin()!.id).toBe("critical")
    expect(heap.extractMin()!.id).toBe("high")
    expect(heap.extractMin()!.id).toBe("normal")
  })

  it("orders same priority by FIFO insertion order", () => {
    const heap = new MinHeap()
    const first = makeUnit("first", "normal")
    const second = makeUnit("second", "normal")
    const third = makeUnit("third", "normal")

    heap.insert(first, 0)
    heap.insert(second, 1)
    heap.insert(third, 2)

    expect(heap.extractMin()!.id).toBe("first")
    expect(heap.extractMin()!.id).toBe("second")
    expect(heap.extractMin()!.id).toBe("third")
  })

  it("handles reverse insertion order", () => {
    const heap = new MinHeap()
    heap.insert(makeUnit("c", "critical"), 0)
    heap.insert(makeUnit("b", "high"), 1)
    heap.insert(makeUnit("a", "normal"), 2)

    expect(heap.extractMin()!.id).toBe("c")
    expect(heap.extractMin()!.id).toBe("b")
    expect(heap.extractMin()!.id).toBe("a")
  })

  it("remove removes a specific element", () => {
    const heap = new MinHeap()
    heap.insert(makeUnit("a", "normal"), 0)
    heap.insert(makeUnit("b", "normal"), 1)
    heap.insert(makeUnit("c", "normal"), 2)

    const removed = heap.remove("b")
    expect(removed!.id).toBe("b")
    expect(heap.size).toBe(2)

    const remaining = heap.toArray()
    expect(remaining.map((u) => u.id)).toEqual(["a", "c"])
  })

  it("remove returns undefined for nonexistent id", () => {
    const heap = new MinHeap()
    heap.insert(makeUnit("a"), 0)
    expect(heap.remove("nonexistent")).toBeUndefined()
  })

  it("toArray returns sorted order", () => {
    const heap = new MinHeap()
    heap.insert(makeUnit("low", "low"), 0)
    heap.insert(makeUnit("crit", "critical"), 1)
    heap.insert(makeUnit("norm", "normal"), 2)
    heap.insert(makeUnit("high", "high"), 3)

    const sorted = heap.toArray()
    expect(sorted.map((u) => u.id)).toEqual(["crit", "high", "norm", "low"])
  })

  it("clear empties the heap", () => {
    const heap = new MinHeap()
    heap.insert(makeUnit("a"), 0)
    heap.insert(makeUnit("b"), 1)
    heap.clear()
    expect(heap.size).toBe(0)
    expect(heap.isEmpty).toBe(true)
  })

  it("handles interleaved insert and extractMin", () => {
    const heap = new MinHeap()
    heap.insert(makeUnit("a", "normal"), 0)
    expect(heap.extractMin()!.id).toBe("a")
    heap.insert(makeUnit("b", "high"), 1)
    expect(heap.extractMin()!.id).toBe("b")
    expect(heap.isEmpty).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// JobQueue Tests
// ---------------------------------------------------------------------------

describe("JobQueue", () => {
  it("starts empty", () => {
    const q = new JobQueue()
    expect(q.size).toBe(0)
    expect(q.isEmpty).toBe(true)
  })

  it("enqueue and dequeue", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("u1"))
    expect(q.size).toBe(1)
    expect(q.dequeue()!.id).toBe("u1")
    expect(q.size).toBe(0)
  })

  it("dequeues in priority order", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("normal", "normal"))
    q.enqueue(makeUnit("critical", "critical"))
    q.enqueue(makeUnit("low", "low"))
    q.enqueue(makeUnit("high", "high"))

    expect(q.dequeue()!.id).toBe("critical")
    expect(q.dequeue()!.id).toBe("high")
    expect(q.dequeue()!.id).toBe("normal")
    expect(q.dequeue()!.id).toBe("low")
  })

  it("dequeues same priority in FIFO order", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("first", "normal"))
    q.enqueue(makeUnit("second", "normal"))
    q.enqueue(makeUnit("third", "normal"))

    expect(q.dequeue()!.id).toBe("first")
    expect(q.dequeue()!.id).toBe("second")
    expect(q.dequeue()!.id).toBe("third")
  })

  it("remove removes by id", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("a"))
    q.enqueue(makeUnit("b"))
    q.enqueue(makeUnit("c"))

    const removed = q.remove("b")
    expect(removed!.id).toBe("b")
    expect(q.size).toBe(2)
    expect(q.toArray().map((u) => u.id)).toEqual(["a", "c"])
  })

  it("contains checks existence", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("a"))
    expect(q.contains("a")).toBe(true)
    expect(q.contains("b")).toBe(false)
  })

  it("findByKind filters correctly", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("t1", "normal", { kind: "task" }))
    q.enqueue(makeUnit("w1", "normal", { kind: "worker_spawn" }))
    q.enqueue(makeUnit("t2", "normal", { kind: "task" }))

    const tasks = q.findByKind("task")
    expect(tasks).toHaveLength(2)
    expect(tasks.map((u) => u.id)).toEqual(["t1", "t2"])
  })

  it("findByPriority filters correctly", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("c1", "critical"))
    q.enqueue(makeUnit("n1", "normal"))
    q.enqueue(makeUnit("c2", "critical"))
    q.enqueue(makeUnit("h1", "high"))

    const criticals = q.findByPriority("critical")
    expect(criticals).toHaveLength(2)
    expect(criticals.map((u) => u.id)).toEqual(["c1", "c2"])
  })

  it("findHighestPriority returns top priority unit", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("low", "low"))
    q.enqueue(makeUnit("critical", "critical"))
    q.enqueue(makeUnit("normal", "normal"))

    expect(q.findHighestPriority()!.id).toBe("critical")
  })

  it("findHighestPriority returns undefined when empty", () => {
    const q = new JobQueue()
    expect(q.findHighestPriority()).toBeUndefined()
  })

  it("peek does not remove", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("a"))
    expect(q.peek()!.id).toBe("a")
    expect(q.size).toBe(1)
  })

  it("clear empties the queue", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("a"))
    q.enqueue(makeUnit("b"))
    q.clear()
    expect(q.isEmpty).toBe(true)
  })

  it("dequeue from empty returns undefined", () => {
    const q = new JobQueue()
    expect(q.dequeue()).toBeUndefined()
  })

  it("toArray returns sorted units", () => {
    const q = new JobQueue()
    q.enqueue(makeUnit("bg", "background"))
    q.enqueue(makeUnit("crit", "critical"))
    q.enqueue(makeUnit("norm", "normal"))

    expect(q.toArray().map((u) => u.id)).toEqual(["crit", "norm", "bg"])
  })
})
