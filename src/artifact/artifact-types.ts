/**
 * P10-ART-META / P10-ART-REGISTRY — Artifact Types
 *
 * Core types for the Artifact system: the Artifact object, metadata envelope,
 * content references, sensitivity levels, verification/merge states, and
 * the kind registry from ArtifactArchitecture-Part01 through Part05.
 */

import type {
  ArtifactId,
  IsoTimestamp,
  SessionId,
  WorkerId,
  WorkspaceId,
  WorkflowId,
  ExecutionId,
  TaskId,
  ConflictId,
  MergeId,
} from "@/core/types"

// ---------------------------------------------------------------------------
// Artifact Kind (ArtifactArchitecture-Part04 §BaselineRegistry)
// ---------------------------------------------------------------------------

export type ArtifactKind =
  | "plan"
  | "task_list"
  | "patch"
  | "code"
  | "markdown"
  | "json"
  | "image"
  | "test_report"
  | "log"
  | "diagram"
  | "prompt"
  | "model_response"
  | "review"
  | "verification_result"
  | "merge_result"
  | "file"

// ---------------------------------------------------------------------------
// Artifact Status (ArtifactLifecycle-Part01 §LifecycleStateMachine)
// ---------------------------------------------------------------------------

export type ArtifactStatus =
  | "draft"
  | "created"
  | "validated"
  | "verified"
  | "rejected"
  | "merged"
  | "archived"

// ---------------------------------------------------------------------------
// Sensitivity (ArtifactArchitecture-Part02 §SensitivityAndRedaction)
// ---------------------------------------------------------------------------

export type Sensitivity = "public" | "internal" | "sensitive" | "secret"

// ---------------------------------------------------------------------------
// Verification State (ArtifactLifecycle-Part03 §VerificationEntry)
// ---------------------------------------------------------------------------

export type VerificationState = "unverified" | "pending" | "passed" | "failed"

// ---------------------------------------------------------------------------
// Merge State (MergeFlow-Part01 §MergePipeline)
// ---------------------------------------------------------------------------

export type MergeState = "unmerged" | "eligible" | "merged" | "rejected" | "conflicted"

// ---------------------------------------------------------------------------
// Content Reference (ArtifactArchitecture-Part03 §ContentAddressing)
// ---------------------------------------------------------------------------

export type ContentRefScheme = "sqlite" | "file" | "blob"

export interface ContentRef {
  readonly scheme: ContentRefScheme
  readonly path: string
}

// ---------------------------------------------------------------------------
// Artifact Metadata Envelope (ArtifactArchitecture-Part02 §MetadataEnvelope)
// ---------------------------------------------------------------------------

