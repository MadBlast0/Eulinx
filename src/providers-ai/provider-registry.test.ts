/**
 * P11-PROV-REGISTRY — Provider Registry Tests
 */

import { describe, it, expect, beforeEach } from "vitest"
import { ProviderRegistry } from "./provider-registry"
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
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    }),
    stream: async function* () {
      yield { type: "text_delta" as const, delta: "Hello" }
      yield { type: "done" as const, usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 } }
    },
    listModels: async () => [],
  }
}

function createMockConfig(id: string, enabled = true): ProviderConfig {
  return {
    id: id as ProviderId,
    name: `Provider ${id}`,
    models: [],
    enabled,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
  })

  it("registers and retrieves a provider", () => {
    const config = createMockConfig("test-provider")
    registry.register(config)

    const retrieved = registry.get("test-provider" as ProviderId)
    expect(retrieved).toBeDefined()
    expect(retrieved?.name).toBe("Provider test-provider")
  })

  it("registers and retrieves an adapter", () => {
    const adapter = createMockAdapter("test-provider")
    registry.registerAdapter("test-provider" as ProviderId, adapter)

    const retrieved = registry.getAdapter("test-provider" as ProviderId)
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe("test-provider")
  })

  it("lists all providers", () => {
    registry.register(createMockConfig("provider-1"))
    registry.register(createMockConfig("provider-2"))

    const providers = registry.list()
    expect(providers).toHaveLength(2)
  })

  it("lists only enabled providers", () => {
    registry.register(createMockConfig("enabled", true))
    registry.register(createMockConfig("disabled", false))

    const enabled = registry.listEnabled()
    expect(enabled).toHaveLength(1)
    expect(enabled[0].id).toBe("enabled")
  })

  it("returns correct provider state", () => {
    registry.register(createMockConfig("test-provider"))
    expect(registry.getState("test-provider" as ProviderId)).toBe("configured")

    registry.setState("test-provider" as ProviderId, "connected")
    expect(registry.getState("test-provider" as ProviderId)).toBe("connected")
  })

  it("unregisters a provider", () => {
    registry.register(createMockConfig("test-provider"))
    registry.registerAdapter("test-provider" as ProviderId, createMockAdapter("test-provider"))

    const result = registry.unregister("test-provider" as ProviderId)
    expect(result).toBe(true)
    expect(registry.get("test-provider" as ProviderId)).toBeUndefined()
    expect(registry.getAdapter("test-provider" as ProviderId)).toBeUndefined()
  })

  it("checks if provider is enabled", () => {
    registry.register(createMockConfig("enabled", true))
    registry.register(createMockConfig("disabled", false))

    expect(registry.isEnabled("enabled" as ProviderId)).toBe(true)
    expect(registry.isEnabled("disabled" as ProviderId)).toBe(false)
    expect(registry.isEnabled("unknown" as ProviderId)).toBe(false)
  })
})
