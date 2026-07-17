/**
 * P05-SCH-DEAD — Dead Queue Tests
 *
 * Tests for dead entry storage, retrieval, filtering, and max size enforcement.
 */

import { describe, it, expect } from "vitest"
import { DeadQueue } from "./dead-queue"
import type { DeadEntry } from "./dead-queue"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeadEntry(id: string, overrides: Partial<DeadEntry> = {}): DeadEntry {
  return {
    unitId: id,
    kind: "task",
    priority: "normal",
    lastError: "test error",
    failureCategory: "unknown_error",
    attemptCount: 1,
    enteredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// DeadQueue
// ---------------------------------------------------------------------------

describe("DeadQueue", () => {
  it("adds and retrieves entries", () => {
    const queue = new DeadQueue()
    queue.add(makeDeadEntry("u1"))
    expect(queue.get("u1")).toBeDefined()
    expect(queue.size).toBe(1)
  })

  it("contains checks existence", () => {
    const queue = new DeadQueue()
    queue.add(makeDeadEntry("u1"))
    expect(queue.contains("u1")).toBe(true)
    expect(queue.contains("u2")).toBe(false)
  })

  it("remove returns and removes entry", () => {
    const queue = new DeadQueue()
    queue.add(makeDeadEntry("u1"))
    const removed = queue.remove("u1")
    expect(removed).toBeDefined()
    expect(queue.size).toBe(0)
  })

  it("getAll returns sorted by entry time", () => {
    const queue = new DeadQueue()
    queue.add(makeDeadEntry("u1", { enteredAt: "2025-01-01T00:00:00Z" }))
    queue.add(makeDeadEntry("u2", { enteredAt: "2025-01-01T00:00:01Z" }))
    queue.add(makeDeadEntry("u3", { enteredAt: "2025-01-01T00:00:00Z" }))

    const all = queue.getAll()
    expect(all).toHaveLength(3)
    expect(all[0]!.unitId).toBe("u1")
    expect(all[1]!.unitId).toBe("u3")
    expect(all[2]!.unitId).toBe("u2")
  })

  it("getByCategory filters correctly", () => {
    const queue = new DeadQueue()
    queue.add(makeDeadEntry("u1", { failureCategory: "timeout" }))
    queue.add(makeDeadEntry("u2", { failureCategory: "lock_timeout" }))
    queue.add(makeDeadEntry("u3", { failureCategory: "timeout" }))

    const timeouts = queue.getByCategory("timeout")
    expect(timeouts).toHaveLength(2)
    expect(timeouts.map((e) => e.unitId)).toEqual(["u1", "u3"])
  })

  it("clear removes all entries", () => {
    const queue = new DeadQueue()
    queue.add(makeDeadEntry("u1"))
    queue.add(makeDeadEntry("u2"))
    queue.clear()
    expect(queue.size).toBe(0)
  })

  it("enforces max size by dropping oldest", () => {
    const queue = new DeadQueue()
    // Fill to max (1000 from SCHEDULER.DEAD_LETTER_MAX_SIZE)
    for (let i = 0; i < 1001; i++) {
      queue.add(makeDeadEntry(`u${i}`))
    }
    expect(queue.size).toBe(1000)
    // Oldest (u0) should have been dropped
    expect(queue.contains("u0")).toBe(false)
    expect(queue.contains("u1")).toBe(true)
  })

  it("overwrites existing entry with same id", () => {
    const queue = new DeadQueue()
    queue.add(makeDeadEntry("u1", { lastError: "first error" }))
    queue.add(makeDeadEntry("u1", { lastError: "second error" }))
    expect(queue.size).toBe(1)
    expect(queue.get("u1")!.lastError).toBe("second error")
  })
})
