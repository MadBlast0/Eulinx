/**
 * P10-ART-MANAGER — Artifact Manager
 *
 * The central service that stores, validates, routes, versions, indexes,
 * and exposes artifacts. From ArtifactManager-Part01 through Part06.
 *
 * Orchestrates: Registry, Storage, Lifecycle, Versioning, Relationships,
 * Search, History, Verification, Merge, Import, Export.
 */

import { randomUUID } from "node:crypto"
import type {
  ArtifactId,
  WorkspaceId,
  IsoTimestamp,
  WorkerId,
  TaskId,
} from "@/core/types"
import { brand } from "@/core/types"
import type {
  Artifact,
  ArtifactCreateRequest,
  ArtifactFilter,
  ArtifactKind,
  ArtifactStatus,
  ArtifactMetrics,
  ArtifactSearchQuery,
  ArtifactSearchResult,
  ArtifactRelationshipRequest,
  ArtifactRelationship,
  ArtifactValidationResult,
  ArtifactExportBundle,
  VerificationState,
  MergeState,
  Sensitivity,
  ArtifactHistoryRecord,
} from "./artifact-types"
import { ArtifactRegistry } from "./artifact-registry"
import { ArtifactStorage } from "./artifact-storage"
import { ArtifactLifecycle } from "./artifact-lifecycle"
import { ArtifactVersioning } from "./artifact-versioning"
import { ArtifactRelationships } from "./artifact-relationships"
import { ArtifactSearch } from "./artifact-search"
import { ArtifactHistory } from "./artifact-history"
import { ArtifactVerification } from "./artifact-verify"
import { ArtifactMerge } from "./artifact-merge"
import { ArtifactImport } from "./artifact-import"
import { ArtifactExport } from "./artifact-export"

// ---------------------------------------------------------------------------
// ArtifactManager State
// ---------------------------------------------------------------------------

export type ArtifactManagerState = "starting" | "ready" | "degraded" | "failed"

// ---------------------------------------------------------------------------
// ArtifactManager
// ---------------------------------------------------------------------------

export class ArtifactManager {
  readonly id: string
  readonly workspaceId: WorkspaceId
  private _state: ArtifactManagerState = "starting"
  private readonly registry: ArtifactRegistry
  private readonly storage: ArtifactStorage
  private readonly lifecycle: ArtifactLifecycle
  private readonly versioning: ArtifactVersioning
  private readonly relationships: ArtifactRelationships
  private readonly search: ArtifactSearch
  readonly history: ArtifactHistory
  readonly verification: ArtifactVerification
  readonly merge: ArtifactMerge
  private readonly import: ArtifactImport
  private readonly export: ArtifactExport

  constructor(workspaceId: WorkspaceId) {
    this.id = randomUUID()
    this.workspaceId = workspaceId
    this.registry = new ArtifactRegistry()
    this.storage = new ArtifactStorage()
    this.lifecycle = new ArtifactLifecycle()
    this.versioning = new ArtifactVersioning()
    this.relationships = new ArtifactRelationships()
    this.search = new ArtifactSearch()
    this.history = new ArtifactHistory()
    this.verification = new ArtifactVerification()
    this.merge = new ArtifactMerge()
    this.import = new ArtifactImport()
    this.export = new ArtifactExport()
    this._state = "ready"
  }

  /** Current state. */
  get state(): ArtifactManagerState {
    return this._state
  }

  // -------------------------------------------------------------------------
  // Creation (ArtifactManager-Part03 §CreationFlow)
  // -------------------------------------------------------------------------

