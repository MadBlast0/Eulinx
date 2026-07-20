/**
 * P11-PROV-REGISTRY — Provider Registry
 *
 * Central catalog of all registered providers and their profiles.
 * From ModelProfiles-Part02: profiles are registered here.
 */

import type { ProviderId } from "@/core/types"
import type { ProviderConfig, ProviderAdapter, ProviderState, ModelProfile } from "./provider-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import { ClaudeAdapter } from "./adapters/claude-adapter"
import { OpenAIAdapter } from "./adapters/openai-adapter"
import { GeminiAdapter } from "./adapters/gemini-adapter"
import { OllamaAdapter } from "./adapters/ollama-adapter"
import { OpenRouterAdapter } from "./adapters/openrouter-adapter"
import { LMStudioAdapter } from "./adapters/lmstudio-adapter"
import { HermesAdapter } from "./adapters/hermes-adapter"

// ---------------------------------------------------------------------------
// Default model profiles for each provider
// ---------------------------------------------------------------------------

const CLAUDE_MODELS: readonly ModelProfile[] = [
  {
    id: "claude-sonnet-4-20250514",
    displayName: "Claude Sonnet 4",
    providerId: "claude" as ProviderId,
    capabilities: ["coding", "reasoning", "writing", "vision"],
    contextWindow: 200000,
    pricing: { inputPerM: 3, outputPerM: 15, cacheReadPerM: 0.3 },
    latencyClass: "standard",
    availability: "online",
    features: { streaming: true, functionCalling: true, jsonMode: false, vision: true },
    fallbackChain: ["claude-3-haiku-20240307"],
    priority: 10,
  },
  {
    id: "claude-3-haiku-20240307",
    displayName: "Claude 3 Haiku",
    providerId: "claude" as ProviderId,
    capabilities: ["coding", "fast", "cheap"],
    contextWindow: 200000,
    pricing: { inputPerM: 0.25, outputPerM: 1.25, cacheReadPerM: 0.03 },
    latencyClass: "fast",
    availability: "online",
    features: { streaming: true, functionCalling: true, jsonMode: false, vision: false },
    fallbackChain: [],
    priority: 5,
  },
]

const OPENAI_MODELS: readonly ModelProfile[] = [
  {
    id: "gpt-4o",
    displayName: "GPT-4o",
    providerId: "openai" as ProviderId,
    capabilities: ["coding", "reasoning", "writing", "vision"],
    contextWindow: 128000,
    pricing: { inputPerM: 2.5, outputPerM: 10, cacheReadPerM: 1.25 },
    latencyClass: "standard",
    availability: "online",
    features: { streaming: true, functionCalling: true, jsonMode: true, vision: true },
    fallbackChain: ["gpt-4o-mini"],
    priority: 9,
  },
  {
    id: "gpt-4o-mini",
    displayName: "GPT-4o Mini",
    providerId: "openai" as ProviderId,
    capabilities: ["coding", "fast", "cheap"],
    contextWindow: 128000,
    pricing: { inputPerM: 0.15, outputPerM: 0.6, cacheReadPerM: 0.075 },
    latencyClass: "fast",
    availability: "online",
    features: { streaming: true, functionCalling: true, jsonMode: true, vision: true },
    fallbackChain: [],
    priority: 5,
  },
]

const GEMINI_MODELS: readonly ModelProfile[] = [
  {
    id: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    providerId: "gemini" as ProviderId,
    capabilities: ["coding", "fast", "reasoning", "vision"],
    contextWindow: 1048576,
    pricing: { inputPerM: 0.1, outputPerM: 0.4, cacheReadPerM: 0.025 },
    latencyClass: "fast",
    availability: "online",
    features: { streaming: true, functionCalling: true, jsonMode: true, vision: true },
    fallbackChain: [],
    priority: 8,
  },
]

