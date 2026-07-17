/**
 * P05-SCH-RETRY — Retry Queue Tests
 *
 * Tests for retry scheduling, backoff computation, eligibility, and removal.
 */

import { describe, it, expect } from "vitest"
import { RetryQueue } from "./retries"
import { DEFAULT_RETRY_POLICY } from "./scheduler-types"
import type { RetryPolicy } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePolicy(overrides: Partial<RetryPolicy> = {}): RetryPolicy {
  return { ...DEFAULT_RETRY_POLICY, ...overrides }
}

// ---------------------------------------------------------------------------
// RetryQueue
// ---------------------------------------------------------------------------

describe("RetryQueue", () => {

  it("schedules a retry", () => {
    const queue = new RetryQueue(makePolicy({ delayMs: 1000 }))
    const entry = queue.scheduleRetry(
      "u1",
      1,
      "timeout",
      "timeout",
    )
    expect(entry).toBeDefined()
    expect(entry!.unitId).toBe("u1")
    expect(entry!.attempt).toBe(2)
  })

  it("rejects non-retryable category", () => {
    const queue = new RetryQueue(makePolicy())
    const entry = queue.scheduleRetry(
      "u1",
      1,
      "error",
      "permission_denied",
    )
    expect(entry).toBeUndefined()
  })

  it("rejects when max attempts exhausted", () => {
    const queue = new RetryQueue(makePolicy({ maxAttempts: 2 }))
    const entry = queue.scheduleRetry(
      "u1",
      2,
      "error",
      "timeout",
    )
    expect(entry).toBeUndefined()
  })

  it("computes exponential backoff", () => {
    const queue = new RetryQueue(
      makePolicy({ backoff: "exponential", delayMs: 1000 }),
    )
    expect(queue.computeDelay(1)).toBe(1000) // 1000 * 2^0
    expect(queue.computeDelay(2)).toBe(2000) // 1000 * 2^1
    expect(queue.computeDelay(3)).toBe(4000) // 1000 * 2^2
  })

  it("computes fixed backoff", () => {
    const queue = new RetryQueue(
      makePolicy({ backoff: "fixed", delayMs: 500 }),
    )
    expect(queue.computeDelay(1)).toBe(500)
    expect(queue.computeDelay(2)).toBe(500)
    expect(queue.computeDelay(3)).toBe(500)
  })

  it("computes no backoff", () => {
    const queue = new RetryQueue(makePolicy({ backoff: "none" }))
    expect(queue.computeDelay(1)).toBe(0)
    expect(queue.computeDelay(5)).toBe(0)
  })

  it("checks eligibility based on time", () => {
    const queue = new RetryQueue(makePolicy({ delayMs: 1000 }))
    queue.scheduleRetry("u1", 1, "error", "timeout")

    const entry = queue.getEntry("u1")!
    // nextEligibleAt = Date.now() + 1000
    // Not eligible before that time
    expect(queue.isEligible("u1", entry.nextEligibleAt - 1)).toBe(false)
    // Eligible at or after that time
    expect(queue.isEligible("u1", entry.nextEligibleAt)).toBe(true)
    expect(queue.isEligible("u1", entry.nextEligibleAt + 1)).toBe(true)
  })

  it("remove returns entry and removes it", () => {
    const queue = new RetryQueue(makePolicy())
    queue.scheduleRetry("u1", 1, "error", "timeout")

    const entry = queue.remove("u1")
    expect(entry).toBeDefined()
    expect(queue.size).toBe(0)
  })

  it("getEligible returns all eligible entries", () => {
    const queue = new RetryQueue(makePolicy({ delayMs: 1000 }))
    queue.scheduleRetry("u1", 1, "error", "timeout")
    queue.scheduleRetry("u2", 1, "error", "timeout")

    // Use a time far in the future to ensure all are eligible
    const farFuture = Date.now() + 100_000
    const eligible = queue.getEligible(farFuture)
    expect(eligible).toHaveLength(2)
  })

  it("size tracks entries", () => {
    const queue = new RetryQueue(makePolicy())
    expect(queue.size).toBe(0)

    queue.scheduleRetry("u1", 1, "error", "timeout")
    expect(queue.size).toBe(1)

    queue.remove("u1")
    expect(queue.size).toBe(0)
  })

  it("getAll returns all entries", () => {
    const queue = new RetryQueue(makePolicy())
    queue.scheduleRetry("u1", 1, "error", "timeout")
    queue.scheduleRetry("u2", 1, "error", "timeout")

    expect(queue.getAll()).toHaveLength(2)
  })

  it("clear removes all entries", () => {
    const queue = new RetryQueue(makePolicy())
    queue.scheduleRetry("u1", 1, "error", "timeout")
    queue.scheduleRetry("u2", 1, "error", "timeout")
    queue.clear()

    expect(queue.size).toBe(0)
  })

  it("getEntry returns specific entry", () => {
    const queue = new RetryQueue(makePolicy())
    queue.scheduleRetry("u1", 1, "error", "timeout")

    const entry = queue.getEntry("u1")
    expect(entry).toBeDefined()
    expect(entry!.unitId).toBe("u1")
  })

  it("getEntry returns undefined for unknown unit", () => {
    const queue = new RetryQueue(makePolicy())
    expect(queue.getEntry("unknown")).toBeUndefined()
  })
})
