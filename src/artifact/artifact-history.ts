/**
 * P10-ART-HISTORY — Artifact History
 *
 * Append-only history records for artifact lifecycle transitions.
 * From HistoryTables-Part01 §ObjectModel and §TheAppendOnlyLaw.
 */

import type {
  ArtifactId,
  IsoTimestamp,
  WorkerId,
  TaskId,
  WorkflowId,
  SessionId,
} from "@/core/types"
import type {
  ArtifactStatus,
  ArtifactHistoryRecord,
} from "./artifact-types"

// ---------------------------------------------------------------------------
// ArtifactHistory
// ---------------------------------------------------------------------------

export class ArtifactHistory {
  private readonly records: ArtifactHistoryRecord[] = []
  private sequenceCounter = 0

  /**
   * Append a lifecycle transition record.
   * From HistoryTables-Part01 §TheAppendOnlyLaw:
   * - rows are NEVER updated
   * - rows are NEVER deleted (except by retention policy)
   */
  append(
    artifactId: ArtifactId,
    fromStatus: ArtifactStatus | null,
    toStatus: ArtifactStatus,
    options?: {
      workerId?: WorkerId
      taskId?: TaskId
      workflowId?: WorkflowId
      sessionId?: SessionId
      reason?: string
      metadata?: Record<string, unknown>
    }
  ): ArtifactHistoryRecord {
    const record: ArtifactHistoryRecord = {
      sequence: ++this.sequenceCounter,
      artifactId,
      fromStatus,
      toStatus,
      workerId: options?.workerId,
      taskId: options?.taskId,
      workflowId: options?.workflowId,
      sessionId: options?.sessionId,
      reason: options?.reason,
      metadata: options?.metadata,
      timestamp: new Date().toISOString() as IsoTimestamp,
    }

    this.records.push(record)
    return record
  }

  /**
   * Read history for a specific artifact.
   */
  readArtifactHistory(artifactId: ArtifactId): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => r.artifactId === artifactId)
  }

  /**
   * Read history for a specific worker.
   */
  readWorkerHistory(workerId: WorkerId): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => r.workerId === workerId)
  }

  /**
   * Read history for a specific task.
   */
  readTaskHistory(taskId: TaskId): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => r.taskId === taskId)
  }

  /**
   * Read history for a specific session.
   */
  readSessionHistory(sessionId: SessionId): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => r.sessionId === sessionId)
  }

  /**
   * Read history for a specific workflow.
   */
  readWorkflowHistory(workflowId: WorkflowId): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => r.workflowId === workflowId)
  }

  /**
   * Read history within a sequence range.
   * From HistoryTables-Part01 §EventRangeQuery.
   */
  readRange(
    fromSequence?: number,
    toSequence?: number
  ): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => {
      if (fromSequence !== undefined && r.sequence < fromSequence) return false
      if (toSequence !== undefined && r.sequence > toSequence) return false
      return true
    })
  }

  /**
   * Find sequence gaps in the history.
   * From HistoryTables-Part01 §GapReport.
   */
  findGaps(
    fromSequence: number,
    toSequence: number
  ): { complete: boolean; gaps: { from: number; to: number }[] } {
    const gaps: { from: number; to: number }[] = []
    const sequences = this.records
      .map((r) => r.sequence)
      .filter((s) => s >= fromSequence && s <= toSequence)
      .sort((a, b) => a - b)

    if (sequences.length === 0) {
      return { complete: false, gaps: [{ from: fromSequence, to: toSequence }] }
    }

    let expected = fromSequence
    for (const seq of sequences) {
      if (seq > expected) {
        gaps.push({ from: expected, to: seq - 1 })
      }
      expected = seq + 1
    }

    if (expected <= toSequence) {
      gaps.push({ from: expected, to: toSequence })
    }

    return { complete: gaps.length === 0, gaps }
  }

  /**
   * Get the latest status transition for an artifact.
   */
  getLatestTransition(
    artifactId: ArtifactId
  ): ArtifactHistoryRecord | undefined {
    const records = this.readArtifactHistory(artifactId)
    return records[records.length - 1]
  }

  /**
   * Get all transitions to a specific status.
   */
  getTransitionsTo(
    toStatus: ArtifactStatus
  ): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => r.toStatus === toStatus)
  }

  /**
   * Get all transitions from a specific status.
   */
  getTransitionsFrom(
    fromStatus: ArtifactStatus
  ): readonly ArtifactHistoryRecord[] {
    return this.records.filter((r) => r.fromStatus === fromStatus)
  }

  /**
   * Count total records.
   */
  size(): number {
    return this.records.length
  }

  /**
   * Get the highest sequence number.
   */
  maxSequence(): number {
    return this.records.length > 0
      ? this.records[this.records.length - 1]!.sequence // Safe: length > 0 guaranteed by guard
      : 0
  }
}