  /**
   * Create a new artifact.
   * From ArtifactManager-Part03: permission check -> schema validation ->
   * content storage -> metadata storage -> event emission.
   */
  create(request: ArtifactCreateRequest): {
    artifact: Artifact
    validation: ArtifactValidationResult
  } {
    // Validate kind is registered
    if (!this.registry.has(request.kind)) {
      throw new Error(`Unknown artifact kind: "${request.kind}"`)
    }

    // Compute content hash and size
    const contentHash = this.storage.computeHash(request.content)
    const sizeBytes = this.storage.computeSize(request.content)

    // Check for dedup by content hash
    const existingId = this.storage.findByHash(contentHash)
    if (existingId) {
      const existing = this.storage.getArtifact(existingId)
      if (existing) {
        return {
          artifact: existing,
          validation: { valid: true, errors: [], warnings: ["Artifact with identical content already exists"] },
        }
      }
    }

    // Create the artifact
    const id = brand<ArtifactId>(randomUUID())
    const now = new Date().toISOString() as IsoTimestamp

    const contentRef = this.storage.storeContent(id, request.content)

    const artifact: Artifact = {
      id,
      workspaceId: this.workspaceId,
      projectId: request.projectId,
      sessionId: request.sessionId,
      executionId: request.executionId,
      workflowId: request.workflowId,
      taskId: request.taskId,
      workerId: request.workerId,
      rootWorkerId: request.rootWorkerId,
      kind: request.kind,
      title: request.title,
      description: request.description,
      contentRef,
      contentType: request.contentType,
      status: "created", // draft -> created at creation
      version: 1,
      parentArtifactId: request.parentArtifactId,
      sensitivity: request.sensitivity ?? "public",
      contentHash,
      verificationState: "unverified",
      mergeState: "unmerged",
      sizeBytes,
      checksumAlgo: "sha256",
      tags: request.tags ?? [],
      sourceNodeId: request.sourceNodeId,
      provenanceChain: request.parentArtifactId
        ? [request.parentArtifactId]
        : [],
      expiresAt: request.expiresAt,
      schemaRef: request.schemaRef,
      createdAt: now,
      updatedAt: now,
    }

    // Validate (ArtifactLifecycle-Part02 §Validation)
    const validation = this.validateArtifact(artifact)

    // Store
    this.storage.setArtifact(artifact, request.content)
    this.search.index(artifact)

    // Record history
    this.history.append(artifact.id, null, "created", {
      workerId: request.workerId,
      taskId: request.taskId,
      workflowId: request.workflowId,
      sessionId: request.sessionId,
    })

    // Create parent-child relationship if parent exists
    if (request.parentArtifactId) {
      this.relationships.create({
        fromArtifactId: id,
        toArtifactId: request.parentArtifactId,
        relation: "parent-child",
        createdBy: request.workerId ?? "system",
      })
    }

    return { artifact, validation }
  }

  // -------------------------------------------------------------------------
  // Validation (ArtifactLifecycle-Part02 §Validation)
  // -------------------------------------------------------------------------

