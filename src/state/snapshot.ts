/**
 * P04-STATE-SNAPSHOT — Snapshots (point-in-time)
 *
 * Point-in-time state preservation from Snapshots-Part01 through Part03.
 * Snapshots preserve state at a point in time for recovery from failed merges,
 * bad Worker runs, and user experiments.
 *
 * From Snapshots-Part01: snapshot types and contents.
 * From Snapshots-Part02: creation, restore, and safety.
 * From Snapshots-Part03: implementation checklist.
 */

import type { WorkspaceId, IsoTimestamp, JsonValue } from "@/core/types"
import type { Result } from "@/core/result"
import { err, ok } from "@/core/result"
import { CoreError } from "@/core/error"
import type { Logger } from "@/core/logger"
import { createLogger } from "@/core/logger"
import type {
  Snapshot,
  SnapshotKind,
  SnapshotPayload,
} from "./state-types"

// ---------------------------------------------------------------------------
// Snapshot store interface
// ---------------------------------------------------------------------------

export interface SnapshotStore {
  save(snapshot: Snapshot): Promise<void>
  load(id: string): Promise<Snapshot | null>
  listByWorkspace(workspaceId: WorkspaceId): Promise<readonly Snapshot[]>
  delete(id: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Snapshot service
// ---------------------------------------------------------------------------

/**
 * The snapshot service creates, lists, and restores point-in-time snapshots.
 *
 * From Snapshots-Part02: "Restore should be explicit and auditable."
 * From Snapshots-Part02: "Do not restore across Workspace boundaries."
 * From Snapshots-Part02: "Do not overwrite newer user changes without warning."
 */
export class SnapshotService {
  private readonly logger: Logger

  constructor(private readonly store: SnapshotStore) {
    this.logger = createLogger("SnapshotService")
  }

  /**
   * Create a new snapshot.
   * From Snapshots-Part02: created before high-risk merges, large refactors, etc.
   */
  async createSnapshot(
    workspaceId: WorkspaceId,
    kind: SnapshotKind,
    label: string,
    payload: SnapshotPayload,
    options?: {
      parentSnapshotId?: string
    },
  ): Promise<Result<Snapshot, CoreError>> {
    if (!label) {
      return err(new CoreError("validation_error", "Snapshot label is required"))
    }

    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const now = new Date().toISOString() as IsoTimestamp

    const snapshot: Snapshot = {
      id,
      workspaceId,
      kind,
      label,
      payload,
      parentSnapshotId: options?.parentSnapshotId,
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: 1,
        checksum: "",
      },
    }

    await this.store.save(snapshot)
    this.logger.info(`Created snapshot: ${id} (${kind})`)
    return ok(snapshot)
  }

  /**
   * Load a snapshot by id.
   */
  async loadSnapshot(id: string): Promise<Result<Snapshot, CoreError>> {
    const snapshot = await this.store.load(id)
    if (!snapshot) {
      return err(new CoreError("session_not_found", `Snapshot not found: ${id}`))
    }
    return ok(snapshot)
  }

  /**
   * List all snapshots for a workspace.
   * From Snapshots-Part01: snapshots may include file checksums, workflow graph state, etc.
   */
  async listSnapshots(
    workspaceId: WorkspaceId,
  ): Promise<Result<readonly Snapshot[], CoreError>> {
    const snapshots = await this.store.listByWorkspace(workspaceId)
    return ok(snapshots)
  }

  /**
   * List snapshots by kind.
   */
  async listSnapshotsByKind(
    workspaceId: WorkspaceId,
    kind: SnapshotKind,
  ): Promise<Result<readonly Snapshot[], CoreError>> {
    const all = await this.store.listByWorkspace(workspaceId)
    const filtered = all.filter((s) => s.kind === kind)
    return ok(filtered)
  }

  /**
   * Delete a snapshot.
   * From Snapshots-Part03: future expansion includes automatic pruning.
   */
  async deleteSnapshot(id: string): Promise<Result<void, CoreError>> {
    const snapshot = await this.store.load(id)
    if (!snapshot) {
      return err(new CoreError("session_not_found", `Snapshot not found: ${id}`))
    }
    await this.store.delete(id)
    this.logger.info(`Deleted snapshot: ${id}`)
    return ok(undefined)
  }

  /**
   * Create a pre-merge snapshot.
   * From Snapshots-Part01: pre_merge_snapshot is a dedicated kind.
   */
  async createPreMergeSnapshot(
    workspaceId: WorkspaceId,
    fileChecksums: Readonly<Record<string, string>>,
    fileContents: Readonly<Record<string, string>>,
    label: string,
  ): Promise<Result<Snapshot, CoreError>> {
    return this.createSnapshot(workspaceId, "pre_merge_snapshot", label, {
      fileChecksums,
      fileContents,
    })
  }

  /**
   * Create a workflow snapshot.
   * From Snapshots-Part01: workflow_snapshot preserves graph state.
   */
  async createWorkflowSnapshot(
    workspaceId: WorkspaceId,
    workflowGraph: JsonValue,
    label: string,
  ): Promise<Result<Snapshot, CoreError>> {
    return this.createSnapshot(workspaceId, "workflow_snapshot", label, {
      workflowGraph,
    })
  }

  /**
   * Create a session snapshot.
   * From Snapshots-Part01: session_snapshot preserves execution state.
   */
  async createSessionSnapshot(
    workspaceId: WorkspaceId,
    sessionState: JsonValue,
    label: string,
  ): Promise<Result<Snapshot, CoreError>> {
    return this.createSnapshot(workspaceId, "session_snapshot", label, {
      permissionState: sessionState,
    })
  }

  /**
   * Validate snapshot integrity.
   * From Snapshots-Part03: store checksums and restore metadata.
   */
  validateSnapshot(snapshot: Snapshot): readonly string[] {
    const errors: string[] = []

    if (!snapshot.id) {
      errors.push("Snapshot id is required")
    }

    if (!snapshot.workspaceId) {
      errors.push("Workspace id is required")
    }

    if (!snapshot.kind) {
      errors.push("Snapshot kind is required")
    }

    if (!snapshot.label) {
      errors.push("Snapshot label is required")
    }

    if (!snapshot.metadata) {
      errors.push("Metadata is required")
    }

    return errors
  }

  /**
   * Check if a snapshot is stale relative to a newer snapshot.
   * From Snapshots-Part02: "Do not overwrite newer user changes without warning."
   */
  isStale(
    snapshot: Snapshot,
    newerSnapshots: readonly Snapshot[],
  ): boolean {
    return newerSnapshots.some(
      (ns) =>
        ns.kind === snapshot.kind &&
        ns.metadata.createdAt > snapshot.metadata.createdAt,
    )
  }
}

// ---------------------------------------------------------------------------
// In-memory snapshot store (for testing)
// ---------------------------------------------------------------------------

export class InMemorySnapshotStore implements SnapshotStore {
  private readonly snapshots = new Map<string, Snapshot>()

  async save(snapshot: Snapshot): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot)
  }

  async load(id: string): Promise<Snapshot | null> {
    return this.snapshots.get(id) ?? null
  }

  async listByWorkspace(workspaceId: WorkspaceId): Promise<readonly Snapshot[]> {
    const results: Snapshot[] = []
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.workspaceId === workspaceId) {
        results.push(snapshot)
      }
    }
    return results.sort(
      (a, b) => b.metadata.createdAt.localeCompare(a.metadata.createdAt),
    )
  }

  async delete(id: string): Promise<void> {
    this.snapshots.delete(id)
  }

  clear(): void {
    this.snapshots.clear()
  }

  get size(): number {
    return this.snapshots.size
  }
}
