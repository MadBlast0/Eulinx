/**
 * P04-STATE — Shared State Types
 *
 * Base state models, persistence metadata, and transition types
 * shared across all entity state modules.
 *
 * From RunStatePersistence-Part01: the persisted state model,
 * the crash-recovery contract, and the persist-before-tick rule.
 * From MemoryArchitecture-Part01: memory layers and ownership.
 */

import type {
  WorkspaceId,
  IsoTimestamp,
  JsonValue,
} from "@/core/types"

// ---------------------------------------------------------------------------
// Persistence metadata
// ---------------------------------------------------------------------------

/** Metadata attached to every persisted state record. */
export interface PersistenceMetadata {
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
  readonly version: number
  readonly checksum: string
}

/** Optimistic concurrency token — bumped on every write. */
export type SequenceNumber = number

// ---------------------------------------------------------------------------
// Base persisted entity
// ---------------------------------------------------------------------------

/** Every persisted entity carries an id and persistence metadata. */
export interface PersistedEntity {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// State transition record
// ---------------------------------------------------------------------------

/** An immutable record of a state transition. */
export interface StateTransition<TState extends string> {
  readonly entityId: string
  readonly from: TState
  readonly to: TState
  readonly reason: string
  readonly timestamp: IsoTimestamp
  readonly triggeredBy: string
}

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

/**
 * The persistence store interface.
 * From RunStatePersistence-Part01: single source of truth via SQLite.
 * All reads and writes go through this interface — no raw SQL in TS.
 */
export interface StateStore {
  /** Load a single entity by id. Returns null if not found. */
  load<T extends PersistedEntity>(id: string): Promise<T | null>

  /** Save (upsert) a single entity. */
  save<T extends PersistedEntity>(entity: T): Promise<void>

  /** Save multiple entities in a single transaction. */
  saveAll<T extends PersistedEntity>(entities: T[]): Promise<void>

  /** Delete an entity by id. */
  delete(id: string): Promise<void>

  /** Query entities by workspace. */
  queryByWorkspace<T extends PersistedEntity>(
    workspaceId: WorkspaceId,
    kind: string,
  ): Promise<T[]>
}

// ---------------------------------------------------------------------------
// Snapshot types (from Snapshots-Part01)
// ---------------------------------------------------------------------------

export type SnapshotKind =
  | "workspace_snapshot"
  | "project_files_snapshot"
  | "workflow_snapshot"
  | "memory_snapshot"
  | "pre_merge_snapshot"
  | "session_snapshot"

export interface SnapshotPayload {
  readonly fileChecksums?: Readonly<Record<string, string>>
  readonly fileContents?: Readonly<Record<string, string>>
  readonly workflowGraph?: JsonValue
  readonly memoryRefs?: readonly string[]
  readonly artifactRefs?: readonly string[]
  readonly permissionState?: JsonValue
}

export interface Snapshot {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly kind: SnapshotKind
  readonly label: string
  readonly payload: SnapshotPayload
  readonly metadata: PersistenceMetadata
  readonly parentSnapshotId?: string
}

// ---------------------------------------------------------------------------
// Recovery
// ---------------------------------------------------------------------------

export interface RecoveryPlan {
  readonly snapshotId: string
  readonly targetState: string
  readonly steps: readonly RecoveryStep[]
}

export interface RecoveryStep {
  readonly description: string
  readonly action: "restore_snapshot" | "replay_events" | "rebuild_state" | "verify_integrity"
  readonly targetId: string
}
