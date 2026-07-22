import { invoke } from "@tauri-apps/api/core"
import type { EulinxEventUnion } from "./event-types"

export const LOG_FLUSH_INTERVAL_MS = 5000
export const LOG_BATCH_SIZE = 100

export type PersistedEventEnvelope = {
  readonly sequence: number
  readonly eventId: string
  readonly type: string
  readonly payload: string
  readonly service: string
  readonly workspaceId: string
  readonly sessionId?: string
  readonly executionId?: string
  readonly correlationId?: string
  readonly causationId?: string
  readonly emittedAt: string
}

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

export type EventLogResult = {
  readonly written: number
  readonly firstSequence: number
  readonly lastSequence: number
}

export type EventLogStats = {
  readonly totalEvents: number
  readonly minSequence: number
  readonly maxSequence: number
  readonly sizeBytes: number
}

export type RetentionPolicy = {
  readonly logRetentionDays: number
  readonly logMaxBytes: number
  readonly pruneIntervalHours: number
}

export const DEFAULT_RETENTION_POLICY: RetentionPolicy = {
  logRetentionDays: 30,
  logMaxBytes: 2 * 1024 * 1024 * 1024,
  pruneIntervalHours: 24,
}

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
    replayGrade: true,
    emittedAt: envelope.emittedAt as EulinxEventUnion["emittedAt"],
  } as EulinxEventUnion
}

export interface HelixDBEventAdapter {
  write(envelope: PersistedEventEnvelope): Promise<void>
  query(range: EventRangeQuery): Promise<readonly PersistedEventEnvelope[]>
}

export async function writeHelixDB(
  adapter: HelixDBEventAdapter,
  event: PersistedEventEnvelope,
): Promise<void> {
  await adapter.write(event)
}

export async function queryHelixDB(
  adapter: HelixDBEventAdapter,
  range: EventRangeQuery,
): Promise<readonly PersistedEventEnvelope[]> {
  return adapter.query(range)
}

export async function writeBatch(
  events: PersistedEventEnvelope[],
): Promise<EventLogResult> {
  return invoke<EventLogResult>("log_write_batch", { events })
}

export async function queryLog(
  query: EventRangeQuery,
): Promise<readonly PersistedEventEnvelope[]> {
  return invoke<PersistedEventEnvelope[]>("log_query", { query })
}

export async function pruneLog(
  beforeTimestamp: string,
  retainedExecutionIds: string[],
): Promise<number> {
  return invoke<number>("log_prune", { beforeTimestamp, retainedExecutionIds })
}

export async function detectGaps(
  workspaceId: string,
): Promise<GapReport> {
  return invoke<GapReport>("log_detect_gaps", { workspaceId })
}

export async function getLogStats(
  workspaceId: string,
): Promise<EventLogStats> {
  return invoke<EventLogStats>("log_get_stats", { workspaceId })
}
