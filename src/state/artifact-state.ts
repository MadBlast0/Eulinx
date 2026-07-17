/**
 * P04-STATE-ARTIFACT — Artifact State Persistence
 *
 * Persistent artifact state from Artifact-Part01 through Part04 and
 * ArtifactArchitecture-Part01 through Part05.
 *
 * Artifacts are content-addressed, immutable records of work produced
 * by Workers. Their state must be persisted to support verification,
 * merge, replay, and audit.
 *
 * From ArtifactArchitecture-Part01: the artifact contract, immutability,
 * and the propose/don't-mutate boundary.
 * From Artifact-Part02: verification, status, and lifecycle.
 */

import type {
  ArtifactId,
  WorkspaceId,
  IsoTimestamp,
  JsonValue,
} from "@/core/types"
import type { ArtifactKind } from "@/core/enums"
import type { PersistenceMetadata, SequenceNumber } from "./state-types"

// ---------------------------------------------------------------------------
// Artifact lifecycle state (from Artifact-Part02)
// ---------------------------------------------------------------------------

export type ArtifactStatus =
  | "draft"
  | "pending_verification"
  | "verified"
  | "rejected"
  | "approved"
  | "archived"

export const ARTIFACT_TERMINAL: readonly ArtifactStatus[] = [
  "archived",
] as const

// ---------------------------------------------------------------------------
// Artifact state machine
// ---------------------------------------------------------------------------

const ARTIFACT_TRANSITIONS: Map<ArtifactStatus, readonly ArtifactStatus[]> = new Map([
  ["draft", ["pending_verification", "archived"]],
  ["pending_verification", ["verified", "rejected", "archived"]],
  ["verified", ["approved", "rejected", "archived"]],
  ["rejected", ["draft", "archived"]],
  ["approved", ["archived"]],
  ["archived", []],
])

export function canArtifactTransition(from: ArtifactStatus, to: ArtifactStatus): boolean {
  const allowed = ARTIFACT_TRANSITIONS.get(from)
  return allowed !== undefined && (allowed as readonly ArtifactStatus[]).includes(to)
}

export function getArtifactTransitions(state: ArtifactStatus): readonly ArtifactStatus[] {
  return ARTIFACT_TRANSITIONS.get(state) ?? []
}

// ---------------------------------------------------------------------------
// Artifact verification
// ---------------------------------------------------------------------------

export type VerificationMethod =
  | "ai_review"
  | "human_review"
  | "static_analysis"
  | "unit_tests"
  | "integration_tests"
  | "policy_validation"
  | "security_scan"

export interface ArtifactVerification {
  readonly method: VerificationMethod
  readonly passed: boolean
  readonly message?: string
  readonly verifiedAt: IsoTimestamp
  readonly verifiedBy: string
}

// ---------------------------------------------------------------------------
// Persisted artifact state
// ---------------------------------------------------------------------------

export interface PersistedArtifactState {
  readonly id: ArtifactId
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly taskId?: string
  readonly workerId?: string
  readonly orchestratorId?: string

  /** Artifact kind from the type registry. */
  readonly kind: ArtifactKind

  /** Title / short description. */
  readonly title: string

  /** Content reference (where bytes live). */
  readonly contentRef: string

  /** Content hash for immutability verification. */
  readonly contentHash: string

  /** Current lifecycle status. */
  readonly status: ArtifactStatus

  /** Version number (increments on new versions). */
  readonly version: number

  /** Parent version id (for version chains). */
  readonly parentVersionId?: ArtifactId

  /** Related artifact ids. */
  readonly relatedArtifactIds: readonly ArtifactId[]

  /** Verification history. */
  readonly verifications: readonly ArtifactVerification[]

  /** Merge receipt (set after merge). */
  readonly mergeReceipt?: {
    readonly mergeId: string
    readonly mergedAt: IsoTimestamp
    readonly target: "workspace" | "staging"
  }

  /** Snapshot id if part of a snapshot. */
  readonly snapshotId?: string

