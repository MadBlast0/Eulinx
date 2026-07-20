/**
 * P15-API-PROVIDER — providerService
 *
 * List, add, remove, and test provider connections. Backed by the
 * `ProviderManager` TS manager.
 */

import type { ProviderId } from "@/core/types"
import type { ProviderConfig } from "@/providers-ai/provider-types"
import { getProviderManager } from "../managers"

export const providerService = {
  list(): readonly ProviderConfig[] {
    return getProviderManager().listProviders()
  },

  add(config: ProviderConfig): void {
    getProviderManager().registerProvider(config)
  },

  remove(providerId: ProviderId): void {
    getProviderManager().unregisterProvider(providerId)
  },

  testConnection(providerId: ProviderId) {
    return getProviderManager().testConnection(providerId)
  },
} as const

export type ProviderService = typeof providerService
