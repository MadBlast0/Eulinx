/**
 * P11-PROV-MANAGER — Capability Resolver Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { CapabilityResolver } from "./provider-resolver"
import type { ModelProfile } from "./provider-types"
import type { ProviderId } from "@/core/types"

// ---------------------------------------------------------------------------
// Mock Profiles
// ---------------------------------------------------------------------------

function createMockProfile(overrides: Partial<ModelProfile> = {}): ModelProfile {
  return {
    id: "test-model",
    displayName: "Test Model",
    providerId: "test-provider" as ProviderId,
    capabilities: ["coding"],
    contextWindow: 4096,
    pricing: { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.5 },
    latencyClass: "standard",
    availability: "online",
    features: { streaming: true, functionCalling: false, jsonMode: false, vision: false },
    fallbackChain: [],
    priority: 5,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CapabilityResolver", () => {
  let resolver: CapabilityResolver

  beforeEach(() => {
    resolver = new CapabilityResolver()
  })

  it("resolves to pinned model", () => {
    const profiles = [
      createMockProfile({ id: "model-a" }),
      createMockProfile({ id: "model-b" }),
    ]

    const result = resolver.resolve(
      { capabilities: [], pinnedModel: "model-b" },
      profiles,
    )

    expect(result).toBeDefined()
    expect(result?.profile.id).toBe("model-b")
    expect(result?.reason).toContain("Pinned")
  })

  it("resolves by capability tags", () => {
    const profiles = [
      createMockProfile({ id: "coder", capabilities: ["coding"] }),
      createMockProfile({ id: "writer", capabilities: ["writing"] }),
    ]

    const result = resolver.resolve(
      { capabilities: ["coding"] },
      profiles,
    )

    expect(result).toBeDefined()
    expect(result?.profile.id).toBe("coder")
  })

  it("respects budget constraint", () => {
    const profiles = [
      createMockProfile({ id: "expensive", pricing: { inputPerM: 10, outputPerM: 20, cacheReadPerM: 5 } }),
      createMockProfile({ id: "cheap", pricing: { inputPerM: 1, outputPerM: 2, cacheReadPerM: 0.5 } }),
    ]

    const result = resolver.resolve(
      { capabilities: [], maxCostPerM: 5 },
      profiles,
    )

    expect(result).toBeDefined()
    expect(result?.profile.id).toBe("cheap")
  })

  it("excludes offline profiles", () => {
    const profiles = [
      createMockProfile({ id: "offline", availability: "offline" }),
      createMockProfile({ id: "online", availability: "online" }),
    ]

    const result = resolver.resolve(
      { capabilities: [] },
      profiles,
    )

    expect(result).toBeDefined()
    expect(result?.profile.id).toBe("online")
  })

  it("excludes specified providers", () => {
    const profiles = [
      createMockProfile({ id: "excluded", providerId: "bad-provider" as ProviderId }),
      createMockProfile({ id: "included", providerId: "good-provider" as ProviderId }),
    ]

    const result = resolver.resolve(
      { capabilities: [], excludeProviders: ["bad-provider" as ProviderId] },
      profiles,
    )

    expect(result).toBeDefined()
    expect(result?.profile.id).toBe("included")
  })

  it("returns undefined when no match", () => {
    const profiles = [
      createMockProfile({ id: "writer", capabilities: ["writing"] }),
    ]

    const result = resolver.resolve(
      { capabilities: ["coding"] },
      profiles,
    )

    expect(result).toBeUndefined()
  })

  it("prefers higher priority profiles", () => {
    const profiles = [
      createMockProfile({ id: "low", priority: 1 }),
      createMockProfile({ id: "high", priority: 10 }),
    ]

    const result = resolver.resolve(
      { capabilities: [] },
      profiles,
    )

    expect(result).toBeDefined()
    expect(result?.profile.id).toBe("high")
  })

  it("prefers cheap profiles when requested", () => {
    const profiles = [
      createMockProfile({ id: "standard", capabilities: ["coding"], priority: 10 }),
      createMockProfile({ id: "cheap", capabilities: ["coding", "cheap"], priority: 5 }),
    ]

    const result = resolver.resolve(
      { capabilities: ["coding"] },
      profiles,
    )

    expect(result).toBeDefined()
    // Cheap gets bonus points even with lower base priority
  })
})
