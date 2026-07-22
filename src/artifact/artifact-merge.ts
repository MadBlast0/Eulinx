/**
 * P10-ART-MERGE — MergeManager
 *
 * Safely applies verified Artifacts to trusted project state.
 * From MergeFlow-Part01 through Part06.
 */

import { generateId } from "@/core/uuid"
import type {
  ArtifactId,
  MergeId,
  IsoTimestamp,
  WorkspaceId,
  ConflictId,
} from "@/core/types"
import { brand } from "@/core/types"
import type {
  Artifact,
  MergeResult,
} from "./artifact-types"
import { ArtifactLifecycle } from "./artifact-lifecycle"

// ---------------------------------------------------------------------------
// Merge Pipeline Stages (MergeFlow-Part01 §TheMergePipeline)
// ---------------------------------------------------------------------------

export type MergeStage =
  | "eligibility"
  | "lock"
  | "permission"
  | "approval"
  | "conflict"
  | "apply"
  | "record"

// ---------------------------------------------------------------------------
// Lock (MergeFlow-Part02 §LockAcquisition)
// ---------------------------------------------------------------------------

export interface PathLock {
  readonly path: string
  readonly mergeId: MergeId
  readonly acquiredAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Conflict (MergeFlow-Part04 §ConflictDetection)
// ---------------------------------------------------------------------------

export type ConflictType =
  | "base_revision_mismatch"
  | "same_line_conflict"
  | "file_deleted"
  | "file_renamed"
  | "symbol_modified"
  | "dependency_conflict"
  | "generated_file_exists"
  | "permission_conflict"
  | "lock_conflict"

export interface MergeConflict {
  readonly conflictId: ConflictId
  readonly artifactId: ArtifactId
  readonly type: ConflictType
  readonly path: string
  readonly message: string
  readonly detectedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Merge Request
// ---------------------------------------------------------------------------

export interface MergeRequest {
  readonly artifactId: ArtifactId
  readonly workspaceId: WorkspaceId
  readonly paths: readonly string[]
  readonly requiresApproval?: boolean
  readonly autoApprovable?: boolean
}

// ---------------------------------------------------------------------------
// Merge Pipeline Result
// ---------------------------------------------------------------------------

export interface MergePipelineResult {
  readonly success: boolean
  readonly result?: MergeResult
  readonly conflict?: MergeConflict
  readonly failedStage?: MergeStage
  readonly error?: string
}

// ---------------------------------------------------------------------------
// ArtifactMerge
// ---------------------------------------------------------------------------

export class ArtifactMerge {
  private readonly locks = new Map<string, PathLock>()
  private readonly results = new Map<string, MergeResult>()
  private readonly conflicts = new Map<string, MergeConflict>()
  private readonly lifecycle = new ArtifactLifecycle()

  /**
   * Execute the full merge pipeline.
   * From MergeFlow-Part01 §TheMergePipeline.
   */
  async merge(
    request: MergeRequest,
    artifact: Artifact,
    options: {
      checkPermissions?: (artifact: Artifact) => boolean
      checkApproval?: (artifact: Artifact) => boolean
      detectConflicts?: (artifact: Artifact) => MergeConflict | undefined
      applyArtifact?: (artifact: Artifact) => boolean
      snapshotPreMerge?: (paths: readonly string[]) => string
      rollback?: (snapshot: string) => boolean
    }
  ): Promise<MergePipelineResult> {
    const mergeId = brand<MergeId>(generateId())

    // Stage 1: Eligibility (MergeFlow-Part02 §Eligibility)
    const eligibility = this.checkEligibility(artifact, request.workspaceId)
    if (!eligibility.valid) {
      return {
        success: false,
        failedStage: "eligibility",
        error: eligibility.error,
      }
    }

    // Stage 2: Lock (MergeFlow-Part02 §LockAcquisition)
    const lockResult = this.acquireLocks(request.paths, mergeId)
    if (!lockResult.success) {
      return {
        success: false,
        failedStage: "lock",
        error: lockResult.error,
      }
    }

    // Stage 3: Permission (MergeFlow-Part02 §PermissionChecks)
    if (options.checkPermissions) {
      if (!options.checkPermissions(artifact)) {
        this.releaseLocks(request.paths, mergeId)
        return {
          success: false,
          failedStage: "permission",
          error: "Permission denied",
        }
      }
    }

    // Stage 4: Approval (MergeFlow-Part03 §ApprovalGates)
    if (request.requiresApproval && !request.autoApprovable) {
      if (options.checkApproval && !options.checkApproval(artifact)) {
        this.releaseLocks(request.paths, mergeId)
        return {
          success: false,
          failedStage: "approval",
          error: "Approval required",
        }
      }
    }

    // Stage 5: Conflict (MergeFlow-Part04 §ConflictDetection)
    if (options.detectConflicts) {
      const conflict = options.detectConflicts(artifact)
      if (conflict) {
        this.conflicts.set(conflict.conflictId, conflict)
        this.releaseLocks(request.paths, mergeId)
        return {
          success: false,
          failedStage: "conflict",
          conflict,
          error: `Conflict detected: ${conflict.type}`,
        }
      }
    }

    // Stage 6: Apply (MergeFlow-Part05 §Apply)
    let snapshot: string | undefined
    if (options.snapshotPreMerge) {
      snapshot = options.snapshotPreMerge(request.paths)
    }

    if (options.applyArtifact) {
      const applied = options.applyArtifact(artifact)
      if (!applied) {
        // Rollback (MergeFlow-Part05 §Rollback)
        if (snapshot && options.rollback) {
          options.rollback(snapshot)
        }
        this.releaseLocks(request.paths, mergeId)
        return {
          success: false,
          failedStage: "apply",
          error: "Apply failed",
        }
      }
    }

    // Stage 7: Record (MergeFlow-Part05 §MergeHistoryAndResult)
    const result = this.recordMerge(mergeId, artifact, request.paths)
    this.releaseLocks(request.paths, mergeId)

    return { success: true, result }
  }

