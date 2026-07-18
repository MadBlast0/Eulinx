/**
 * P10-ART-EXPORT — Artifact Export
 *
 * Export artifacts and their relationships for transfer between workspaces
 * or for backup. From MergeFlow-Part06 §GitIntegration.
 */

import type { ArtifactId, WorkspaceId, IsoTimestamp } from "@/core/types"
import type {
  Artifact,
  ArtifactRelationship,
  ArtifactExportBundle,
  ArtifactExportEntry,
  ArtifactKind,
  ArtifactStatus,
} from "./artifact-types"

// ---------------------------------------------------------------------------
// Export Filter
// ---------------------------------------------------------------------------

export interface ExportFilter {
  readonly workspaceId: WorkspaceId
  readonly kinds?: readonly ArtifactKind[]
  readonly statuses?: readonly ArtifactStatus[]
  readonly artifactIds?: readonly ArtifactId[]
  readonly includeRelationships?: boolean
  readonly includeContent?: boolean
}

// ---------------------------------------------------------------------------
// ArtifactExport
// ---------------------------------------------------------------------------

export class ArtifactExport {
  /**
   * Export artifacts matching a filter into a bundle.
   * From MergeFlow-Part06 §GitIntegration and ArtifactManager-Part06.
   */
  export(
    filter: ExportFilter,
    getArtifact: (id: ArtifactId) => Artifact | undefined,
    getContent: (id: ArtifactId) => string | Uint8Array | undefined,
    getRelationships: (id: ArtifactId) => readonly ArtifactRelationship[]
  ): ArtifactExportBundle {
    const entries: ArtifactExportEntry[] = []
    const allRelationships: ArtifactRelationship[] = []

    // Determine which artifacts to export
    let artifactIds: ArtifactId[]

    if (filter.artifactIds && filter.artifactIds.length > 0) {
      artifactIds = [...filter.artifactIds]
    } else {
      // Would need to query a store; for now accept explicit IDs
      artifactIds = []
    }

    for (const id of artifactIds) {
      const artifact = getArtifact(id)
      if (!artifact) continue

      // Apply kind filter
      if (
        filter.kinds &&
        filter.kinds.length > 0 &&
        !filter.kinds.includes(artifact.kind)
      ) {
        continue
      }

      // Apply status filter
      if (
        filter.statuses &&
        filter.statuses.length > 0 &&
        !filter.statuses.includes(artifact.status)
      ) {
        continue
      }

      // Apply sensitivity filter: never export secret artifacts
      if (artifact.sensitivity === "secret") {
        continue
      }

      const content = filter.includeContent !== false ? getContent(id) : ""

      entries.push({
        meta: artifact,
        content: content ?? "",
      })

      // Collect relationships
      if (filter.includeRelationships !== false) {
        const rels = getRelationships(id)
        allRelationships.push(...rels)
      }
    }

    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString() as IsoTimestamp,
      workspaceId: filter.workspaceId,
      artifacts: entries,
      relationships: allRelationships,
    }
  }

  /**
   * Export a single artifact with its derivation chain.
   */
  exportChain(
    artifactId: ArtifactId,
    workspaceId: WorkspaceId,
    getArtifact: (id: ArtifactId) => Artifact | undefined,
    getContent: (id: ArtifactId) => string | Uint8Array | undefined,
    getDerivationChain: (id: ArtifactId) => readonly ArtifactId[],
    getRelationships: (id: ArtifactId) => readonly ArtifactRelationship[]
  ): ArtifactExportBundle {
    const chain = getDerivationChain(artifactId)
    const entries: ArtifactExportEntry[] = []
    const allRelationships: ArtifactRelationship[] = []

    for (const id of chain) {
      const artifact = getArtifact(id)
      if (!artifact) continue

      // Never export secret artifacts
      if (artifact.sensitivity === "secret") continue

      const content = getContent(id)
      entries.push({
        meta: artifact,
        content: content ?? "",
      })

      const rels = getRelationships(id)
      allRelationships.push(...rels)
    }

    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString() as IsoTimestamp,
      workspaceId,
      artifacts: entries,
      relationships: allRelationships,
    }
  }

  /**
   * Serialize a bundle to JSON for file storage or transmission.
   */
  serialize(bundle: ArtifactExportBundle): string {
    return JSON.stringify(bundle, null, 2)
  }

  /**
   * Deserialize a bundle from JSON.
   */
  deserialize(json: string): ArtifactExportBundle {
    const parsed = JSON.parse(json) as ArtifactExportBundle
    if (!parsed.version || !parsed.artifacts || !parsed.workspaceId) {
      throw new Error("Invalid export bundle: missing required fields")
    }
    return parsed
  }

  /**
   * Export metadata only (no content) for lightweight transfer.
   */
  exportMetadataOnly(
    artifactIds: readonly ArtifactId[],
    workspaceId: WorkspaceId,
    getArtifact: (id: ArtifactId) => Artifact | undefined
  ): ArtifactExportBundle {
    const entries: ArtifactExportEntry[] = []

    for (const id of artifactIds) {
      const artifact = getArtifact(id)
      if (!artifact) continue
      if (artifact.sensitivity === "secret") continue

      entries.push({
        meta: artifact,
        content: "", // metadata only
      })
    }

    return {
      version: "1.0.0",
      exportedAt: new Date().toISOString() as IsoTimestamp,
      workspaceId,
      artifacts: entries,
      relationships: [],
    }
  }

  /**
   * Validate an export bundle before import.
   */
  validateBundle(bundle: ArtifactExportBundle): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    if (!bundle.version) errors.push("Missing bundle version")
    if (!bundle.workspaceId) errors.push("Missing workspace ID")
    if (!bundle.exportedAt) errors.push("Missing export timestamp")
    if (!Array.isArray(bundle.artifacts)) {
      errors.push("Missing or invalid artifacts array")
    }

    // Check for duplicate IDs
    const ids = new Set<string>()
    for (const entry of bundle.artifacts ?? []) {
      if (!entry.meta?.id) {
        errors.push("Artifact missing ID")
        continue
      }
      if (ids.has(entry.meta.id)) {
        errors.push(`Duplicate artifact ID: ${entry.meta.id}`)
      }
      ids.add(entry.meta.id)
    }

    return { valid: errors.length === 0, errors }
  }
}
