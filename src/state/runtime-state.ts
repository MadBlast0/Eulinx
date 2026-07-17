/**
 * P04-STATE-RUNTIME — Runtime State Persistence
 *
 * Persistent runtime state from RuntimeManager-Part01 and RunStatePersistence-Part01.
 * The runtime state is the top-level container that tracks the overall system health,
 * active sessions, and recovery status.
 *
 * Persisted to SQLite as the authoritative resume source. On restart, the runtime
 * rebuilds its in-memory state from this persisted record.
 */

import type {
  WorkspaceId,
  IsoTimestamp,
  JsonValue,
} from "@/core/types"
import type { RuntimeState } from "@/runtime/runtime-state"
import type { PersistenceMetadata, SequenceNumber } from "./state-types"

// ---------------------------------------------------------------------------
// Runtime state model
// ---------------------------------------------------------------------------

export interface PersistedRuntimeState {
  readonly id: string
  readonly workspaceId: WorkspaceId
  readonly state: RuntimeState
  readonly version: string
  readonly seq: SequenceNumber

  /** Active session ids managed by this runtime. */
  readonly activeSessionIds: readonly string[]

  /** Active worker count. */
  readonly activeWorkerCount: number

  /** Active execution count. */
  readonly activeExecutionCount: number

  /** Pending approval count. */
  readonly pendingApprovalCount: number

  /** Blocked task count. */
  readonly blockedTaskCount: number

  /** Runtime config snapshot (for resume). */
  readonly configSnapshot?: JsonValue

  /** Health status. */
  readonly health: "healthy" | "degraded" | "failed"

  /** Error info if degraded or failed. */
  readonly lastError?: {
    readonly code: string
    readonly message: string
    readonly at: IsoTimestamp
  }

  /** When the runtime was started. */
  readonly startedAt: IsoTimestamp

  /** When the runtime was last persisted. */
  readonly lastPersistedAt: IsoTimestamp

  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Runtime state transitions
// ---------------------------------------------------------------------------

const RUNTIME_STATE_TRANSITIONS: Map<RuntimeState, readonly RuntimeState[]> = new Map([
  ["uninitialized", ["starting", "failed"]],
  ["starting", ["ready", "degraded", "failed"]],
  ["ready", ["running", "paused", "stopping", "degraded"]],
  ["running", ["paused", "degraded", "stopping", "failed", "recovery"]],
  ["paused", ["running", "stopping", "degraded"]],
  ["degraded", ["running", "stopping", "failed", "recovery"]],
  ["stopping", ["stopped", "failed"]],
  ["stopped", ["starting"]],
  ["failed", ["recovery", "starting", "stopped"]],
  ["recovery", ["running", "degraded", "failed", "stopping"]],
])

/**
 * Validate that a runtime state transition is allowed.
 * From RunStatePersistence-Part01: state changes must be persisted atomically.
 */
export function canRuntimeTransition(
  from: RuntimeState,
  to: RuntimeState,
): boolean {
  const allowed = RUNTIME_STATE_TRANSITIONS.get(from)
  return allowed !== undefined && (allowed as readonly RuntimeState[]).includes(to)
}

/**
 * Get all valid transitions from a given runtime state.
 */
export function getRuntimeTransitions(state: RuntimeState): readonly RuntimeState[] {
  return RUNTIME_STATE_TRANSITIONS.get(state) ?? []
}

// ---------------------------------------------------------------------------
// Runtime state factory
// ---------------------------------------------------------------------------

export function createPersistedRuntimeState(
  id: string,
  workspaceId: WorkspaceId,
  version: string,
  startedAt: IsoTimestamp,
): PersistedRuntimeState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    id,
    workspaceId,
    state: "uninitialized",
    version,
    seq: 1,
    activeSessionIds: [],
    activeWorkerCount: 0,
    activeExecutionCount: 0,
    pendingApprovalCount: 0,
    blockedTaskCount: 0,
    health: "healthy",
    startedAt,
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
 * Transition runtime state and bump the sequence number.
 * From RunStatePersistence-Part02: persist before ticking onward.
 */
export function transitionRuntimeState(
  current: PersistedRuntimeState,
  newState: RuntimeState,
  _reason: string,
): PersistedRuntimeState {
  if (!canRuntimeTransition(current.state, newState)) {
    throw new Error(`Invalid runtime transition: ${current.state} → ${newState}`)
  }
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...current,
    state: newState,
    seq: current.seq + 1,
    lastPersistedAt: now,
    metadata: {
      ...current.metadata,
      updatedAt: now,
      version: current.metadata.version + 1,
    },
  }
}

// ---------------------------------------------------------------------------
// Runtime state invariants
// ---------------------------------------------------------------------------

/**
 * Validate runtime state invariants.
 * From RunStatePersistence-Part01: the crash-recovery contract.
 */
export function validateRuntimeState(
  state: PersistedRuntimeState,
): readonly string[] {
  const errors: string[] = []

  if (state.seq < 1) {
    errors.push("Sequence number must be >= 1")
  }

  if (state.activeWorkerCount < 0) {
    errors.push("Active worker count must be >= 0")
  }

  if (state.activeExecutionCount < 0) {
    errors.push("Active execution count must be >= 0")
  }

  if (state.activeSessionIds.length < 0) {
    errors.push("Active session count must be >= 0")
  }

  if (state.health === "failed" && !state.lastError) {
    errors.push("Failed runtime must have lastError")
  }

  return errors
}
