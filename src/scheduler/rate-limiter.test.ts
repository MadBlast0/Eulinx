/**
 * P05-SCH-RATELIMIT — Rate Limiter Tests
 *
 * Tests for TokenBucket and RateLimiter.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { TokenBucket, RateLimiter } from "./rate-limiter"

// ---------------------------------------------------------------------------
// TokenBucket
// ---------------------------------------------------------------------------

describe("TokenBucket", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts with full capacity", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 })
    expect(bucket.availableTokens).toBe(5)
  })

  it("consumes tokens", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 })
    expect(bucket.tryConsume(3)).toBe(true)
    expect(bucket.availableTokens).toBe(2)
  })

  it("rejects when insufficient tokens", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 })
    expect(bucket.tryConsume(6)).toBe(false)
    expect(bucket.availableTokens).toBe(5)
  })

  it("refills tokens over time", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 2 })
    bucket.tryConsume(5)
    expect(bucket.availableTokens).toBe(0)

    vi.advanceTimersByTime(1000) // 1 second → 2 tokens
    expect(bucket.availableTokens).toBe(2)
  })

  it("does not exceed capacity", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 100 })
    vi.advanceTimersByTime(10_000) // way more than capacity
    expect(bucket.availableTokens).toBe(5)
  })

  it("returns tokens", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 })
    bucket.tryConsume(5)
    bucket.returnTokens(3)
    expect(bucket.availableTokens).toBe(3)
  })

  it("does not exceed capacity on return", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 })
    bucket.returnTokens(10)
    expect(bucket.availableTokens).toBe(5)
  })

  it("getState returns current state", () => {
    const bucket = new TokenBucket({ capacity: 5, refillRate: 1 })
    const state = bucket.getState()
    expect(state.tokens).toBe(5)
    expect(state.lastRefillAt).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// RateLimiter
// ---------------------------------------------------------------------------

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows within global limit", () => {
    const limiter = new RateLimiter({
      global: { capacity: 5, refillRate: 1 },
    })
    expect(limiter.isAllowed()).toBe(true)
  })

  it("rejects when global limit exhausted", () => {
    const limiter = new RateLimiter({
      global: { capacity: 2, refillRate: 0 },
    })
    expect(limiter.isAllowed()).toBe(true)
    expect(limiter.isAllowed()).toBe(true)
    expect(limiter.isAllowed()).toBe(false)
  })

  it("enforces per-group limits", () => {
    const limiter = new RateLimiter({
      global: { capacity: 100, refillRate: 100 },
      perGroup: { capacity: 2, refillRate: 0 },
    })
    expect(limiter.isAllowed("g1")).toBe(true)
    expect(limiter.isAllowed("g1")).toBe(true)
    expect(limiter.isAllowed("g1")).toBe(false)
    // Different group should be fine
    expect(limiter.isAllowed("g2")).toBe(true)
  })

  it("returns tokens on cancellation", () => {
    const limiter = new RateLimiter({
      global: { capacity: 2, refillRate: 0 },
    })
    limiter.isAllowed()
    limiter.isAllowed()
    expect(limiter.isAllowed()).toBe(false)

    limiter.returnTokens(undefined, 1)
    expect(limiter.isAllowed()).toBe(true)
  })

  it("returns group tokens", () => {
    const limiter = new RateLimiter({
      global: { capacity: 100, refillRate: 100 },
      perGroup: { capacity: 1, refillRate: 0 },
    })
    limiter.isAllowed("g1")
    expect(limiter.isAllowed("g1")).toBe(false)

    limiter.returnTokens("g1", 1)
    expect(limiter.isAllowed("g1")).toBe(true)
  })

  it("getGlobalState returns bucket state", () => {
    const limiter = new RateLimiter({
      global: { capacity: 5, refillRate: 1 },
    })
    const state = limiter.getGlobalState()
    expect(state.tokens).toBe(5)
  })

  it("getGroupState returns group bucket state", () => {
    const limiter = new RateLimiter({
      global: { capacity: 5, refillRate: 1 },
      perGroup: { capacity: 3, refillRate: 1 },
    })
    limiter.isAllowed("g1")
    const state = limiter.getGroupState("g1")
    expect(state).toBeDefined()
    expect(state!.tokens).toBe(2)
  })

  it("getGroupState returns undefined for unknown group", () => {
    const limiter = new RateLimiter({
      global: { capacity: 5, refillRate: 1 },
      perGroup: { capacity: 3, refillRate: 1 },
    })
    expect(limiter.getGroupState("unknown")).toBeUndefined()
  })

  it("reset clears group buckets", () => {
    const limiter = new RateLimiter({
      global: { capacity: 5, refillRate: 1 },
      perGroup: { capacity: 1, refillRate: 0 },
    })
    limiter.isAllowed("g1")
    limiter.reset()
    expect(limiter.getGroupState("g1")).toBeUndefined()
  })
})