export interface ArtifactMeta {
  readonly id: ArtifactId
  readonly workspaceId: WorkspaceId
  readonly projectId?: string
  readonly sessionId?: SessionId
  readonly executionId?: ExecutionId
  readonly workflowId?: WorkflowId
  readonly taskId?: TaskId
  readonly workerId?: WorkerId
  readonly rootWorkerId?: WorkerId
  readonly kind: ArtifactKind
  readonly title: string
  readonly description?: string
  readonly contentRef: ContentRef
  readonly contentType: string
  readonly status: ArtifactStatus
  readonly version: number
  readonly parentArtifactId?: ArtifactId
  readonly sensitivity: Sensitivity
  readonly contentHash: string
  readonly verificationState: VerificationState
  readonly mergeState: MergeState
  readonly sizeBytes?: number
  readonly checksumAlgo?: string
  readonly tags: readonly string[]
  readonly sourceNodeId?: string
  readonly provenanceChain: readonly ArtifactId[]
  readonly expiresAt?: IsoTimestamp
  readonly schemaRef?: string
  readonly approvedBy?: string
  readonly approvedAt?: IsoTimestamp
  readonly rejectionReason?: string
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Artifact Record (full, with mutable tracking)
// ---------------------------------------------------------------------------

export interface Artifact extends ArtifactMeta {}

// ---------------------------------------------------------------------------
// Artifact Create Request (ArtifactManager-Part03 §ArtifactCreateRequest)
// ---------------------------------------------------------------------------

export interface ArtifactCreateRequest {
  readonly workspaceId: WorkspaceId
  readonly kind: ArtifactKind
  readonly title: string
  readonly description?: string
  readonly content: string | Uint8Array
  readonly contentType: string
  readonly workerId?: WorkerId
  readonly rootWorkerId?: WorkerId
  readonly projectId?: string
  readonly sessionId?: SessionId
  readonly executionId?: ExecutionId
  readonly workflowId?: WorkflowId
  readonly taskId?: TaskId
  readonly parentArtifactId?: ArtifactId
  readonly sensitivity?: Sensitivity
  readonly tags?: readonly string[]
  readonly sourceNodeId?: string
  readonly expiresAt?: IsoTimestamp
  readonly schemaRef?: string
  readonly metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Artifact Filter (ArtifactManager-Part06 §PublicAPI)
// ---------------------------------------------------------------------------

export interface ArtifactFilter {
  readonly workspaceId?: WorkspaceId
  readonly kind?: ArtifactKind | readonly ArtifactKind[]
  readonly status?: ArtifactStatus | readonly ArtifactStatus[]
  readonly workerId?: WorkerId
  readonly taskId?: TaskId
  readonly workflowId?: WorkflowId
  readonly sessionId?: SessionId
  readonly sensitivity?: Sensitivity
  readonly tags?: readonly string[]
  readonly parentArtifactId?: ArtifactId
  readonly limit?: number
  readonly offset?: number
}

// ---------------------------------------------------------------------------
// Artifact Relationship (ArtifactRelationships-Part01 §RelationshipRecord)
// ---------------------------------------------------------------------------

export type ArtifactRelation =
  | "parent-child"
  | "derived-from"
  | "references"
  | "supersedes"
  | "attached-to"

export interface ArtifactRelationship {
  readonly id: string
  readonly fromArtifactId: ArtifactId
  readonly toArtifactId: ArtifactId
  readonly relation: ArtifactRelation
  readonly context?: string
  readonly createdBy: string
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Artifact Relationship Request
// ---------------------------------------------------------------------------

export interface ArtifactRelationshipRequest {
  readonly fromArtifactId: ArtifactId
  readonly toArtifactId: ArtifactId
  readonly relation: ArtifactRelation
  readonly context?: string
  readonly createdBy: string
}

// ---------------------------------------------------------------------------
// Artifact Validation Result (ArtifactLifecycle-Part02 §Validation)
// ---------------------------------------------------------------------------

export interface ArtifactValidationResult {
  readonly valid: boolean
  readonly errors: readonly ArtifactValidationError[]
  readonly warnings: readonly string[]
}

export interface ArtifactValidationError {
  readonly field: string
  readonly message: string
  readonly code: string
}

// ---------------------------------------------------------------------------
// Artifact Diff (ArtifactVersioning-Part02 §DiffsBetweenVersions)
// ---------------------------------------------------------------------------

export interface ArtifactDiff {
  readonly fromArtifactId: ArtifactId
  readonly toArtifactId: ArtifactId
  readonly kind: ArtifactKind
  readonly summary: string
  readonly hunks?: readonly DiffHunk[]
}

export interface DiffHunk {
  readonly oldStart: number
  readonly oldLines: number
  readonly newStart: number
  readonly newLines: number
  readonly content: string
}

// ---------------------------------------------------------------------------
// Verification Verdict (Verification-Part01 §TheCoreRule)
// ---------------------------------------------------------------------------

export type VerdictOutcome = "pass" | "fail" | "timeout" | "error" | "skipped"

export interface VerificationVerdict {
  readonly artifactId: ArtifactId
  readonly verifierWorkerId: WorkerId
  readonly verifierFingerprint: string
  readonly outcome: VerdictOutcome
  readonly authoritative: boolean
  readonly class: "deterministic" | "ai"
  readonly score?: number
  readonly threshold?: number
  readonly findings: readonly VerificationFinding[]
  readonly durationMs: number
  readonly createdAt: IsoTimestamp
}

export interface VerificationFinding {
  readonly id: string
  readonly severity: "error" | "warning" | "info"
  readonly code: string
  readonly message: string
  readonly filePath?: string
  readonly line?: number
  readonly column?: number
  readonly excerpt?: string
}

// ---------------------------------------------------------------------------
// Merge Result (MergeFlow-Part05 §MergeHistoryAndResult)
// ---------------------------------------------------------------------------

export interface MergeResult {
  readonly mergeId: MergeId
  readonly artifactId: ArtifactId
  readonly conflictId?: ConflictId
  readonly status: "merged" | "rejected" | "conflicted" | "rolled_back"
  readonly affectedPaths: readonly string[]
  readonly beforeHash?: string
  readonly afterHash?: string
  readonly strategy?: string
  readonly approvedBy?: string
  readonly approvedAt?: IsoTimestamp
  readonly rolledBackAt?: IsoTimestamp
  readonly error?: string
  readonly createdAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Artifact History Record (HistoryTables-Part01 §ObjectModel)
// ---------------------------------------------------------------------------

export interface ArtifactHistoryRecord {
  readonly sequence: number
  readonly artifactId: ArtifactId
  readonly fromStatus: ArtifactStatus | null
  readonly toStatus: ArtifactStatus
  readonly workerId?: WorkerId
  readonly taskId?: TaskId
  readonly workflowId?: WorkflowId
  readonly sessionId?: SessionId
  readonly reason?: string
  readonly metadata?: Record<string, unknown>
  readonly timestamp: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Artifact Version Chain Query
// ---------------------------------------------------------------------------

export interface VersionChainQuery {
  readonly rootArtifactId: ArtifactId
  readonly latestOnly?: boolean
  readonly verificationState?: VerificationState
}

// ---------------------------------------------------------------------------
// Artifact Search Query
// ---------------------------------------------------------------------------

export interface ArtifactSearchQuery {
  readonly workspaceId: WorkspaceId
  readonly text?: string
  readonly kind?: ArtifactKind | readonly ArtifactKind[]
  readonly status?: ArtifactStatus | readonly ArtifactStatus[]
  readonly workerId?: WorkerId
  readonly taskId?: TaskId
  readonly tags?: readonly string[]
  readonly maxResults?: number
}

export interface ArtifactSearchResult {
  readonly artifact: Artifact
  readonly score: number
  readonly matchType: "semantic" | "keyword" | "exact"
}

// ---------------------------------------------------------------------------
// Artifact Export Bundle
// ---------------------------------------------------------------------------

export interface ArtifactExportBundle {
  readonly version: string
  readonly exportedAt: IsoTimestamp
  readonly workspaceId: WorkspaceId
  readonly artifacts: readonly ArtifactExportEntry[]
  readonly relationships: readonly ArtifactRelationship[]
}

export interface ArtifactExportEntry {
  readonly meta: ArtifactMeta
  readonly content: string | Uint8Array
}

// ---------------------------------------------------------------------------
// Retention Policy (ArtifactLifecycle-Part06 §RetentionPolicy)
// ---------------------------------------------------------------------------

export type RetentionPolicy =
  | "keep_forever"
  | "keep_until_session_end"
  | "keep_until_execution_end"
  | "keep_latest_only"
  | "manual_delete"

export interface ArtifactRetentionPolicy {
  readonly workspaceId: WorkspaceId
  readonly kind: ArtifactKind
  readonly policy: RetentionPolicy
  readonly maxAgeMs?: number
  readonly maxVersions?: number
}

// ---------------------------------------------------------------------------
// Artifact Metrics
// ---------------------------------------------------------------------------

export interface ArtifactMetrics {
  readonly totalArtifacts: number
  readonly byStatus: Readonly<Record<ArtifactStatus, number>>
  readonly byKind: Readonly<Record<ArtifactKind, number>>
  readonly totalSizeBytes: number
  readonly pendingVerification: number
  readonly pendingMerge: number
  readonly lastCreatedAt?: IsoTimestamp
}