  /**
   * Validate an artifact's structure.
   * Structural validation, not semantic (correctness is verification's job).
   */
  validateArtifact(artifact: Artifact): ArtifactValidationResult {
    const errors: ArtifactValidationResult["errors"] = []
    const warnings: string[] = []

    // Check kind is registered
    if (!this.registry.has(artifact.kind)) {
      errors.push({
        field: "kind",
        message: `Unknown artifact kind: "${artifact.kind}"`,
        code: "UNKNOWN_KIND",
      })
    }

    // Check content hash is present
    if (!artifact.contentHash) {
      errors.push({
        field: "contentHash",
        message: "Content hash is required",
        code: "MISSING_CONTENT_HASH",
      })
    }

    // Check content ref is present
    if (!artifact.contentRef) {
      errors.push({
        field: "contentRef",
        message: "Content reference is required",
        code: "MISSING_CONTENT_REF",
      })
    }

    // Check title is non-empty
    if (!artifact.title || artifact.title.trim().length === 0) {
      errors.push({
        field: "title",
        message: "Title is required",
        code: "EMPTY_TITLE",
      })
    }

    // Check workspace matches
    if (artifact.workspaceId !== this.workspaceId) {
      errors.push({
        field: "workspaceId",
        message: "Artifact workspace does not match manager workspace",
        code: "WORKSPACE_MISMATCH",
      })
    }

    // Check version is positive
    if (artifact.version < 1) {
      errors.push({
        field: "version",
        message: "Version must be >= 1",
        code: "INVALID_VERSION",
      })
    }

    // Check sensitivity is valid
    const validSensitivities: Sensitivity[] = ["public", "internal", "sensitive", "secret"]
    if (!validSensitivities.includes(artifact.sensitivity)) {
      errors.push({
        field: "sensitivity",
        message: `Invalid sensitivity: "${artifact.sensitivity}"`,
        code: "INVALID_SENSITIVITY",
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  // -------------------------------------------------------------------------
  // Retrieval
  // -------------------------------------------------------------------------

  /** Get an artifact by ID. */
  get(id: ArtifactId): Artifact | undefined {
    return this.storage.getArtifact(id)
  }

  /** Get artifact content. */
  getContent(id: ArtifactId): string | Uint8Array | undefined {
    return this.storage.getArtifactContent(id)
  }

  /** List artifacts matching a filter. */
  list(filter: ArtifactFilter): readonly Artifact[] {
    let results = Array.from(this.search["artifacts"].values()) as Artifact[]

    if (filter.workspaceId) {
      results = results.filter((a) => a.workspaceId === filter.workspaceId)
    }
    if (filter.kind) {
      const kinds = Array.isArray(filter.kind) ? filter.kind : [filter.kind]
      results = results.filter((a) => kinds.includes(a.kind))
    }
    if (filter.status) {
      const statuses = Array.isArray(filter.status)
        ? filter.status
        : [filter.status]
      results = results.filter((a) => statuses.includes(a.status))
    }
    if (filter.workerId) {
      results = results.filter((a) => a.workerId === filter.workerId)
    }
    if (filter.taskId) {
      results = results.filter((a) => a.taskId === filter.taskId)
    }
    if (filter.workflowId) {
      results = results.filter((a) => a.workflowId === filter.workflowId)
    }
    if (filter.sessionId) {
      results = results.filter((a) => a.sessionId === filter.sessionId)
    }
    if (filter.tags && filter.tags.length > 0) {
      results = results.filter((a) =>
        filter.tags!.some((t) => a.tags.includes(t))
      )
    }
    if (filter.parentArtifactId) {
      results = results.filter(
        (a) => a.parentArtifactId === filter.parentArtifactId
      )
    }

    const offset = filter.offset ?? 0
    const limit = filter.limit ?? 50
    return results.slice(offset, offset + limit)
  }

  // -------------------------------------------------------------------------
  // Status Transitions
  // -------------------------------------------------------------------------

  /**
   * Transition an artifact to a new status.
   * From ArtifactLifecycle-Part01 §LegalTransitions.
   */
  transition(
    id: ArtifactId,
    toStatus: ArtifactStatus,
    options?: {
      reason?: string
      workerId?: WorkerId
      taskId?: TaskId
      workflowId?: WorkflowId
      sessionId?: SessionId
    }
  ): { success: boolean; artifact?: Artifact; error?: string } {
    const artifact = this.storage.getArtifact(id)
    if (!artifact) {
      return { success: false, error: `Artifact ${id} not found` }
    }

    const transitionResult = this.lifecycle.validateTransition(
      artifact.status,
      toStatus,
      options?.reason
    )

    if (!transitionResult.valid) {
      return { success: false, error: transitionResult.error }
    }

    // Update artifact status
    const updated: Artifact = {
      ...artifact,
      status: toStatus,
      updatedAt: new Date().toISOString() as IsoTimestamp,
    }

    // Store updated artifact
    const content = this.storage.getArtifactContent(id)
    if (content) {
      this.storage.setArtifact(updated, content)
    }

    // Update search index
    this.search.index(updated)

    // Record history
    this.history.append(id, artifact.status, toStatus, {
      workerId: options?.workerId,
      taskId: options?.taskId,
      workflowId: options?.workflowId,
      sessionId: options?.sessionId,
      reason: options?.reason,
    })

    return { success: true, artifact: updated }
  }

  // -------------------------------------------------------------------------
  // Versioning
  // -------------------------------------------------------------------------

  /**
   * Create a new version of an artifact.
   * From ArtifactVersioning-Part01 §TheVersionModel.
   */
  createVersion(
    parentId: ArtifactId,
    content: string | Uint8Array,
    contentType: string
  ): { artifact: Artifact; validation: ArtifactValidationResult } | undefined {
    const parent = this.storage.getArtifact(parentId)
    if (!parent) return undefined

    const newId = brand<ArtifactId>(randomUUID())
    const contentHash = this.storage.computeHash(content)
    const contentRef = this.storage.storeContent(newId, content)

    const artifact = this.versioning.createNextVersion(
      parent,
      newId,
      contentHash,
      contentRef
    )

    this.storage.setArtifact(artifact, content)
    this.search.index(artifact)

    // Create parent-child relationship
    this.relationships.create({
      fromArtifactId: newId,
      toArtifactId: parentId,
      relation: "parent-child",
      createdBy: artifact.workerId ?? "system",
    })

    // Record history
    this.history.append(newId, null, "created", {
      workerId: artifact.workerId,
      taskId: artifact.taskId,
      workflowId: artifact.workflowId,
      sessionId: artifact.sessionId,
      reason: `Version ${artifact.version} of ${parentId}`,
    })

    const validation = this.validateArtifact(artifact)
    return { artifact, validation }
  }

  /**
   * Get the version chain for an artifact.
   */
  getVersionChain(artifactId: ArtifactId) {
    return this.versioning.walkChain(artifactId, (id) =>
      this.storage.getArtifact(id)
    )
  }

  /**
   * Get the latest verified version in a chain.
   */
  getLatestVerified(artifactId: ArtifactId): Artifact | undefined {
    return this.versioning.getLatestVerified(artifactId, (id) =>
      this.storage.getArtifact(id)
    )
  }

  /**
   * Diff two artifact versions.
   */
  diffVersions(fromId: ArtifactId, toId: ArtifactId) {
    const from = this.storage.getArtifact(fromId)
    const to = this.storage.getArtifact(toId)
    if (!from || !to) return undefined

    const fromContent = this.storage.getArtifactContent(fromId)
    const toContent = this.storage.getArtifactContent(toId)
    if (!fromContent || !toContent) return undefined

    const fromStr = typeof fromContent === "string" ? fromContent : new TextDecoder().decode(fromContent)
    const toStr = typeof toContent === "string" ? toContent : new TextDecoder().decode(toContent)

    return this.versioning.diff(from, to, fromStr, toStr)
  }

  // -------------------------------------------------------------------------
  // Relationships
  // -------------------------------------------------------------------------

  /** Create a relationship between two artifacts. */
  createRelationship(request: ArtifactRelationshipRequest): ArtifactRelationship | null {
    return this.relationships.create(request)
  }

  /** Get outgoing relationships from an artifact. */
  getOutgoingRelationships(artifactId: ArtifactId): readonly ArtifactRelationship[] {
    return this.relationships.getOutgoing(artifactId)
  }

  /** Get incoming relationships to an artifact. */
  getIncomingRelationships(artifactId: ArtifactId): readonly ArtifactRelationship[] {
    return this.relationships.getIncoming(artifactId)
  }

  /** Get the derivation chain for an artifact. */
  getDerivationChain(artifactId: ArtifactId): readonly ArtifactId[] {
    return this.relationships.walkDerivationChain(artifactId)
  }

  // -------------------------------------------------------------------------
  // Search
  // -------------------------------------------------------------------------

  /** Search artifacts. */
  searchArtifacts(query: ArtifactSearchQuery): readonly ArtifactSearchResult[] {
    return this.search.search(query)
  }

  // -------------------------------------------------------------------------
  // Verification
  // -------------------------------------------------------------------------

  /**
   * Update an artifact's verification state.
   */
  updateVerificationState(
    artifactId: ArtifactId,
    verificationState: VerificationState
  ): Artifact | undefined {
    const artifact = this.storage.getArtifact(artifactId)
    if (!artifact) return undefined

    const updated: Artifact = {
      ...artifact,
      verificationState,
      updatedAt: new Date().toISOString() as IsoTimestamp,
    }

    const content = this.storage.getArtifactContent(artifactId)
    if (content) {
      this.storage.setArtifact(updated, content)
    }
    this.search.index(updated)
    return updated
  }

  // -------------------------------------------------------------------------
  // Merge
  // -------------------------------------------------------------------------

  /**
   * Update an artifact's merge state.
   */
  updateMergeState(
    artifactId: ArtifactId,
    mergeState: MergeState
  ): Artifact | undefined {
    const artifact = this.storage.getArtifact(artifactId)
    if (!artifact) return undefined

    const updated: Artifact = {
      ...artifact,
      mergeState,
      updatedAt: new Date().toISOString() as IsoTimestamp,
    }

    const content = this.storage.getArtifactContent(artifactId)
    if (content) {
      this.storage.setArtifact(updated, content)
    }
    this.search.index(updated)
    return updated
  }

  // -------------------------------------------------------------------------
  // Import/Export
  // -------------------------------------------------------------------------

  /** Import an artifact from a source. */
  importArtifact(
    source: Parameters<ArtifactImport["import"]>[0],
    options?: Parameters<ArtifactImport["import"]>[2]
  ) {
    return this.import.import(source, this.workspaceId, options)
  }

  /** Export artifacts matching a filter. */
  exportArtifacts(
    filter: Omit<Parameters<ArtifactExport["export"]>[0], "workspaceId">,
    artifactIds: readonly ArtifactId[]
  ) {
    return this.export.export(
      { ...filter, workspaceId: this.workspaceId },
      (id) => this.storage.getArtifact(id),
      (id) => this.storage.getArtifactContent(id),
      (id) => this.relationships.getAll(id)
    )
  }

  // -------------------------------------------------------------------------
  // History
  // -------------------------------------------------------------------------

  /** Get artifact history. */
  getArtifactHistory(artifactId: ArtifactId): readonly ArtifactHistoryRecord[] {
    return this.history.readArtifactHistory(artifactId)
  }

  // -------------------------------------------------------------------------
  // Metrics
  // -------------------------------------------------------------------------

  /** Get artifact metrics. */
  getMetrics(): ArtifactMetrics {
    const all = this.search.findByWorkspace(this.workspaceId)
    const byStatus: Record<ArtifactStatus, number> = {
      draft: 0,
      created: 0,
      validated: 0,
      verified: 0,
      rejected: 0,
      merged: 0,
      archived: 0,
    }
    const byKind: Record<ArtifactKind, number> = {
      plan: 0,
      task_list: 0,
      patch: 0,
      code: 0,
      markdown: 0,
      json: 0,
      image: 0,
      test_report: 0,
      log: 0,
      diagram: 0,
      prompt: 0,
      model_response: 0,
      review: 0,
      verification_result: 0,
      merge_result: 0,
    }

    let totalSizeBytes = 0
    let pendingVerification = 0
    let pendingMerge = 0

    for (const artifact of all) {
      byStatus[artifact.status]++
      byKind[artifact.kind]++
      totalSizeBytes += artifact.sizeBytes ?? 0
      if (
        artifact.verificationState === "unverified" ||
        artifact.verificationState === "pending"
      ) {
        pendingVerification++
      }
      if (
        artifact.status === "verified" &&
        (artifact.mergeState === "eligible" || artifact.mergeState === "unmerged")
      ) {
        pendingMerge++
      }
    }

    return {
      totalArtifacts: all.length,
      byStatus,
      byKind,
      totalSizeBytes,
      pendingVerification,
      pendingMerge,
      lastCreatedAt: all.length > 0
        ? all.reduce((latest, a) =>
            a.createdAt > latest ? a.createdAt : latest, all[0].createdAt
          )
        : undefined,
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /** Archive an artifact. */
  archive(artifactId: ArtifactId): { success: boolean; error?: string } {
    return this.transition(artifactId, "archived", { reason: "Archived by manager" })
  }

  /** Expire an artifact (if past expiresAt). */
  expireIfExpired(artifactId: ArtifactId): { success: boolean; expired?: boolean; error?: string } {
    const artifact = this.storage.getArtifact(artifactId)
    if (!artifact) {
      return { success: false, error: `Artifact ${artifactId} not found` }
    }

    if (!artifact.expiresAt) {
      return { success: true, expired: false }
    }

    if (this.lifecycle.isExpired(artifact.expiresAt) && artifact.status !== "merged") {
      const result = this.transition(artifactId, "archived", { reason: "Expired" })
      return { success: result.success, expired: true, error: result.error }
    }

    return { success: true, expired: false }
  }

  // -------------------------------------------------------------------------
  // Registry
  // -------------------------------------------------------------------------

  /** Get the kind registry. */
  getRegistry(): ArtifactRegistry {
    return this.registry
  }

  /** Get the relationships module. */
  getRelationships(): ArtifactRelationships {
    return this.relationships
  }

  /** Get the storage module. */
  getStorage(): ArtifactStorage {
    return this.storage
  }
}
