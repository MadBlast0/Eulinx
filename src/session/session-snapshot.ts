/**
 * P07-SESSION-SNAP — Session Snapshots
 *
 * Session-Part03: Snapshots for crash recovery, time travel, replay optimization,
 * and rollback checkpoints.
 * From BackupRestore: snapshot creation, storage, and restoration.
 */

import type { SessionId, WorkerId, IsoTimestamp } from "@/core/types"
import type { PersistedSessionState } from "@/state/session-state"
import type { SessionSnapshot, SnapshotCreateRequest } from "./session-types"

// ---------------------------------------------------------------------------
// Snapshot Manager
// ---------------------------------------------------------------------------

export class SessionSnapshotManager {
  private readonly snapshots: Map<string, SessionSnapshot> = new Map()
  private readonly sessionSnapshots: Map<string, string[]> = new Map() // sessionId -> snapshotIds

  /**
   * Create a snapshot from current session state.
   * Session-Part03: "The Runtime MAY create Session snapshots."
   */
  createSnapshot(
    request: SnapshotCreateRequest,
    sessionState: PersistedSessionState,
    workerStates: Readonly<Record<string, unknown>> = {},
  ): SessionSnapshot {
    const snapshotId = `snap_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    const now = new Date().toISOString() as IsoTimestamp

    const snapshot: SessionSnapshot = {
      snapshotId,
      sessionId: request.sessionId,
      eventSeq: sessionState.seq,
      label: request.label,
      workerStates: { ...workerStates },
      activeWorkerIds: [...sessionState.activeWorkerIds],
      activeTaskIds: [...sessionState.activeTaskIds],
      artifactIds: [...sessionState.artifactIds],
      metrics: { ...sessionState.metrics },
      createdAt: now,
    }

    this.snapshots.set(snapshotId, snapshot)

    const existing = this.sessionSnapshots.get(request.sessionId) ?? []
    existing.push(snapshotId)
    this.sessionSnapshots.set(request.sessionId, existing)

    return snapshot
  }

  /**
   * Get a snapshot by ID.
   */
  getSnapshot(snapshotId: string): SessionSnapshot | undefined {
    return this.snapshots.get(snapshotId)
  }

  /**
   * Get all snapshots for a session.
   */
  getSessionSnapshots(sessionId: SessionId): readonly SessionSnapshot[] {
    const ids = this.sessionSnapshots.get(sessionId) ?? []
    return ids
      .map(id => this.snapshots.get(id))
      .filter((s): s is SessionSnapshot => s !== undefined)
  }

  /**
   * Get the latest snapshot for a session.
   */
  getLatestSnapshot(sessionId: SessionId): SessionSnapshot | undefined {
    const snapshots = this.getSessionSnapshots(sessionId)
    if (snapshots.length === 0) return undefined
    return snapshots[snapshots.length - 1]
  }

  /**
   * Get snapshots created before a given event sequence.
   */
  getSnapshotsBefore(sessionId: SessionId, eventSeq: number): readonly SessionSnapshot[] {
    return this.getSessionSnapshots(sessionId).filter(s => s.eventSeq <= eventSeq)
  }

  /**
   * Delete a snapshot.
   */
  deleteSnapshot(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId)
    if (!snapshot) return false

    this.snapshots.delete(snapshotId)

    const sessionIds = this.sessionSnapshots.get(snapshot.sessionId)
    if (sessionIds) {
      const idx = sessionIds.indexOf(snapshotId)
      if (idx >= 0) sessionIds.splice(idx, 1)
    }

    return true
  }

  /**
   * Delete all snapshots for a session.
   */
  deleteSessionSnapshots(sessionId: SessionId): number {
    const ids = this.sessionSnapshots.get(sessionId) ?? []
    let count = 0
    for (const id of ids) {
      if (this.snapshots.delete(id)) count++
    }
    this.sessionSnapshots.delete(sessionId)
    return count
  }

  /**
   * Count snapshots.
   */
  getSnapshotCount(sessionId?: SessionId): number {
    if (sessionId) {
      return (this.sessionSnapshots.get(sessionId) ?? []).length
    }
    return this.snapshots.size
  }
}

// ---------------------------------------------------------------------------
// Snapshot Restoration
// ---------------------------------------------------------------------------

export interface SnapshotRestoreResult {
  readonly success: boolean
  readonly snapshotId: string
  readonly sessionId: SessionId
  readonly restoredWorkerIds: readonly WorkerId[]
  readonly restoredTaskIds: readonly string[]
  readonly restoredArtifactIds: readonly string[]
  readonly error?: string
}

/**
 * Validate that a snapshot can be restored into a session.
 */
export function validateSnapshotRestore(
  snapshot: SessionSnapshot,
  currentSessionId: SessionId,
): readonly string[] {
  const errors: string[] = []

  if (snapshot.sessionId !== currentSessionId) {
    errors.push("Snapshot belongs to a different session")
  }

  if (snapshot.eventSeq < 0) {
    errors.push("Snapshot has invalid event sequence")
  }

  return errors
}
