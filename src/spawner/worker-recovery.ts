/**
 * P06-SPAWN-RECOVERY — Worker Recovery After App Restart
 *
 * WorkerLifecycle-Part05: Recovery algorithm, escaped-process sweep,
 * restart generation bump, and recovery events.
 */

import type { IsoTimestamp } from "@/core/types"
import type { WorkerState } from "./worker-state"
import type { WorkerRecoveryEvent } from "./worker-lifecycle"
import { RECOVERY_TABLE } from "./worker-lifecycle"

// ---------------------------------------------------------------------------
// Recovery Input
// ---------------------------------------------------------------------------

export interface RecoveryInput {
  readonly workerId: string
  readonly state: WorkerState
  readonly osPid?: number
  readonly restartGeneration: number
}

// ---------------------------------------------------------------------------
// Recovery Output
// ---------------------------------------------------------------------------

export interface RecoveryOutput {
  readonly workerId: string
  readonly action: string
  readonly newState: WorkerState
  readonly triggerFatalError: boolean
  readonly incrementGeneration: boolean
  readonly setHealthUnknown: boolean
  readonly requiresSweep: boolean
}

// ---------------------------------------------------------------------------
// Recovery Algorithm (WorkerLifecycle-Part05 §Recovery Algorithm)
// ---------------------------------------------------------------------------

/**
 * Determine the recovery action for a single Worker based on its persisted state.
 * WorkerLifecycle-Part05 §The Recovery Table.
 */
export function determineRecoveryAction(input: RecoveryInput): RecoveryOutput {
  const recoveryEntry = RECOVERY_TABLE.get(input.state)

  if (!recoveryEntry) {
    // terminated — not selected, already sealed
    return {
      workerId: input.workerId,
      action: "skip",
      newState: input.state,
      triggerFatalError: false,
      incrementGeneration: false,
      setHealthUnknown: false,
      requiresSweep: false,
    }
  }

  switch (recoveryEntry.action) {
    case "re_admit":
      return {
        workerId: input.workerId,
        action: "re_admit",
        newState: "queued", // after admit
        triggerFatalError: false,
        incrementGeneration: true,
        setHealthUnknown: true,
        requiresSweep: false,
      }

    case "re_enqueue":
      return {
        workerId: input.workerId,
        action: "re_enqueue",
        newState: "queued",
        triggerFatalError: false,
        incrementGeneration: true,
        setHealthUnknown: true,
        requiresSweep: false,
      }

    case "fatal_error":
      return {
        workerId: input.workerId,
        action: "fatal_error",
        newState: "failing",
        triggerFatalError: true,
        incrementGeneration: true,
        setHealthUnknown: true,
        requiresSweep: input.osPid !== undefined,
      }

    case "cleanup_done":
      return {
        workerId: input.workerId,
        action: "cleanup_done",
        newState: "terminating",
        triggerFatalError: false,
        incrementGeneration: true,
        setHealthUnknown: true,
        requiresSweep: false,
      }

    case "sweep":
      return {
        workerId: input.workerId,
        action: "sweep",
        newState: "zombie",
        triggerFatalError: false,
        incrementGeneration: true,
        setHealthUnknown: true,
        requiresSweep: true,
      }

    default:
      return {
        workerId: input.workerId,
        action: "skip",
        newState: input.state,
        triggerFatalError: false,
        incrementGeneration: false,
        setHealthUnknown: false,
        requiresSweep: false,
      }
  }
}

// ---------------------------------------------------------------------------
// Full Recovery Pass (WorkerLifecycle-Part05 §The Recovery Algorithm)
// ---------------------------------------------------------------------------

export interface FullRecoveryResult {
  readonly survivors: readonly RecoveryOutput[]
  readonly recoveredCount: number
  readonly sweepRequired: boolean
}

/**
 * Run the recovery pass over all non-terminated Worker records.
 * WorkerLifecycle-Part05: "SELECT * FROM worker_lifecycle WHERE state NOT IN ('terminated')"
 */
export function runRecoveryPass(
  records: readonly RecoveryInput[],
): FullRecoveryResult {
  const survivors: RecoveryOutput[] = []

  // Process in workerId order for determinism (Part05 §step 2)
  const sorted = [...records].sort((a, b) => a.workerId.localeCompare(b.workerId))

  for (const record of sorted) {
    const output = determineRecoveryAction(record)
    survivors.push(output)
  }

  return {
    survivors,
    recoveredCount: survivors.filter(s => s.action !== "skip").length,
    sweepRequired: survivors.some(s => s.requiresSweep),
  }
}

// ---------------------------------------------------------------------------
// Escaped-Process Sweep (WorkerLifecycle-Part05 §Escaped-Process Sweep)
// ---------------------------------------------------------------------------

export interface EscapedProcessCandidate {
  readonly workerId: string
  readonly osPid: number
  readonly sandboxRoot?: string
}

export type SweepAction =
  | "clean"         // process does not exist
  | "pid_reused"    // process exists but command line doesn't match
  | "escapee"       // process is a genuine escapee
  | "skip"          // no osPid

export interface SweepResult {
  readonly workerId: string
  readonly osPid: number
  readonly action: SweepAction
  readonly verified: boolean
}

/**
 * Determine what to do with an escaped process candidate.
 * WorkerLifecycle-Part05: "MUST verify command-line identity before any kill."
 */
export function evaluateEscapedProcess(
  candidate: EscapedProcessCandidate,
  processExists: boolean,
  commandLineContains?: string,
): SweepResult {
  if (!candidate.osPid) {
    return { workerId: candidate.workerId, osPid: 0, action: "skip", verified: false }
  }

  if (!processExists) {
    return { workerId: candidate.workerId, osPid: candidate.osPid, action: "clean", verified: false }
  }

  // WorkerLifecycle-Part05 §step 4: verify command line
  if (candidate.sandboxRoot && commandLineContains) {
    if (!commandLineContains.includes(candidate.sandboxRoot)) {
      return { workerId: candidate.workerId, osPid: candidate.osPid, action: "pid_reused", verified: false }
    }
  }

  return { workerId: candidate.workerId, osPid: candidate.osPid, action: "escapee", verified: true }
}

// ---------------------------------------------------------------------------
// Recovery Event Factory
// ---------------------------------------------------------------------------

export function createRecoveryEvent(params: {
  workerId: string
  workspaceId: string
  restartGeneration: number
  stateBeforeRestart: WorkerState
  stateAfterRecovery: WorkerState
  osPidFound: boolean
}): WorkerRecoveryEvent {
  return {
    type: "worker.recovered",
    workerId: params.workerId,
    workspaceId: params.workspaceId,
    restartGeneration: params.restartGeneration,
    stateBeforeRestart: params.stateBeforeRestart,
    stateAfterRecovery: params.stateAfterRecovery,
    osPidFound: params.osPidFound,
    at: new Date().toISOString() as IsoTimestamp,
  }
}
