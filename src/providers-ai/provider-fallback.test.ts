/**
 * P11-PROV-MANAGER — Fallback Chain Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { FallbackChain } from "./provider-fallback"
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

describe("FallbackChain", () => {
  let chain: FallbackChain

  beforeEach(() => {
    chain = new FallbackChain()
  })

  it("gets next from explicit fallback chain", () => {
    const primary = createMockProfile({ id: "primary", fallbackChain: ["fallback-1", "fallback-2"] })
    const fallback1 = createMockProfile({ id: "fallback-1" })
    const fallback2 = createMockProfile({ id: "fallback-2" })
    const allProfiles = [primary, fallback1, fallback2]

    const next = chain.getNext(primary, allProfiles, [])
    expect(next?.id).toBe("fallback-1")
  })

  it("skips failed profiles in fallback chain", () => {
    const primary = createMockProfile({ id: "primary", fallbackChain: ["fallback-1", "fallback-2"] })
    const fallback1 = createMockProfile({ id: "fallback-1" })
    const fallback2 = createMockProfile({ id: "fallback-2" })
    const allProfiles = [primary, fallback1, fallback2]

    const next = chain.getNext(primary, allProfiles, ["fallback-1"])
    expect(next?.id).toBe("fallback-2")
  })

  it("skips offline profiles", () => {
    const primary = createMockProfile({ id: "primary", fallbackChain: ["fallback-1"] })
    const fallback1 = createMockProfile({ id: "fallback-1", availability: "offline" })
    const fallback2 = createMockProfile({ id: "fallback-2" })
    const allProfiles = [primary, fallback1, fallback2]

    const next = chain.getNext(primary, allProfiles, [])
    expect(next?.id).toBe("fallback-2")
  })

  it("returns undefined when chain exhausted", () => {
    const primary = createMockProfile({ id: "primary", fallbackChain: [] })
    const allProfiles = [primary]

    const next = chain.getNext(primary, allProfiles, [])
    expect(next).toBeUndefined()
  })

  it("executes with fallback on success", async () => {
    const primary = createMockProfile({ id: "primary" })
    const fallback = createMockProfile({ id: "fallback" })
    const allProfiles = [primary, fallback]

    const result = await chain.executeWithFallback(
      [primary],
      allProfiles,
      async (profile) => `result-${profile.id}`,
    )

    expect("result" in result).toBe(true)
    if ("result" in result) {
      expect(result.result).toBe("result-primary")
      expect(result.profile.id).toBe("primary")
    }
  })

  it("executes with fallback on failure", async () => {
    const primary = createMockProfile({ id: "primary" })
    const fallback = createMockProfile({ id: "fallback" })
    const allProfiles = [primary, fallback]

    let callCount = 0
    const result = await chain.executeWithFallback(
      [primary, fallback],
      allProfiles,
      async (profile) => {
        callCount++
        if (profile.id === "primary") throw new Error("Primary failed")
        return `result-${profile.id}`
      },
    )

    expect("result" in result).toBe(true)
    if ("result" in result) {
      expect(result.result).toBe("result-fallback")
      expect(result.profile.id).toBe("fallback")
    }
    expect(callCount).toBe(2)
  })

  it("returns error when all profiles fail", async () => {
    const primary = createMockProfile({ id: "primary" })
    const fallback = createMockProfile({ id: "fallback" })
    const allProfiles = [primary, fallback]

    const result = await chain.executeWithFallback(
      [primary, fallback],
      allProfiles,
      async () => {
        throw new Error("Always fails")
      },
    )

    expect("error" in result).toBe(true)
    if ("error" in result) {
      expect(result.triedIds).toContain("primary")
      expect(result.triedIds).toContain("fallback")
    }
  })
})
