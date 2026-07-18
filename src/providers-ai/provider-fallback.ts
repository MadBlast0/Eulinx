/**
 * P11-PROV-MANAGER — Fallback Chain
 *
 * Handles ordered fallback when primary model is unavailable.
 * From ModelProfiles-Part03: each profile declares an ordered fallback chain.
 */

import type { ModelProfile } from "./provider-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Fallback Chain
// ---------------------------------------------------------------------------

export class FallbackChain {
  private readonly logger: Logger

  constructor() {
    this.logger = createLogger("FallbackChain")
  }

  /**
   * Get the next profile in the fallback chain.
   * Returns undefined if we've exhausted the chain.
   */
  getNext(
    currentProfile: ModelProfile,
    allProfiles: readonly ModelProfile[],
    failedIds: readonly string[],
  ): ModelProfile | undefined {
    // Check the profile's explicit fallback chain first
    for (const fallbackId of currentProfile.fallbackChain) {
      if (failedIds.includes(fallbackId)) continue

      const fallback = allProfiles.find((p) => p.id === fallbackId)
      if (fallback && fallback.availability === "online") {
        return fallback
      }
    }

    // If explicit chain exhausted, try any online profile with matching capabilities
    for (const profile of allProfiles) {
      if (failedIds.includes(profile.id)) continue
      if (profile.id === currentProfile.id) continue
      if (profile.availability !== "online") continue

      // Must have overlapping capabilities
      const hasOverlap = currentProfile.capabilities.some((cap) =>
        profile.capabilities.includes(cap),
      )
      if (hasOverlap) {
        return profile
      }
    }

    return undefined
  }

  /**
   * Execute a function with automatic fallback.
   * Tries the primary profile, then falls back through the chain on failure.
   */
  async executeWithFallback<T>(
    profiles: readonly ModelProfile[],
    allProfiles: readonly ModelProfile[],
    fn: (profile: ModelProfile) => Promise<T>,
  ): Promise<{ result: T; profile: ModelProfile } | { error: Error; triedIds: string[] }> {
    const triedIds: string[] = []

    for (const profile of profiles) {
      try {
        const result = await fn(profile)
        return { result, profile }
      } catch (error) {
        triedIds.push(profile.id)
        this.logger.warn(`Profile failed: ${profile.id}`, { error })

        // Try next in fallback chain
        const next = this.getNext(profile, allProfiles, triedIds)
        if (next) {
          profiles = [next, ...profiles.filter((p) => p.id !== next.id && p.id !== profile.id)]
        }
      }
    }

    return {
      error: new Error(`All profiles failed: ${triedIds.join(", ")}`),
      triedIds,
    }
  }
}
