/**
 * P10-ART-VERSION — Artifact Versioning
 *
 * Version model, content-addressed immutability, version chains, diffs,
 * and reconstruction. From ArtifactVersioning-Part01 through Part03.
 */

import type { ArtifactId, IsoTimestamp } from "@/core/types"
import type { Artifact, ArtifactDiff, DiffHunk } from "./artifact-types"

// ---------------------------------------------------------------------------
// Version Chain Node
// ---------------------------------------------------------------------------

export interface VersionChainNode {
  readonly artifact: Artifact
  readonly depth: number
}

// ---------------------------------------------------------------------------
// Version Chain Result
// ---------------------------------------------------------------------------

export interface VersionChainResult {
  readonly rootId: ArtifactId
  readonly versions: readonly VersionChainNode[]
  readonly latestVersion: number
  readonly latestId: ArtifactId
}

// ---------------------------------------------------------------------------
// ArtifactVersioning
// ---------------------------------------------------------------------------

export class ArtifactVersioning {
  /** Create the first version of an artifact chain. */
  createFirstVersion(
    artifact: Artifact
  ): { artifact: Artifact; isFirstVersion: boolean } {
    const updated: Artifact = {
      ...artifact,
      version: 1,
      parentArtifactId: undefined,
    }
    return { artifact: updated, isFirstVersion: true }
  }

  /**
   * Create a new version that derives from a parent.
   * From ArtifactVersioning-Part01 §TheVersionModel:
   * - version = parent.version + 1
   * - parentArtifactId = parent.id
   */
  createNextVersion(
    parent: Artifact,
    newId: ArtifactId,
    contentHash: string,
    contentRef: Artifact["contentRef"]
  ): Artifact {
    return {
      ...parent,
      id: newId,
      version: parent.version + 1,
      parentArtifactId: parent.id,
      contentHash,
      contentRef,
      status: "draft", // new version starts at draft
      verificationState: "unverified",
      mergeState: "unmerged",
      createdAt: new Date().toISOString() as IsoTimestamp,
      updatedAt: new Date().toISOString() as IsoTimestamp,
    }
  }

  /**
   * Walk a version chain from a given artifact back to the root.
   * From ArtifactVersioning-Part03 §VersionQueries.
   */
  walkChain(
    artifactId: ArtifactId,
    getArtifact: (id: ArtifactId) => Artifact | undefined
  ): VersionChainResult | undefined {
    const chain: VersionChainNode[] = []
    let current = getArtifact(artifactId)
    if (!current) return undefined

    // Walk back to root
    const visited = new Set<ArtifactId>()
    while (current) {
      if (visited.has(current.id)) break // cycle guard
      visited.add(current.id)
      chain.push({ artifact: current, depth: chain.length })
      if (!current.parentArtifactId) break
      current = getArtifact(current.parentArtifactId)
    }

    // Reverse to get root-first order
    chain.reverse()

    const latest = chain[chain.length - 1]
    if (!chain[0] || !latest) return undefined
    return {
      rootId: chain[0].artifact.id,
      versions: chain,
      latestVersion: latest.artifact.version,
      latestId: latest.artifact.id,
    }
  }

  /**
   * Get all versions of a chain, optionally filtered.
   * From ArtifactVersioning-Part03 §VersionQueries.
   */
  getAllVersions(
    rootId: ArtifactId,
    getArtifact: (id: ArtifactId) => Artifact | undefined,
    filter?: { verificationState?: string }
  ): readonly Artifact[] {
    const chain = this.walkChain(rootId, getArtifact)
    if (!chain) return []

    let versions = chain.versions.map((n) => n.artifact)
    if (filter?.verificationState) {
      versions = versions.filter(
        (v) => v.verificationState === filter.verificationState
      )
    }
    return versions
  }

  /**
   * Get the latest verified version in a chain.
   * From ArtifactVersioning-Part03 §VersionQueries.
   */
  getLatestVerified(
    rootId: ArtifactId,
    getArtifact: (id: ArtifactId) => Artifact | undefined
  ): Artifact | undefined {
    const chain = this.walkChain(rootId, getArtifact)
    if (!chain) return undefined

    // Walk from latest to root, return first verified
    for (let i = chain.versions.length - 1; i >= 0; i--) {
      const version = chain.versions[i]
      if (version && version.artifact.verificationState === "passed") {
        return version.artifact
      }
    }
    return undefined
  }