const OLLAMA_MODELS: readonly ModelProfile[] = [
  {
    id: "llama3.2",
    displayName: "Llama 3.2 (Ollama)",
    providerId: "ollama" as ProviderId,
    capabilities: ["coding", "reasoning"],
    contextWindow: 128000,
    pricing: { inputPerM: 0, outputPerM: 0, cacheReadPerM: 0 },
    latencyClass: "standard",
    availability: "offline",
    features: { streaming: true, functionCalling: false, jsonMode: true, vision: false },
    fallbackChain: [],
    priority: 7,
  },
]

const LMSTUDIO_MODELS: readonly ModelProfile[] = [
  {
    id: "local-model",
    displayName: "LM Studio Local",
    providerId: "lmstudio" as ProviderId,
    capabilities: ["coding"],
    contextWindow: 8192,
    pricing: { inputPerM: 0, outputPerM: 0, cacheReadPerM: 0 },
    latencyClass: "standard",
    availability: "offline",
    features: { streaming: true, functionCalling: false, jsonMode: true, vision: false },
    fallbackChain: [],
    priority: 6,
  },
]

const OPENROUTER_MODELS: readonly ModelProfile[] = [
  {
    id: "openrouter-auto",
    displayName: "OpenRouter Auto",
    providerId: "openrouter" as ProviderId,
    capabilities: ["coding", "reasoning", "writing", "vision"],
    contextWindow: 128000,
    pricing: { inputPerM: 0, outputPerM: 0, cacheReadPerM: 0 },
    latencyClass: "standard",
    availability: "online",
    features: { streaming: true, functionCalling: true, jsonMode: true, vision: true },
    fallbackChain: [],
    priority: 4,
  },
]

const HERMES_MODELS: readonly ModelProfile[] = [
  {
    id: "hermes-3",
    displayName: "Hermes 3",
    providerId: "hermes" as ProviderId,
    capabilities: ["coding", "reasoning"],
    contextWindow: 32768,
    pricing: { inputPerM: 0, outputPerM: 0, cacheReadPerM: 0 },
    latencyClass: "standard",
    availability: "offline",
    features: { streaming: true, functionCalling: false, jsonMode: true, vision: false },
    fallbackChain: [],
    priority: 6,
  },
]

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

export class ProviderRegistry {
  private readonly logger: Logger
  private readonly providers = new Map<ProviderId, ProviderConfig>()
  private readonly adapters = new Map<ProviderId, ProviderAdapter>()
  private readonly states = new Map<ProviderId, ProviderState>()

