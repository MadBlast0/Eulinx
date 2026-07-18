/**
 * P12-PROMPT-CACHE — Prompt Cache Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { PromptCache } from "./prompt-cache"
import type { PromptTemplate, RenderedPrompt } from "./prompt-types"

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

function createMockTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: "test-template",
    name: "Test Template",
    type: "system",
    version: 1,
    tags: [],
    template: "Hello {{name}}",
    requiredVariables: ["name"],
    cacheable: true,
    createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    ...overrides,
  }
}

function createMockRendered(overrides: Partial<RenderedPrompt> = {}): RenderedPrompt {
  return {
    templateId: "test-template",
    version: 1,
    text: "Hello World",
    cachePrefix: "Hello ",
    variablePart: "World",
    variables: { name: "World" },
    tokenEstimate: 2,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PromptCache", () => {
  let cache: PromptCache

  beforeEach(() => {
    cache = new PromptCache(10)
  })

  it("builds consistent keys", () => {
    const template = createMockTemplate()
    const key1 = cache.buildKey(template, { name: "Alice" })
    const key2 = cache.buildKey(template, { name: "Alice" })

    expect(key1).toBe(key2)
  })

  it("builds different keys for different variables", () => {
    const template = createMockTemplate()
    const key1 = cache.buildKey(template, { name: "Alice" })
    const key2 = cache.buildKey(template, { name: "Bob" })

    expect(key1).not.toBe(key2)
  })

  it("stores and retrieves entries", () => {
    const rendered = createMockRendered()
    cache.set("key-1", rendered)

    const entry = cache.get("key-1")
    expect(entry).toBeDefined()
    expect(entry?.rendered.text).toBe("Hello World")
  })

  it("tracks hit count", () => {
    const rendered = createMockRendered()
    cache.set("key-1", rendered)

    cache.get("key-1")
    cache.get("key-1")

    const entry = cache.get("key-1")
    expect(entry?.hitCount).toBe(2)
  })

  it("evicts oldest when at capacity", () => {
    for (let i = 0; i < 10; i++) {
      cache.set(`key-${i}`, createMockRendered({ text: `text-${i}` }))
    }

    cache.set("key-10", createMockRendered({ text: "text-10" }))

    expect(cache.get("key-0")).toBeUndefined()
    expect(cache.get("key-10")).toBeDefined()
  })

  it("returns stats", () => {
    const rendered = createMockRendered()
    cache.set("key-1", rendered)

    cache.get("key-1") // hit
    cache.get("key-2") // miss

    const stats = cache.getStats()
    expect(stats.size).toBe(1)
    expect(stats.totalHits).toBe(1)
    expect(stats.totalMisses).toBe(1)
  })

  it("clears cache", () => {
    cache.set("key-1", createMockRendered())
    cache.clear()

    expect(cache.size).toBe(0)
    expect(cache.getStats().totalHits).toBe(0)
  })
})
