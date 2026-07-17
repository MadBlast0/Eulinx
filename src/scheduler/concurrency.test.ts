/**
 * P05-SCH-CONCUR — Concurrency Control Tests
 *
 * Tests for slot acquisition, release, kind tracking, and capacity limits.
 */

import { describe, it, expect } from "vitest"
import { ConcurrencyLimiter } from "./concurrency"

// ---------------------------------------------------------------------------
// ConcurrencyLimiter
// ---------------------------------------------------------------------------

describe("ConcurrencyLimiter", () => {
  it("acquires slot when under limit", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 5 })
    expect(limiter.acquire("u1", "task")).toBe(true)
    expect(limiter.runningCount).toBe(1)
  })

  it("rejects when at limit", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 2 })
    limiter.acquire("u1", "task")
    limiter.acquire("u2", "task")
    expect(limiter.acquire("u3", "task")).toBe(false)
    expect(limiter.runningCount).toBe(2)
  })

  it("releases slot", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 5 })
    limiter.acquire("u1", "task")
    limiter.release("u1")
    expect(limiter.runningCount).toBe(0)
    expect(limiter.acquire("u2", "task")).toBe(true)
  })

  it("release is idempotent", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 5 })
    limiter.acquire("u1", "task")
    limiter.release("u1")
    limiter.release("u1") // should not go negative
    expect(limiter.runningCount).toBe(0)
  })

  it("canAcquire checks without consuming", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 2 })
    expect(limiter.canAcquire("task")).toBe(true)
    limiter.acquire("u1", "task")
    expect(limiter.canAcquire("task")).toBe(true)
    limiter.acquire("u2", "task")
    expect(limiter.canAcquire("task")).toBe(false)
    expect(limiter.runningCount).toBe(2)
  })

  it("enforces per-kind limits", () => {
    const limiter = new ConcurrencyLimiter({
      maxConcurrent: 10,
      maxPerKind: { task: 2, worker_spawn: 1 },
    })

    expect(limiter.acquire("u1", "task")).toBe(true)
    expect(limiter.acquire("u2", "task")).toBe(true)
    expect(limiter.acquire("u3", "task")).toBe(false) // task limit reached
    expect(limiter.acquire("u4", "worker_spawn")).toBe(true)
    expect(limiter.acquire("u5", "worker_spawn")).toBe(false) // worker_spawn limit reached
  })

  it("isRunning checks correctly", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 5 })
    limiter.acquire("u1", "task")
    expect(limiter.isRunning("u1")).toBe(true)
    expect(limiter.isRunning("u2")).toBe(false)
  })

  it("getKind returns unit kind", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 5 })
    limiter.acquire("u1", "task")
    expect(limiter.getKind("u1")).toBe("task")
    expect(limiter.getKind("u2")).toBeUndefined()
  })

  it("getKindCount tracks per-kind count", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 10 })
    limiter.acquire("u1", "task")
    limiter.acquire("u2", "task")
    limiter.acquire("u3", "worker_spawn")

    expect(limiter.getKindCount("task")).toBe(2)
    expect(limiter.getKindCount("worker_spawn")).toBe(1)
  })

  it("getRunningUnitIds returns all running ids", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 10 })
    limiter.acquire("u1", "task")
    limiter.acquire("u2", "worker_spawn")

    const ids = limiter.getRunningUnitIds()
    expect(ids).toHaveLength(2)
    expect(ids).toContain("u1")
    expect(ids).toContain("u2")
  })

  it("remainingCapacity reports correctly", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 3 })
    expect(limiter.remainingCapacity).toBe(3)

    limiter.acquire("u1", "task")
    expect(limiter.remainingCapacity).toBe(2)

    limiter.release("u1")
    expect(limiter.remainingCapacity).toBe(3)
  })

  it("reset clears everything", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: 10 })
    limiter.acquire("u1", "task")
    limiter.acquire("u2", "worker_spawn")
    limiter.reset()

    expect(limiter.runningCount).toBe(0)
    expect(limiter.getKindCount("task")).toBe(0)
  })

  it("unlimited concurrency allows any count", () => {
    const limiter = new ConcurrencyLimiter({ maxConcurrent: Infinity })
    for (let i = 0; i < 100; i++) {
      expect(limiter.acquire(`u${i}`, "task")).toBe(true)
    }
    expect(limiter.runningCount).toBe(100)
  })
})
