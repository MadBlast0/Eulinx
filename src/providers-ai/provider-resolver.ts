/**
 * P11-PROV-MANAGER — Capability Resolver
 *
 * Resolves capability requests to the best matching profile.
 * From ModelProfiles-Part02: resolver returns highest-priority profile
 * matching tags within budget and availability.
 */

import type { ProviderId } from "@/core/types"
import type { ModelProfile, CapabilityTag, Pricing } from "./provider-types"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"

// ---------------------------------------------------------------------------
// Resolution Request
// ---------------------------------------------------------------------------

export interface ResolutionRequest {
  /** Required capability tags */
  readonly capabilities: readonly CapabilityTag[]
  /** Maximum cost per 1M input tokens (optional) */
  readonly maxCostPerM?: number
  /** Preferred latency class (optional) */
  readonly preferredLatency?: "fast" | "standard" | "slow"
  /** Exclude specific providers */
  readonly excludeProviders?: readonly ProviderId[]
  /** Exclude specific models */
  readonly excludeModels?: readonly string[]
  /** Pin a specific model (overrides resolution) */
  readonly pinnedModel?: string
}

// ---------------------------------------------------------------------------
// Resolution Result
// ---------------------------------------------------------------------------

export interface ResolutionResult {
  /** The selected profile */
  readonly profile: ModelProfile
  /** Why this profile was selected */
  readonly reason: string
  /** Alternative profiles that could have been selected */
  readonly alternatives: readonly ModelProfile[]
}

// ---------------------------------------------------------------------------
// Capability Resolver
// ---------------------------------------------------------------------------

export class CapabilityResolver {
  private readonly logger: Logger

  constructor() {
    this.logger = createLogger("CapabilityResolver")
  }

  /**
   * Resolve a capability request to the best matching profile.
   *
   * Resolution priority:
   * 1. Pinned model (user override)
   * 2. Capability fit (all required tags present)
   * 3. Budget (cost within limit)
   * 4. Availability (online only)
   * 5. Priority weight (cost + capability fit + latency)
   */
  resolve(
    request: ResolutionRequest,
    profiles: readonly ModelProfile[],
  ): ResolutionResult | undefined {
    // 1. Check for pinned model
    if (request.pinnedModel) {
      const pinned = profiles.find((p) => p.id === request.pinnedModel)
      if (pinned) {
        return {
          profile: pinned,
          reason: `Pinned to model: ${request.pinnedModel}`,
          alternatives: [],
        }
      }
      this.logger.warn(`Pinned model not found: ${request.pinnedModel}`)
    }

    // 2. Filter candidates
    const candidates = profiles.filter((profile) => {
      // Must be online
      if (profile.availability !== "online") return false

      // Must have all required capabilities
      if (!this.hasAllCapabilities(profile, request.capabilities)) return false

      // Must be within budget
      if (request.maxCostPerM !== undefined && profile.pricing.inputPerM > request.maxCostPerM) {
        return false
      }

      // Must not be excluded
      if (request.excludeProviders?.includes(profile.providerId)) return false
      if (request.excludeModels?.includes(profile.id)) return false

      return true
    })

    if (candidates.length === 0) {
      this.logger.warn("No matching profiles found", { request })
      return undefined
    }

    // 3. Sort by priority (higher is better)
    const sorted = [...candidates].sort((a, b) => {
      const scoreA = this.calculateScore(a, request)
      const scoreB = this.calculateScore(b, request)
      return scoreB - scoreA
    })

    const best = sorted[0]
    const alternatives = sorted.slice(1)

    return {
      profile: best,
      reason: `Best match for capabilities: ${request.capabilities.join(", ")}`,
      alternatives,
    }
  }

  // -----------------------------------------------------------------------
  // Scoring
  // -----------------------------------------------------------------------

  /**
   * Calculate a priority score for a profile.
   * Higher score = better match.
   */
  private calculateScore(
    profile: ModelProfile,
    request: ResolutionRequest,
  ): number {
    let score = profile.priority * 10

    // Capability fit: more matching tags = higher score
    const matchingTags = request.capabilities.filter((tag) =>
      profile.capabilities.includes(tag),
    )
    score += matchingTags.length * 5

    // Latency fit
    if (request.preferredLatency && profile.latencyClass === request.preferredLatency) {
      score += 3
    }

    // Cost preference (lower is better, but cheap tag gets bonus)
    if (profile.capabilities.includes("cheap")) {
      score += 2
    }

    // Fast tag bonus for interactive roles
    if (request.preferredLatency === "fast" && profile.capabilities.includes("fast")) {
      score += 2
    }

    return score
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  private hasAllCapabilities(
    profile: ModelProfile,
    required: readonly CapabilityTag[],
  ): boolean {
    return required.every((tag) => profile.capabilities.includes(tag))
  }
}
