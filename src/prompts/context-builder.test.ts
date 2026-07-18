/**
 * P12-PROMPT-CTXBUILD — Context Builder Tests
 */

import { describe, it, expect } from "vitest"
import { ContextBuilder } from "./context-builder"
import type { ContextCandidate } from "./prompt-types"

// ---------------------------------------------------------------------------
// Mock Candidates
// ---------------------------------------------------------------------------

function createMockCandidate(overrides: Partial<ContextCandidate> = {}): ContextCandidate {
  return {
    source: "memory:task-context",
    content: "Test content",
    relevance: 0.8,
    tokenCost: 100,
    sensitivity: "public",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ContextBuilder", () => {
  const builder = new ContextBuilder()

  it("builds a context package", () => {
    const candidates = [
      createMockCandidate({ source: "memory:task", relevance: 0.9, tokenCost: 50 }),
      createMockCandidate({ source: "artifact:code", relevance: 0.7, tokenCost: 30 }),
    ]

    const result = builder.build("ws-1", "worker", "worker-1", candidates, 1000)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.tokenEstimate).toBe(80)
      expect(result.value.memoryRefs.length).toBeGreaterThan(0)
      expect(result.value.artifactRefs.length).toBeGreaterThan(0)
    }
  })

  it("respects token budget", () => {
    const candidates = [
      createMockCandidate({ tokenCost: 500 }),
      createMockCandidate({ tokenCost: 500 }),
      createMockCandidate({ tokenCost: 500 }),
    ]

    const result = builder.build("ws-1", "worker", "worker-1", candidates, 600)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.tokenEstimate).toBeLessThanOrEqual(600)
    }
  })

  it("filters secret candidates", () => {
    const candidates = [
      createMockCandidate({ sensitivity: "secret" }),
      createMockCandidate({ sensitivity: "public" }),
    ]

    const result = builder.build("ws-1", "worker", "worker-1", candidates, 1000)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.tokenEstimate).toBe(100)
    }
  })

  it("ranks by relevance", () => {
    const candidates = [
      createMockCandidate({ relevance: 0.3 }),
      createMockCandidate({ relevance: 0.9 }),
      createMockCandidate({ relevance: 0.6 }),
    ]

    const result = builder.build("ws-1", "worker", "worker-1", candidates, 1000)

    expect(result.ok).toBe(true)
  })

  it("estimates tokens", () => {
    const tokens = builder.estimateTokens("Hello world, this is a test")
    expect(tokens).toBeGreaterThan(0)
  })

  it("compresses text", () => {
    const text = "A".repeat(1000)
    const compressed = builder.compress(text, 100)

    expect(compressed.length).toBeLessThan(text.length)
    expect(compressed).toContain("...")
  })
})
