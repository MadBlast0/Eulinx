/**
 * P04-STATE-SESSION — Session State Persistence
 *
 * Persistent session state from Session-Part01 through Part04.
 * A Session is a single continuous execution instance of a Workspace.
 * Its state must survive crashes and support resume/replay.
 *
 * From Session-Part02: lifecycle, state machine, runtime interaction.
 * From Session-Part03: recovery, replay, persistence, metrics.
 */

import type {
  SessionId,
  WorkspaceId,
  WorkerId,
  IsoTimestamp,
} from "@/core/types"
import type { PersistenceMetadata, SequenceNumber } from "./state-types"

// ---------------------------------------------------------------------------
// Session state types
// ---------------------------------------------------------------------------

export type SessionState =
  | "created"
  | "initializing"
  | "loading_workspace"
  | "starting_services"
  | "running"
  | "paused"
  | "resumed"
  | "completing"
  | "completed"
  | "archived"
  | "failed"
  | "cancelled"
  | "recovering"

/** Terminal session states. */
export const SESSION_TERMINAL: readonly SessionState[] = [
  "completed",
  "archived",
  "failed",
  "cancelled",
] as const

/** Active session states. */
export const SESSION_ACTIVE: readonly SessionState[] = [
  "initializing",
  "loading_workspace",
  "starting_services",
  "running",
  "resumed",
  "completing",
  "recovering",
] as const

// ---------------------------------------------------------------------------
// Session state machine
// ---------------------------------------------------------------------------

const SESSION_TRANSITIONS: Map<SessionState, readonly SessionState[]> = new Map([
  ["created", ["initializing", "cancelled"]],
  ["initializing", ["loading_workspace", "failed", "cancelled"]],
  ["loading_workspace", ["starting_services", "failed", "cancelled"]],
  ["starting_services", ["running", "failed", "cancelled"]],
  ["running", ["paused", "completing", "failed", "cancelled"]],
  ["paused", ["resumed", "cancelled"]],
  ["resumed", ["running", "paused", "completing", "failed", "cancelled"]],
  ["completing", ["completed", "failed"]],
  ["completed", ["archived"]],
  ["archived", []],
  ["failed", ["recovering", "cancelled"]],
  ["cancelled", []],
  ["recovering", ["running", "failed", "cancelled"]],
])

export function canSessionTransition(from: SessionState, to: SessionState): boolean {
  const allowed = SESSION_TRANSITIONS.get(from)
  return allowed !== undefined && (allowed as readonly SessionState[]).includes(to)
}

export function getSessionTransitions(state: SessionState): readonly SessionState[] {
  return SESSION_TRANSITIONS.get(state) ?? []
}

// ---------------------------------------------------------------------------
// Session metrics
// ---------------------------------------------------------------------------

export interface SessionMetrics {
  readonly totalWorkersSpawned: number
  readonly totalTasksExecuted: number
  readonly totalArtifactsCreated: number
  readonly totalTokensUsed: number
  readonly totalCostMicroUsd: number
  readonly totalDurationMs: number
  readonly errorCount: number
  readonly lastActivityAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Persisted session state
// ---------------------------------------------------------------------------

export interface PersistedSessionState {
  readonly id: SessionId
  readonly workspaceId: WorkspaceId
  readonly runtimeId: string
  readonly kind: "chat" | "terminal" | "agent"
  readonly state: SessionState
  readonly seq: SequenceNumber

  /** Active worker ids in this session. */
  readonly activeWorkerIds: readonly WorkerId[]

  /** Active task ids. */
  readonly activeTaskIds: readonly string[]

  /** Artifact ids produced in this session. */
  readonly artifactIds: readonly string[]

  /** Event log id for replay. */
  readonly eventLogId?: string

  /** Replay id if this session is being replayed. */
  readonly replayId?: string

  /** Snapshot id for restore. */
  readonly snapshotId?: string

  /** Session metrics. */
  readonly metrics: SessionMetrics

