/**
 * P15-API-ARTIFACT — artifactService
 *
 * Get, list, merge, request verification, and diff artifacts. Backed by the
 * `ArtifactManager` TS manager so the gateway is functional today.
 */

import type { ArtifactId } from "@/core/types"
import type {
  Artifact,
  ArtifactCreateRequest,
  ArtifactFilter,
  ArtifactSearchQuery,
} from "@/artifact/artifact-types"
import { getArtifactManager } from "../managers"

export const artifactService = {
  create(request: ArtifactCreateRequest): { artifact: Artifact; validation: unknown } {
    return getArtifactManager().create(request)
  },

  get(artifactId: ArtifactId): Artifact | undefined {
    return getArtifactManager().get(artifactId)
  },

  list(filter: ArtifactFilter): readonly Artifact[] {
    return getArtifactManager().list(filter)
  },

  verify(artifactId: ArtifactId): Artifact | undefined {
    return getArtifactManager().updateVerificationState(artifactId, "passed")
  },

  merge(artifactId: ArtifactId, mergeState: "merged" | "mergeable" = "merged"): Artifact | undefined {
    return getArtifactManager().updateMergeState(artifactId, mergeState === "merged" ? "merged" : "eligible")
  },

  diff(fromId: ArtifactId, toId: ArtifactId): unknown {
    return getArtifactManager().diffVersions(fromId, toId)
  },

  search(query: ArtifactSearchQuery) {
    return getArtifactManager().searchArtifacts(query)
  },
} as const

export type ArtifactService = typeof artifactService
