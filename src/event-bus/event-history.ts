/**
 * P03-EVENT-HISTORY — Event Log Persistence
 *
 * From EventBus-Part05 §The Event Log and HistoryTables-Part01.
 * SQLite table with append-only semantics. Only replay-grade events are written.
 *
 * The event log is the canonical spine of Eulinx's audit trail.
 */

import type { EulinxEventUnion } from "./event-types"

// ---------------------------------------------------------------------------
// Persisted event envelope (HistoryTables-Part01 §Object Model)
// ---------------------------------------------------------------------------

export type PersistedEventEnvelope = {
  readonly sequence: number
  readonly eventId: string
  readonly type: string
  readonly payload: string // JSON-serialized
  readonly service: string
  readonly workspaceId: string
  readonly sessionId?: string
  readonly executionId?: string
  readonly correlationId?: string
  readonly causationId?: string
  readonly emittedAt: string
}

// ---------------------------------------------------------------------------
// Event log write API (EventBus-Part05 §The Event Log)
// ---------------------------------------------------------------------------

/**
 * Event log DDL — SQLite schema from EventBus-Part05 §The Event Log.
 * Only replay-grade events are written here.
 */
export const EVENT_LOG_DDL = `
CREATE TABLE IF NOT EXISTS event_log (
  sequence        INTEGER PRIMARY KEY,
  event_id        TEXT    NOT NULL UNIQUE,
  type            TEXT    NOT NULL,
  payload         TEXT    NOT NULL,
  service         TEXT    NOT NULL,
  workspace_id    TEXT    NOT NULL,
  session_id      TEXT,
  execution_id    TEXT,
  correlation_id  TEXT,
  causation_id    TEXT,
  emitted_at      TEXT    NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_event_log_workspace   ON event_log (workspace_id, sequence);
CREATE INDEX IF NOT EXISTS idx_event_log_execution   ON event_log (execution_id, sequence);
CREATE INDEX IF NOT EXISTS idx_event_log_correlation ON event_log (correlation_id, sequence);
CREATE INDEX IF NOT EXISTS idx_event_log_type        ON event_log (type, sequence);
`

// Write mode pragmas (EventBus-Part05 §Write Mode)
export const EVENT_LOG_PRAGMAS = [
  "PRAGMA journal_mode = WAL",
  "PRAGMA synchronous = NORMAL",
] as const

// ---------------------------------------------------------------------------
// Batched log writer (EventBus-Part05 §Batched Writes)
// ---------------------------------------------------------------------------

export type LogFlushTrigger = "timer" | "batch_full" | "critical_event"

/**
 * Log writer state for batching writes.
 *
 * Rules (EventBus-Part05 §Batched Writes):
 * 1. publish() INSERTs into the open transaction and returns.
 * 2. Transaction COMMITs when:
 *    a. 10ms elapses since transaction opened, OR
 *    b. 100 events are pending, OR
 *    c. a merge.* or permission.* event is written (immediate commit).
 * 3. publish() for a replay-grade event does not return Ok until
 *    the COMMIT that includes it has completed.
 */
export type LogWriterState = {
  readonly pendingEvents: PersistedEventEnvelope[]
  transactionOpen: boolean
  transactionOpenedAt: number
  readonly waitForCommit: Map<string, { resolve: () => void; reject: (error: Error) => void }>
}

export const LOG_FLUSH_INTERVAL_MS = 10 as const
export const LOG_BATCH_SIZE = 100 as const

export function createLogWriterState(): LogWriterState {
  return {
    pendingEvents: [],
    transactionOpen: false,
    transactionOpenedAt: 0,
    waitForCommit: new Map(),
  }
}

// ---------------------------------------------------------------------------
// Retention policy (EventBus-Part05 §Retention)
// ---------------------------------------------------------------------------

export type RetentionPolicy = {
  /** Days to retain events (default 30) */
  readonly logRetentionDays: number
  /** Max bytes for the event log (default 2 GiB) */
  readonly logMaxBytes: number
  /** Hours between prune runs (default 24) */
  readonly pruneIntervalHours: number
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  logRetentionDays: 30,
  logMaxBytes: 2 * 1024 * 1024 * 1024,
  pruneIntervalHours: 24,
}