  /**
   * Compute a diff between two artifact versions.
   * From ArtifactVersioning-Part02 §DiffsBetweenVersions.
   * This is a simplified line-level diff for text content.
   */
  diff(
    from: Artifact,
    to: Artifact,
    fromContent: string,
    toContent: string
  ): ArtifactDiff {
    const fromLines = fromContent.split("\n")
    const toLines = toContent.split("\n")
    const hunks = this.computeLineDiff(fromLines, toLines)

    return {
      fromArtifactId: from.id,
      toArtifactId: to.id,
      kind: from.kind,
      summary: hunks.length === 0
        ? "No changes"
        : `${hunks.length} hunk(s), ${hunks.reduce((s, h) => s + h.newLines, 0)} line(s) changed`,
      hunks,
    }
  }

  /** Simple line-level diff computation. */
  private computeLineDiff(
    oldLines: readonly string[],
    newLines: readonly string[]
  ): DiffHunk[] {
    const hunks: DiffHunk[] = []
    const maxLen = Math.max(oldLines.length, newLines.length)

    let oldStart = -1
    let newStart = -1
    let oldCount = 0
    let newCount = 0
    let content = ""

    for (let i = 0; i <= maxLen; i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]
      const changed = oldLine !== newLine

      if (changed) {
        if (oldStart === -1) {
          oldStart = i
          newStart = i
        }
        oldCount++
        newCount++
        content += (oldLine !== undefined ? `- ${oldLine}` : "") + "\n"
        content += (newLine !== undefined ? `+ ${newLine}` : "") + "\n"
      } else if (oldStart !== -1) {
        hunks.push({
          oldStart: oldStart + 1, // 1-indexed
          oldLines: oldCount,
          newStart: newStart + 1,
          newLines: newCount,
          content: content.trimEnd(),
        })
        oldStart = -1
        oldCount = 0
        newCount = 0
        content = ""
      }
    }

    return hunks
  }

  /**
   * Reconstruct a work item's history from stored records.
   * From ArtifactVersioning-Part03 §Reconstruction.
   */
  reconstruct(
    rootId: ArtifactId,
    getArtifact: (id: ArtifactId) => Artifact | undefined
  ): readonly Artifact[] {
    const chain = this.walkChain(rootId, getArtifact)
    if (!chain) return []
    return chain.versions.map((n) => n.artifact)
  }

  /**
   * Validate version chain integrity.
   * From ArtifactVersioning-Part03 §Integrity.
   */
  validateChain(
    rootId: ArtifactId,
    getArtifact: (id: ArtifactId) => Artifact | undefined
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const chain = this.walkChain(rootId, getArtifact)
    if (!chain) {
      return { valid: false, errors: ["Root artifact not found"] }
    }

    // Check version numbers are contiguous from 1
    for (let i = 0; i < chain.versions.length; i++) {
      const expectedVersion = i + 1
      const version = chain.versions[i]
      if (version && version.artifact.version !== expectedVersion) {
        errors.push(
          `Version gap: expected ${expectedVersion} at index ${i}, got ${version.artifact.version}`
        )
      }
    }

    // Check no duplicate versions
    const versions = chain.versions.map((n) => n.artifact.version)
    const uniqueVersions = new Set(versions)
    if (uniqueVersions.size !== versions.length) {
      errors.push("Duplicate version numbers in chain")
    }

    // Check no cycles
    const ids = chain.versions.map((n) => n.artifact.id)
    const uniqueIds = new Set(ids)
    if (uniqueIds.size !== ids.length) {
      errors.push("Cycle detected in version chain")
    }

    return { valid: errors.length === 0, errors }
  }

  /**
   * Check if version N is better than version M (for the refine loop).
   * From ArtifactVersioning-Part02 §WhichVersionMerges.
   * The Judge selects; later is not automatically better.
   */
  isSelectedForMerge(
    versions: readonly Artifact[],
    selectedId: ArtifactId
  ): Artifact | undefined {
    return versions.find((v) => v.id === selectedId)
  }
}
