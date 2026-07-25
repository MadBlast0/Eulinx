/**
 * P10-ART — Artifact System
 *
 * Immutable units of work: contract, lifecycle, verification, merge,
 * versioning, storage. From 05-artifacts/ and 02-runtime/ArtifactManager/.
 */

// --- artifact-types ---
export type {
  ArtifactKind,
  ArtifactStatus,
  Sensitivity,
  VerificationState,
  MergeState,
  ContentRefScheme,
  ContentRef,
  ArtifactMeta,
  Artifact,
  ArtifactCreateRequest,
  ArtifactFilter,
  ArtifactRelation,
  ArtifactRelationship,
  ArtifactRelationshipRequest,
  ArtifactValidationResult,
  ArtifactValidationError,
  ArtifactDiff,
  DiffHunk,
  VerdictOutcome,
  VerificationVerdict,
  VerificationFinding,
  MergeResult,
  ArtifactHistoryRecord,
  VersionChainQuery,
  ArtifactSearchQuery,
  ArtifactSearchResult,
  ArtifactExportBundle,
  ArtifactExportEntry,
  RetentionPolicy,
  ArtifactRetentionPolicy,
  ArtifactMetrics,
} from "./artifact-types"

// --- artifact-registry ---
export type { KindDescriptor } from "./artifact-registry"
export { ArtifactRegistry } from "./artifact-registry"

// --- artifact-storage ---
export type { ArtifactStorageConfig } from "./artifact-storage"
export { ArtifactStorage } from "./artifact-storage"

// --- artifact-lifecycle ---
export type { ArtifactLifecycleEvent } from "./artifact-lifecycle"
export type { LifecycleTransition } from "./artifact-lifecycle"
export { ArtifactLifecycle } from "./artifact-lifecycle"

// --- artifact-versioning ---
export type { VersionChainNode } from "./artifact-versioning"
export type { VersionChainResult } from "./artifact-versioning"
export { ArtifactVersioning } from "./artifact-versioning"

// --- artifact-relationships ---
export type { GraphNode } from "./artifact-relationships"
export { ArtifactRelationships } from "./artifact-relationships"

// --- artifact-search ---
export { ArtifactSearch } from "./artifact-search"

// --- artifact-history ---
export { ArtifactHistory } from "./artifact-history"

// --- artifact-verify ---
export type { GateMode } from "./artifact-verify"
export type { VerifierConfig } from "./artifact-verify"
export type { AggregatedVerification } from "./artifact-verify"
export { ArtifactVerification } from "./artifact-verify"

// --- artifact-merge ---
export type { MergeStage } from "./artifact-merge"
export type { PathLock } from "./artifact-merge"
export type { ConflictType } from "./artifact-merge"
export type { MergeConflict } from "./artifact-merge"
export type { MergeRequest } from "./artifact-merge"
export type { MergePipelineResult } from "./artifact-merge"
export { ArtifactMerge } from "./artifact-merge"

// --- artifact-import ---
export type { ImportSourceType } from "./artifact-import"
export type { ImportSource } from "./artifact-import"
export type { ImportResult } from "./artifact-import"
export { ArtifactImport } from "./artifact-import"

// --- artifact-export ---
export type { ExportFilter } from "./artifact-export"
export { ArtifactExport } from "./artifact-export"

// --- artifact-manager ---
export type { ArtifactManagerState } from "./artifact-manager"
export { ArtifactManager } from "./artifact-manager"
