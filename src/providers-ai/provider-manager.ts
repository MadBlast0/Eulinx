/**
 * P11-PROV-MANAGER — Provider Manager
 *
 * Top-level coordinator for the provider system.
 * From ModelProfiles-Part04: wires role requests through resolver.
 */

import type { ProviderId } from "@/core/types"
import type {
  ProviderConfig,
  ProviderAdapter,
  ModelProfile,
  CompletionRequest,
  CompletionResponse,
  StreamEvent,
  ProviderEvent,
  ProviderEventType,
} from "./provider-types"
import type { ResolutionRequest, ResolutionResult } from "./provider-resolver"
import { ProviderRegistry } from "./provider-registry"
import { CapabilityResolver } from "./provider-resolver"
import { FallbackChain } from "./provider-fallback"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"

// ---------------------------------------------------------------------------
// Provider Manager
// ---------------------------------------------------------------------------

export class ProviderManager {
  private readonly logger: Logger
  private readonly registry: ProviderRegistry
  private readonly resolver: CapabilityResolver
  private readonly fallbackChain: FallbackChain
  private readonly eventListeners: Map<ProviderEventType, Set<(event: ProviderEvent) => void>>

  constructor() {
    this.logger = createLogger("ProviderManager")
    this.registry = new ProviderRegistry()
    this.resolver = new CapabilityResolver()
    this.fallbackChain = new FallbackChain()
    this.eventListeners = new Map()
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  /** Register a provider with its configuration and adapter */
  registerProvider(
    config: ProviderConfig,
    adapter?: ProviderAdapter,
  ): void {
    this.registry.register(config)
    if (adapter) {
      this.registry.registerAdapter(config.id, adapter)
    }
    this.logger.info(`Provider registered: ${config.name}`)
  }

  /** Register an adapter for an existing provider */
  registerAdapter(providerId: ProviderId, adapter: ProviderAdapter): void {
    this.registry.registerAdapter(providerId, adapter)
  }

  /** Unregister a provider */
  unregisterProvider(providerId: ProviderId): void {
    this.registry.unregister(providerId)
  }

  // -----------------------------------------------------------------------
  // Provider Operations
  // -----------------------------------------------------------------------

  /** Test connection to a provider */
  async testConnection(providerId: ProviderId): Promise<Result<{ connected: boolean; latencyMs?: number }, CoreError>> {
    const adapter = this.registry.getAdapter(providerId)
    if (!adapter) {
      return err(new CoreError("validation_error", `No adapter for provider: ${providerId}`))
    }

    try {
      const result = await adapter.testConnection()
      if (result.connected) {
        this.registry.setState(providerId, "connected")
        this.emitEvent("provider.connected", providerId, { latencyMs: result.latencyMs })
      } else {
        this.registry.setState(providerId, "error")
        this.emitEvent("provider.error", providerId, { error: result.error })
      }
      return ok({ connected: result.connected, latencyMs: result.latencyMs })
    } catch (error) {
      this.registry.setState(providerId, "error")
      return err(new CoreError("internal_error", `Connection test failed: ${error}`))
    }
  }

  /** List all registered providers */
  listProviders(): readonly ProviderConfig[] {
    return this.registry.list()
  }

  /** List all enabled providers */
  listEnabledProviders(): readonly ProviderConfig[] {
    return this.registry.listEnabled()
  }

  /** Get a provider by ID */
  getProvider(providerId: ProviderId): ProviderConfig | undefined {
    return this.registry.get(providerId)
  }

  /** Get provider state */
  getProviderState(providerId: ProviderId) {
    return this.registry.getState(providerId)
  }

  // -----------------------------------------------------------------------
  // Model Resolution
  // -----------------------------------------------------------------------

  /** Resolve a capability request to the best model */
  resolveModel(request: ResolutionRequest): ResolutionResult | undefined {
    const profiles = this.registry.getAllModels()
    return this.resolver.resolve(request, profiles)
  }

  /** Get a model profile by ID */
  getModel(modelId: string): ModelProfile | undefined {
    return this.registry.findModel(modelId)
  }

  /** List all available models */
  listModels(): readonly ModelProfile[] {
    return this.registry.getAllModels()
  }

  // -----------------------------------------------------------------------
  // Completion
  // -----------------------------------------------------------------------

  /** Send a completion request with automatic fallback */
  async complete(
    request: CompletionRequest,
    resolutionRequest?: ResolutionRequest,
  ): Promise<Result<CompletionResponse, CoreError>> {
    // Resolve model if not specified
    let profiles: readonly ModelProfile[]
    if (resolutionRequest) {
      const resolution = this.resolveModel(resolutionRequest)
      if (!resolution) {
        return err(new CoreError("validation_error", "No matching model for request"))
      }
      profiles = [resolution.profile, ...resolution.alternatives]
    } else {
      const model = this.getModel(request.model)
      if (!model) {
        return err(new CoreError("validation_error", `Model not found: ${request.model}`))
      }
      profiles = [model]
    }

    // Execute with fallback
    const allProfiles = this.registry.getAllModels()
    const result = await this.fallbackChain.executeWithFallback(
      profiles,
      allProfiles,
      async (profile) => {
        const adapter = this.registry.getAdapter(profile.providerId)
        if (!adapter) {
          throw new Error(`No adapter for provider: ${profile.providerId}`)
        }
        return adapter.complete(request)
      },
    )

    if ("error" in result) {
      return err(new CoreError("execution_failed", result.error.message))
    }

    this.emitEvent("provider.model.resolved", result.profile.providerId, {
      modelId: result.profile.id,
    })

    return ok(result.result)
  }

  /** Stream a completion request with automatic fallback */
  async *stream(
    request: CompletionRequest,
    resolutionRequest?: ResolutionRequest,
  ): AsyncIterable<StreamEvent> {
    // Resolve model if not specified
    let profiles: readonly ModelProfile[]
    if (resolutionRequest) {
      const resolution = this.resolveModel(resolutionRequest)
      if (!resolution) {
        yield { type: "error", error: "No matching model for request" }
        return
      }
      profiles = [resolution.profile, ...resolution.alternatives]
    } else {
      const model = this.getModel(request.model)
      if (!model) {
        yield { type: "error", error: `Model not found: ${request.model}` }
        return
      }
      profiles = [model]
    }

    // Try each profile in order
    for (const profile of profiles) {
      const adapter = this.registry.getAdapter(profile.providerId)
      if (!adapter) continue

      try {
        yield* adapter.stream(request)
        return
      } catch (error) {
        this.logger.warn(`Stream failed for profile: ${profile.id}`, { error })
        continue
      }
    }

    yield { type: "error", error: "All profiles failed" }
  }

  // -----------------------------------------------------------------------
  // Events
  // -----------------------------------------------------------------------

  /** Subscribe to provider events */
  on(eventType: ProviderEventType, listener: (event: ProviderEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set())
    }
    const listeners = this.eventListeners.get(eventType)
    if (listeners) listeners.add(listener)
  }

  /** Unsubscribe from provider events */
  off(eventType: ProviderEventType, listener: (event: ProviderEvent) => void): void {
    this.eventListeners.get(eventType)?.delete(listener)
  }

  private emitEvent(
    type: ProviderEventType,
    providerId: ProviderId,
    data?: Record<string, unknown>,
  ): void {
    const event: ProviderEvent = {
      type,
      providerId,
      timestamp: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      data: data as import("@/core/types").JsonObject,
    }

    this.eventListeners.get(type)?.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        this.logger.error(`Event listener error: ${error}`)
      }
    })
  }

  // -----------------------------------------------------------------------
  // Shutdown
  // -----------------------------------------------------------------------

  /** Shutdown the provider manager */
  async shutdown(): Promise<void> {
    this.eventListeners.clear()
    this.logger.info("ProviderManager shut down")
  }
}
