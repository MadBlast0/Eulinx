/**
 * P11-PROV-MANAGER — Provider Manager Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ProviderManager } from "./provider-manager"
import type { ProviderConfig, ProviderAdapter, ModelProfile } from "./provider-types"
import type { ProviderId } from "@/core/types"

// ---------------------------------------------------------------------------
// Mock Adapter
// ---------------------------------------------------------------------------

function createMockAdapter(id: string): ProviderAdapter {
  return {
    id: id as ProviderId,
    name: `Mock ${id}`,
    testConnection: async () => ({ connected: true, latencyMs: 100 }),
    complete: async () => ({
      id: "mock-id",
      model: "mock-model",
      content: "Hello",
      finishReason: "stop" as const,
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    }),
    stream: async function* () {
      yield { type: "text_delta" as const, delta: "Hello" }
      yield { type: "done" as const, usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } }
    },
    listModels: async () => [
      createMockProfile({ id: "mock-model", providerId: id as ProviderId }),
    ],
  }
}

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

function createMockConfig(id: string, enabled = true): ProviderConfig {
  return {
    id: id as ProviderId,
    name: `Provider ${id}`,
    models: [createMockProfile({ id: `${id}-model`, providerId: id as ProviderId })],
    enabled,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProviderManager", () => {
  let manager: ProviderManager

  beforeEach(() => {
    manager = new ProviderManager()
  })

  it("registers a provider", () => {
    const config = createMockConfig("test")
    manager.registerProvider(config)

    const providers = manager.listProviders()
    expect(providers).toHaveLength(1)
    expect(providers[0].id).toBe("test")
  })

  it("registers a provider with adapter", () => {
    const config = createMockConfig("test")
    const adapter = createMockAdapter("test")
    manager.registerProvider(config, adapter)

    const providers = manager.listEnabledProviders()
    expect(providers).toHaveLength(1)
  })

  it("tests connection", async () => {
    const config = createMockConfig("test")
    const adapter = createMockAdapter("test")
    manager.registerProvider(config, adapter)

    const result = await manager.testConnection("test" as ProviderId)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.connected).toBe(true)
    }
  })

  it("resolves model by capability", () => {
    const config = createMockConfig("test")
    manager.registerProvider(config)

    const result = manager.resolveModel({ capabilities: ["coding"] })
    expect(result).toBeDefined()
    expect(result?.profile.id).toBe("test-model")
  })

  it("completes a request", async () => {
    const config = createMockConfig("test")
    const adapter = createMockAdapter("test")
    manager.registerProvider(config, adapter)

    const result = await manager.complete(
      {
        model: "test-model",
        messages: [{ role: "user", content: "Hello" }],
      },
      { capabilities: ["coding"] },
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.content).toBe("Hello")
    }
  })

  it("emits events", async () => {
    const events: unknown[] = []
    manager.on("provider.connected", (event) => {
      events.push(event)
    })

    const config = createMockConfig("test")
    const adapter = createMockAdapter("test")
    manager.registerProvider(config, adapter)

    await manager.testConnection("test" as ProviderId)

    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ type: "provider.connected" })
  })

  it("shuts down cleanly", async () => {
    const config = createMockConfig("test")
    manager.registerProvider(config)

    await manager.shutdown()

    const providers = manager.listProviders()
    expect(providers).toHaveLength(1) // Providers are not cleared on shutdown
  })
})