  constructor() {
    this.logger = createLogger("ProviderRegistry")
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  /** Register a provider configuration */
  register(config: ProviderConfig): void {
    this.providers.set(config.id, config)
    this.states.set(config.id, config.enabled ? "configured" : "unconfigured")
    this.logger.info(`Provider registered: ${config.name} (${config.id})`)
  }

  /** Register an adapter for a provider */
  registerAdapter(providerId: ProviderId, adapter: ProviderAdapter): void {
    this.adapters.set(providerId, adapter)
    this.logger.info(`Adapter registered for: ${providerId}`)
  }

  /** Unregister a provider */
  unregister(providerId: ProviderId): boolean {
    this.providers.delete(providerId)
    this.adapters.delete(providerId)
    this.states.delete(providerId)
    this.logger.info(`Provider unregistered: ${providerId}`)
    return true
  }

  // -----------------------------------------------------------------------
  // Queries
  // -----------------------------------------------------------------------

  /** Get provider config by ID */
  get(providerId: ProviderId): ProviderConfig | undefined {
    return this.providers.get(providerId)
  }

  /** Get adapter by provider ID */
  getAdapter(providerId: ProviderId): ProviderAdapter | undefined {
    return this.adapters.get(providerId)
  }

  /** Get provider state */
  getState(providerId: ProviderId): ProviderState {
    return this.states.get(providerId) ?? "unconfigured"
  }

  /** Update provider state */
  setState(providerId: ProviderId, state: ProviderState): void {
    this.states.set(providerId, state)
  }

  /** List all registered providers */
  list(): readonly ProviderConfig[] {
    return Array.from(this.providers.values())
  }

  /** List all enabled providers */
  listEnabled(): readonly ProviderConfig[] {
    return this.list().filter((p) => p.enabled)
  }

  /** Get all models across all providers */
  getAllModels(): readonly ModelProfile[] {
    return this.listEnabled().flatMap((p) => p.models)
  }

  /** Find a model profile by ID */
  findModel(modelId: string): ModelProfile | undefined {
    for (const provider of this.listEnabled()) {
      const model = provider.models.find((m) => m.id === modelId)
      if (model) return model
    }
    return undefined
  }

  /** Check if a provider is registered and enabled */
  isEnabled(providerId: ProviderId): boolean {
    const config = this.providers.get(providerId)
    return config?.enabled === true
  }

  /** Check if a provider has an adapter */
  hasAdapter(providerId: ProviderId): boolean {
    return this.adapters.has(providerId)
  }

  /** Register all default adapters with their configurations */
  registerDefaultAdapters(): void {
    const claudeAdapter = new ClaudeAdapter({})
    const openaiAdapter = new OpenAIAdapter({})
    const geminiAdapter = new GeminiAdapter({})
    const ollamaAdapter = new OllamaAdapter({ baseUrl: "http://localhost:11434" })
    const lmstudioAdapter = new LMStudioAdapter({ baseUrl: "http://localhost:1234" })
    const openrouterAdapter = new OpenRouterAdapter({})
    const hermesAdapter = new HermesAdapter({})

    this.register({
      id: "claude" as ProviderId,
      name: "Claude",
      models: CLAUDE_MODELS,
      enabled: true,
    })
    this.registerAdapter("claude" as ProviderId, claudeAdapter)

    this.register({
      id: "openai" as ProviderId,
      name: "OpenAI",
      models: OPENAI_MODELS,
      enabled: false,
    })
    this.registerAdapter("openai" as ProviderId, openaiAdapter)

    this.register({
      id: "gemini" as ProviderId,
      name: "Gemini",
      models: GEMINI_MODELS,
      enabled: false,
    })
    this.registerAdapter("gemini" as ProviderId, geminiAdapter)

    this.register({
      id: "ollama" as ProviderId,
      name: "Ollama",
      models: OLLAMA_MODELS,
      baseUrl: "http://localhost:11434",
      enabled: false,
    })
    this.registerAdapter("ollama" as ProviderId, ollamaAdapter)

    this.register({
      id: "lmstudio" as ProviderId,
      name: "LM Studio",
      models: LMSTUDIO_MODELS,
      baseUrl: "http://localhost:1234",
      enabled: false,
    })
    this.registerAdapter("lmstudio" as ProviderId, lmstudioAdapter)

    this.register({
      id: "openrouter" as ProviderId,
      name: "OpenRouter",
      models: OPENROUTER_MODELS,
      enabled: false,
    })
    this.registerAdapter("openrouter" as ProviderId, openrouterAdapter)

    this.register({
      id: "hermes" as ProviderId,
      name: "Hermes",
      models: HERMES_MODELS,
      enabled: false,
    })
    this.registerAdapter("hermes" as ProviderId, hermesAdapter)
  }

  /** Set a provider as the default (enabled, high priority) */
  setDefaultProvider(providerId: ProviderId): void {
    for (const [id, config] of this.providers) {
      const updated: ProviderConfig = {
        ...config,
        enabled: id === providerId,
      }
      this.providers.set(id, updated)
      this.states.set(id, id === providerId ? "configured" : "unconfigured")
    }
    this.logger.info(`Default provider set: ${providerId}`)
  }
}

// ---------------------------------------------------------------------------
// Singleton registry instance
// ---------------------------------------------------------------------------

let defaultRegistry: ProviderRegistry | null = null

export function getDefaultRegistry(): ProviderRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new ProviderRegistry()
    defaultRegistry.registerDefaultAdapters()
    defaultRegistry.setDefaultProvider("claude" as ProviderId)
  }
  return defaultRegistry
}

export function resetDefaultRegistry(): void {
  defaultRegistry = null
}