  /** Size in bytes. */
  readonly sizeBytes: number

  /** MIME type. */
  readonly mimeType: string

  /** Arbitrary metadata. */
  readonly extra?: JsonValue

  /** Optimistic concurrency token. */
  readonly seq: SequenceNumber

  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
  readonly lastPersistedAt: IsoTimestamp

  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Artifact state factory
// ---------------------------------------------------------------------------

export function createPersistedArtifactState(
  id: ArtifactId,
  workspaceId: WorkspaceId,
  projectId: string,
  kind: ArtifactKind,
  title: string,
  contentRef: string,
  contentHash: string,
  sizeBytes: number,
  mimeType: string,
  options?: {
    taskId?: string
    workerId?: string
    orchestratorId?: string
    parentVersionId?: ArtifactId
  },
): PersistedArtifactState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    id,
    workspaceId,
    projectId,
    taskId: options?.taskId,
    workerId: options?.workerId,
    orchestratorId: options?.orchestratorId,
    kind,
    title,
    contentRef,
    contentHash,
    status: "draft",
    version: 1,
    parentVersionId: options?.parentVersionId,
    relatedArtifactIds: [],
    verifications: [],
    sizeBytes,
    mimeType,
    seq: 1,
    createdAt: now,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      createdAt: now,
      updatedAt: now,
      version: 1,
      checksum: contentHash,
    },
  }
}

/**
 * Transition artifact status.
 * From ArtifactArchitecture-Part01: status moves forward only through lifecycle.
 */
export function transitionArtifactStatus(
  current: PersistedArtifactState,
  newStatus: ArtifactStatus,
  _reason: string,
): PersistedArtifactState {
  if (!canArtifactTransition(current.status, newStatus)) {
    throw new Error(`Invalid artifact transition: ${current.status} → ${newStatus}`)
  }
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...current,
    status: newStatus,
    seq: current.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...current.metadata,
      updatedAt: now,
      version: current.metadata.version + 1,
    },
  }
}

/**
 * Add a verification record.
 * From Artifact-Part02: every artifact should pass through verification.
 */
export function addArtifactVerification(
  state: PersistedArtifactState,
  verification: ArtifactVerification,
): PersistedArtifactState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    verifications: [...state.verifications, verification],
    seq: state.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Create a new version of an artifact.
 * From Artifact-Part02: artifacts are immutable; new changes create new versions.
 */
export function createNewVersion(
  current: PersistedArtifactState,
  newId: ArtifactId,
  newContentRef: string,
  newContentHash: string,
  newSizeBytes: number,
): PersistedArtifactState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...current,
    id: newId,
    contentRef: newContentRef,
    contentHash: newContentHash,
    sizeBytes: newSizeBytes,
    status: "draft",
    version: current.version + 1,
    parentVersionId: current.id,
    verifications: [],
    mergeReceipt: undefined,
    seq: 1,
    createdAt: now,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      createdAt: now,
      updatedAt: now,
      version: 1,
      checksum: newContentHash,
    },
  }
}

/**
 * Link a related artifact.
 */
export function linkArtifact(
  state: PersistedArtifactState,
  relatedId: ArtifactId,
): PersistedArtifactState {
  if (state.relatedArtifactIds.includes(relatedId)) return state
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    relatedArtifactIds: [...state.relatedArtifactIds, relatedId],
    seq: state.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

// ---------------------------------------------------------------------------
// Artifact state invariants
// ---------------------------------------------------------------------------

export function validateArtifactState(
  state: PersistedArtifactState,
): readonly string[] {
  const errors: string[] = []

  if (state.seq < 1) {
    errors.push("Sequence number must be >= 1")
  }

  if (state.version < 1) {
    errors.push("Version must be >= 1")
  }

  if (state.sizeBytes < 0) {
    errors.push("Size must be >= 0")
  }

  if (!state.contentHash) {
    errors.push("Content hash must be set")
  }

  if (!state.contentRef) {
    errors.push("Content ref must be set")
  }

  return errors
}
