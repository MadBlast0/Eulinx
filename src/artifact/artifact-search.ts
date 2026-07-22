/**
 * P10-ART-SEARCH — Artifact Search
 *
 * Search modes for artifacts: by ID, type, task, worker, workflow, status,
 * full-text. From ArtifactManager-Part04 §SearchModes.
 */

import type {
  Artifact,
  ArtifactKind,
  ArtifactStatus,
  ArtifactSearchQuery,
  ArtifactSearchResult,
} from "./artifact-types"
import type { ArtifactId, WorkspaceId, WorkerId, TaskId } from "@/core/types"

// ---------------------------------------------------------------------------
// ArtifactSearch
// ---------------------------------------------------------------------------

export class ArtifactSearch {
  private readonly artifacts = new Map<string, Artifact>()

  /** Index an artifact for search. */
  index(artifact: Artifact): void {
    this.artifacts.set(artifact.id, artifact)
  }

  /** Remove an artifact from the index. */
  remove(artifactId: ArtifactId): void {
    this.artifacts.delete(artifactId)
  }

  /**
   * Search artifacts by query.
   * From ArtifactManager-Part04 §SearchModes.
   */
  search(query: ArtifactSearchQuery): readonly ArtifactSearchResult[] {
    let candidates = Array.from(this.artifacts.values())

    // Filter by workspace
    if (query.workspaceId) {
      candidates = candidates.filter((a) => a.workspaceId === query.workspaceId)
    }

    // Filter by kind
    if (query.kind) {
      const kinds = Array.isArray(query.kind) ? query.kind : [query.kind]
      candidates = candidates.filter((a) => kinds.includes(a.kind))
    }

    // Filter by status
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status]
      candidates = candidates.filter((a) => statuses.includes(a.status))
    }

    // Filter by worker
    if (query.workerId) {
      candidates = candidates.filter((a) => a.workerId === query.workerId)
    }

    // Filter by task
    if (query.taskId) {
      candidates = candidates.filter((a) => a.taskId === query.taskId)
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      const tags = query.tags
      candidates = candidates.filter((a) =>
        tags.some((t) => a.tags.includes(t))
      )
    }

    // Text search (keyword matching)
    if (query.text) {
      const textLower = query.text.toLowerCase()
      candidates = candidates.filter(
        (a) =>
          a.title.toLowerCase().includes(textLower) ||
          (a.description?.toLowerCase().includes(textLower) ?? false) ||
          a.tags.some((t) => t.toLowerCase().includes(textLower))
      )
    }

    // Score and sort (simplified: title match > description match > tag match)
    const results: ArtifactSearchResult[] = candidates.map((artifact) => {
      let score = 0
      let matchType: ArtifactSearchResult["matchType"] = "keyword"

      if (query.text) {
        const textLower = query.text.toLowerCase()
        if (artifact.title.toLowerCase() === textLower) {
          score = 1.0
          matchType = "exact"
        } else if (artifact.title.toLowerCase().includes(textLower)) {
          score = 0.8
        } else if (artifact.description?.toLowerCase().includes(textLower)) {
          score = 0.6
        } else if (artifact.tags.some((t) => t.toLowerCase().includes(textLower))) {
          score = 0.4
        }
      } else {
        score = 1.0 // no text filter = match all
      }

      return { artifact, score, matchType }
    })

    // Sort by score descending
    results.sort((a, b) => b.score - a.score)

    // Apply limit
    const limit = query.maxResults ?? 50
    return results.slice(0, limit)
  }

  /**
   * Search by ID (exact match).
   */
  findById(artifactId: ArtifactId): Artifact | undefined {
    return this.artifacts.get(artifactId)
  }

  /**
   * Search by type.
   */
  findByKind(kind: ArtifactKind): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.kind === kind)
  }

  /**
   * Search by status.
   */
  findByStatus(status: ArtifactStatus): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.status === status)
  }

  /**
   * Search by worker.
   */
  findByWorker(workerId: WorkerId): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.workerId === workerId
    )
  }

  /**
   * Search by task.
   */
  findByTask(taskId: TaskId): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.taskId === taskId
    )
  }

  /**
   * Search by workspace.
   */
  findByWorkspace(workspaceId: WorkspaceId): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.workspaceId === workspaceId
    )
  }

  /**
   * Search by sensitivity level.
   */
  findBySensitivity(sensitivity: Artifact["sensitivity"]): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.sensitivity === sensitivity
    )
  }

  /**
   * Get all artifacts with a pending verification state.
   */
  pendingVerification(): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) =>
        a.verificationState === "unverified" ||
        a.verificationState === "pending"
    )
  }

  /**
   * Get all artifacts eligible for merge.
   */
  mergeEligible(): readonly Artifact[] {
    return Array.from(this.artifacts.values()).filter(
      (a) => a.status === "verified" && a.mergeState === "eligible"
    )
  }

  /** Total indexed artifacts. */
  size(): number {
    return this.artifacts.size
  }
}
