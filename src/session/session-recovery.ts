/**
 * P07-SESSION-RESUME — Session Recovery & Resume
 *
 * Session-Part03: "Sessions MUST support recovery after unexpected interruption."
 * Session-Part02: "Recovering" state.
 * Handles restoring sessions after app restart or crash.
 */

import type { SessionId, WorkspaceId } from "@/core/types"
import type { PersistedSessionState } from "@/state/session-state"
import type { SessionSnapshot } from "./session-types"
import { SESSION_TERMINAL } from "@/state/session-state"

// ---------------------------------------------------------------------------
// Recovery Input
// ---------------------------------------------------------------------------

export interface SessionRecoveryInput {
  readonly sessionId: SessionId
  readonly workspaceId: WorkspaceId
  readonly persistedState: PersistedSessionState
  readonly latestSnapshot?: SessionSnapshot
  readonly osProcessAlive: boolean
}

// ---------------------------------------------------------------------------
// Recovery Action
// ---------------------------------------------------------------------------

export type SessionRecoveryAction =
  | "resume_running"
  | "resume_from_snapshot"
  | "mark_interrupted"
  | "archive_stale"
  | "skip"

export interface SessionRecoveryOutput {
  readonly sessionId: SessionId
  readonly action: SessionRecoveryAction
  readonly newState: string
  readonly reason: string
}

// ---------------------------------------------------------------------------
// Recovery Table
// ---------------------------------------------------------------------------

const SESSION_RECOVERY_TABLE: ReadonlyMap<string, SessionRecoveryAction> = new Map([
  ["created", "skip"],
  ["initializing", "mark_interrupted"],
  ["loading_workspace", "mark_interrupted"],
  ["starting_services", "mark_interrupted"],
  ["running", "resume_running"],
  ["paused", "resume_running"],
  ["resumed", "resume_running"],
  ["completing", "resume_running"],
  ["completed", "skip"],
  ["archived", "skip"],
  ["failed", "skip"],
  ["cancelled", "skip"],
  ["recovering", "resume_running"],
])

// ---------------------------------------------------------------------------
// Recovery Algorithm
// ---------------------------------------------------------------------------

/**
 * Determine the recovery action for a session based on its persisted state.
 * Session-Part03: "Recovery MUST NOT replay completed merges."
 */
export function determineSessionRecovery(input: SessionRecoveryInput): SessionRecoveryOutput {
  const state = input.persistedState.state

  // Terminal states: nothing to recover
  const isTerminal = (SESSION_TERMINAL as readonly string[]).includes(state)
  if (isTerminal) {
    return {
      sessionId: input.sessionId,
      action: "skip",
      newState: state,
      reason: "Session already in terminal state",
    }
  }

  const action = SESSION_RECOVERY_TABLE.get(state) ?? "mark_interrupted"

  switch (action) {
    case "resume_running": {
      if (input.latestSnapshot) {
        return {
          sessionId: input.sessionId,
          action: "resume_from_snapshot",
          newState: "recovering",
          reason: `Resuming from snapshot at event ${input.latestSnapshot.eventSeq}`,
        }
      }
      return {
        sessionId: input.sessionId,
        action: "resume_running",
        newState: "recovering",
        reason: "Resuming from last persisted state",
      }
    }

    case "mark_interrupted": {
      return {
        sessionId: input.sessionId,
        action: "mark_interrupted",
        newState: "failed",
        reason: `Session was in '${state}' state at interruption`,
      }
    }

    case "skip":
    default: {
      return {
        sessionId: input.sessionId,
        action: "skip",
        newState: state,
        reason: "No recovery needed",
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Recovery Pass
// ---------------------------------------------------------------------------

export interface SessionRecoveryPassResult {
  readonly recovered: readonly SessionRecoveryOutput[]
  readonly recoveryCount: number
  readonly failedCount: number
}

/**
 * Run recovery over all non-terminal sessions.
 */
export function runSessionRecoveryPass(
  inputs: readonly SessionRecoveryInput[],
): SessionRecoveryPassResult {
  const recovered: SessionRecoveryOutput[] = []

  // Process in sessionId order for determinism
  const sorted = [...inputs].sort((a, b) => a.sessionId.localeCompare(b.sessionId))

  for (const input of sorted) {
    const output = determineSessionRecovery(input)
    recovered.push(output)
  }

  return {
    recovered,
    recoveryCount: recovered.filter(r => r.action !== "skip").length,
    failedCount: recovered.filter(r => r.action === "mark_interrupted").length,
  }
}