/**
 * Prunable conditions (EventBus-Part05 §Retention):
 * An event is prunable only if ALL of these hold:
 *   a. emitted_at is older than log_retention_days, AND
 *   b. its execution_id is not referenced by a retained Execution, AND
 *   c. it is not a merge.* event, AND
 *   d. it is not a permission.* event.
 */
export function isEventPrunable(
  envelope: PersistedEventEnvelope,
  pruneHorizonMs: number,
  retainedExecutionIds: ReadonlySet<string>,
): boolean {
  const emittedMs = new Date(envelope.emittedAt).getTime()
  if (emittedMs >= pruneHorizonMs) return false
  if (envelope.executionId && retainedExecutionIds.has(envelope.executionId)) return false
  if (envelope.type.startsWith("merge.")) return false
  if (envelope.type.startsWith("permission.")) return false
  return true
}

// ---------------------------------------------------------------------------
// Event log read API
// ---------------------------------------------------------------------------

export type EventRangeQuery = {
  readonly workspaceId: string
  readonly fromSequence?: number
  readonly toSequence?: number
  readonly executionId?: string
  readonly correlationId?: string
  readonly types?: string[]
  readonly limit?: number
}

export type GapReport = {
  readonly complete: boolean
  readonly gaps: ReadonlyArray<{
    readonly fromSequence: number
    readonly toSequence: number
    readonly likelyCause: "pruned" | "unknown"
  }>
}

/**
 * Serialize an EulinxEvent to a PersistedEventEnvelope for log writing.
 */
export function toPersistedEnvelope(event: EulinxEventUnion): PersistedEventEnvelope {
  return {
    sequence: event.sequence,
    eventId: event.eventId,
    type: event.type,
    payload: JSON.stringify(event.payload),
    service: event.source.service,
    workspaceId: event.workspaceId,
    sessionId: event.sessionId,
    executionId: event.executionId,
    correlationId: event.correlationId,
    causationId: event.causationId,
    emittedAt: event.emittedAt,
  }
}

/**
 * Deserialize a PersistedEventEnvelope back to an EulinxEvent.
 * NOTE: This reconstructs the event structure; the payload is typed at the
 * EulinxEventUnion level. Callers must cast appropriately.
 */
export function fromPersistedEnvelope(
  envelope: PersistedEventEnvelope,
): EulinxEventUnion {
  return {
    eventId: envelope.eventId,
    sequence: envelope.sequence,
    type: envelope.type,
    payload: JSON.parse(envelope.payload),
    source: { service: envelope.service as EulinxEventUnion["source"]["service"] },
    workspaceId: envelope.workspaceId as EulinxEventUnion["workspaceId"],
    sessionId: envelope.sessionId as EulinxEventUnion["sessionId"],
    executionId: envelope.executionId as EulinxEventUnion["executionId"],
    correlationId: envelope.correlationId,
    causationId: envelope.causationId,
    replayGrade: true, // Only replay-grade events are in the log
    emittedAt: envelope.emittedAt as EulinxEventUnion["emittedAt"],
  } as EulinxEventUnion
}

// ---------------------------------------------------------------------------
// HelixDB write path (T14.4)
// ---------------------------------------------------------------------------

/**
 * Adapter interface for HelixDB event persistence.
 * Implementations translate event writes and queries to HelixDB graph mutations.
 */
export interface HelixDBEventAdapter {
  write(envelope: PersistedEventEnvelope): Promise<void>
  query(range: EventRangeQuery): Promise<readonly PersistedEventEnvelope[]>
}

/**
 * Write a persisted event envelope to HelixDB via the adapter.
 * Delegates directly to `adapter.write()`.
 */
export async function writeHelixDB(
  adapter: HelixDBEventAdapter,
  event: PersistedEventEnvelope,
): Promise<void> {
  await adapter.write(event)
}

/**
 * Query events from HelixDB via the adapter.
 * Delegates directly to `adapter.query()`.
 */
export async function queryHelixDB(
  adapter: HelixDBEventAdapter,
  range: EventRangeQuery,
): Promise<readonly PersistedEventEnvelope[]> {
  return adapter.query(range)
}
