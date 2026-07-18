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
}