  /** Error info if failed. */
  readonly lastError?: {
    readonly code: string
    readonly message: string
    readonly at: IsoTimestamp
  }

  readonly startedAt: IsoTimestamp
  readonly endedAt?: IsoTimestamp
  readonly lastPersistedAt: IsoTimestamp

  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Session state factory
// ---------------------------------------------------------------------------

export function createPersistedSessionState(
  id: SessionId,
  workspaceId: WorkspaceId,
  runtimeId: string,
  kind: "chat" | "terminal" | "agent" = "chat",
): PersistedSessionState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    id,
    workspaceId,
    runtimeId,
    kind,
    state: "created",
    seq: 1,
    activeWorkerIds: [],
    activeTaskIds: [],
    artifactIds: [],
    metrics: {
      totalWorkersSpawned: 0,
      totalTasksExecuted: 0,
      totalArtifactsCreated: 0,
      totalTokensUsed: 0,
      totalCostMicroUsd: 0,
      totalDurationMs: 0,
      errorCount: 0,
    },
    startedAt: now,
    lastPersistedAt: now,
    metadata: {
      createdAt: now,
      updatedAt: now,
      version: 1,
      checksum: "",
    },
  }
}

/**
 * Transition session state and bump sequence number.
 * From Session-Part02: every significant transition should emit an event.
 */
export function transitionSessionState(
  current: PersistedSessionState,
  newState: SessionState,
  _reason: string,
): PersistedSessionState {
  if (!canSessionTransition(current.state, newState)) {
    throw new Error(`Invalid session transition: ${current.state} → ${newState}`)
  }
  const now = new Date().toISOString() as IsoTimestamp
  const endedAt = (newState === "completed" || newState === "archived" || newState === "failed" || newState === "cancelled")
    ? now
    : current.endedAt

  return {
    ...current,
    state: newState,
    seq: current.seq + 1,
    endedAt,
    lastPersistedAt: now,
    metadata: {
      ...current.metadata,
      updatedAt: now,
      version: current.metadata.version + 1,
    },
  }
}

/**
 * Add a worker to the session's active list.
 */
export function addSessionWorker(
  state: PersistedSessionState,
  workerId: WorkerId,
): PersistedSessionState {
  if (state.activeWorkerIds.includes(workerId)) return state
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    activeWorkerIds: [...state.activeWorkerIds, workerId],
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Remove a worker from the session's active list.
 */
export function removeSessionWorker(
  state: PersistedSessionState,
  workerId: WorkerId,
): PersistedSessionState {
  const idx = state.activeWorkerIds.indexOf(workerId)
  if (idx < 0) return state
  const now = new Date().toISOString() as IsoTimestamp
  const updated = [...state.activeWorkerIds]
  updated.splice(idx, 1)
  return {
    ...state,
    activeWorkerIds: updated,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Update session metrics.
 */
export function updateSessionMetrics(
  state: PersistedSessionState,
  metrics: Partial<SessionMetrics>,
): PersistedSessionState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    metrics: { ...state.metrics, ...metrics },
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

// ---------------------------------------------------------------------------
// Session state invariants
// ---------------------------------------------------------------------------

export function validateSessionState(
  state: PersistedSessionState,
): readonly string[] {
  const errors: string[] = []

  if (state.seq < 1) {
    errors.push("Sequence number must be >= 1")
  }

  if (state.metrics.totalWorkersSpawned < 0) {
    errors.push("Total workers spawned must be >= 0")
  }

  if (state.metrics.totalCostMicroUsd < 0) {
    errors.push("Total cost must be >= 0")
  }

  if (state.endedAt && state.endedAt < state.startedAt) {
    errors.push("endedAt must be >= startedAt")
  }

  const isTerminal = (SESSION_TERMINAL as readonly SessionState[]).includes(state.state)
  if (isTerminal && !state.endedAt) {
    errors.push("Terminal session must have endedAt")
  }

  return errors
}