  /**
   * Check merge eligibility.
   * From MergeFlow-Part02 §Eligibility.
   */
  checkEligibility(
    artifact: Artifact,
    workspaceId: WorkspaceId
  ): { valid: boolean; error?: string } {
    // Must be verified
    if (artifact.status !== "verified") {
      return {
        valid: false,
        error: `Artifact status is "${artifact.status}", expected "verified"`,
      }
    }

    // Must have passed verification
    if (artifact.verificationState !== "passed") {
      return {
        valid: false,
        error: `Verification state is "${artifact.verificationState}", expected "passed"`,
      }
    }

    // Must not already be merged or rejected
    if (
      artifact.mergeState === "merged" ||
      artifact.mergeState === "rejected"
    ) {
      return {
        valid: false,
        error: `Merge state is "${artifact.mergeState}"`,
      }
    }

    // Must not be expired
    if (artifact.expiresAt) {
      if (this.lifecycle.isExpired(artifact.expiresAt)) {
        return {
          valid: false,
          error: "Artifact has expired",
        }
      }
    }

    // Must be in the same workspace
    if (artifact.workspaceId !== workspaceId) {
      return {
        valid: false,
        error: "Artifact is not in the target workspace",
      }
    }

    return { valid: true }
  }

  /**
   * Acquire locks on paths.
   * From MergeFlow-Part02 §LockAcquisition.
   */
  acquireLocks(
    paths: readonly string[],
    mergeId: MergeId
  ): { success: boolean; error?: string } {
    for (const path of paths) {
      const existing = this.locks.get(path)
      if (existing && existing.mergeId !== mergeId) {
        return {
          success: false,
          error: `Lock conflict on path "${path}" held by merge ${existing.mergeId}`,
        }
      }
    }

    const now = new Date().toISOString() as IsoTimestamp
    for (const path of paths) {
      this.locks.set(path, { path, mergeId, acquiredAt: now })
    }
    return { success: true }
  }

  /**
   * Release locks on paths.
   */
  releaseLocks(paths: readonly string[], mergeId: MergeId): void {
    for (const path of paths) {
      const existing = this.locks.get(path)
      if (existing?.mergeId === mergeId) {
        this.locks.delete(path)
      }
    }
  }

  /**
   * Check if a path is locked.
   */
  isLocked(path: string): boolean {
    return this.locks.has(path)
  }

  /**
   * Get the lock holder for a path.
   */
  getLockHolder(path: string): PathLock | undefined {
    return this.locks.get(path)
  }

  /**
   * Record a successful merge.
   * From MergeFlow-Part05 §MergeHistoryAndResult.
   */
  recordMerge(
    mergeId: MergeId,
    artifact: Artifact,
    affectedPaths: readonly string[]
  ): MergeResult {
    const result: MergeResult = {
      mergeId,
      artifactId: artifact.id,
      status: "merged",
      affectedPaths,
      strategy: "direct_apply",
      createdAt: new Date().toISOString() as IsoTimestamp,
    }

    this.results.set(mergeId, result)
    return result
  }

  /**
   * Record a merge conflict.
   */
  recordConflict(
    artifactId: ArtifactId,
    type: ConflictType,
    path: string,
    message: string
  ): MergeConflict {
    const conflict: MergeConflict = {
      conflictId: brand<ConflictId>(generateId()),
      artifactId,
      type,
      path,
      message,
      detectedAt: new Date().toISOString() as IsoTimestamp,
    }
    this.conflicts.set(conflict.conflictId, conflict)
    return conflict
  }

  /**
   * Get a merge result by ID.
   */
  getResult(mergeId: MergeId): MergeResult | undefined {
    return this.results.get(mergeId)
  }

  /**
   * Get all results for an artifact.
   */
  getResultsForArtifact(artifactId: ArtifactId): readonly MergeResult[] {
    return Array.from(this.results.values()).filter(
      (r) => r.artifactId === artifactId
    )
  }

  /**
   * Get all conflicts for an artifact.
   */
  getConflictsForArtifact(artifactId: ArtifactId): readonly MergeConflict[] {
    return Array.from(this.conflicts.values()).filter(
      (c) => c.artifactId === artifactId
    )
  }

  /**
   * Validate that paths resolve inside the workspace.
   * From MergeFlow-Part02 §ScopeEnforcement.
   */
  validatePaths(
    paths: readonly string[],
    workspaceRoot: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const normalizedRoot = workspaceRoot.replace(/\\/g, "/").replace(/\/$/, "")

    for (const path of paths) {
      const normalized = path.replace(/\\/g, "/")
      if (normalized.startsWith("/") || /^[A-Z]:/i.test(normalized)) {
        errors.push(`Path "${path}" is absolute; must be relative to workspace`)
        continue
      }
      if (normalized.includes("..")) {
        errors.push(`Path "${path}" contains ".." traversal; workspace escape rejected`)
        continue
      }
      if (!normalized.startsWith(normalizedRoot) && !normalized.startsWith(".")) {
        // Allow relative paths starting with ./
      }
    }

    return { valid: errors.length === 0, errors }
  }

  /** Total locks held. */
  lockCount(): number {
    return this.locks.size
  }

  /** Total merge results recorded. */
  resultCount(): number {
    return this.results.size
  }

  /** Total conflicts recorded. */
  conflictCount(): number {
    return this.conflicts.size
  }
}
