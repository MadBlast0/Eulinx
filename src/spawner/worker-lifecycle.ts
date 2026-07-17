/**
 * P06-SPAWN-MANAGER — Worker Lifecycle Record & Types
 *
 * WorkerLifecycle-Part01 §Worker Lifecycle Object Model:
 * WorkerLifecycleRecord, WorkerTransition, WorkerFailureRecord.
 * WorkerLifecycle-Part04 §Failure Causes and Failure Record.
 */

import type { IsoTimestamp } from "@/core/types"
import type { WorkerState, WorkerTrigger, WorkerHealth, WorkerFailureCause } from "./worker-state"
import type { RuntimeActorRef } from "./spawner-types"

// ---------------------------------------------------------------------------
// Worker Lifecycle Record (WorkerLifecycle-Part01 §WorkerLifecycleRecord)
// ---------------------------------------------------------------------------

export interface WorkerLifecycleRecord {
  readonly workerId: string
  readonly workspaceId: string
  readonly sessionId: string
  state: WorkerState
  readonly previousState?: WorkerState
  readonly resumeState?: WorkerState
  readonly stateEnteredAt: IsoTimestamp
  readonly stateDeadlineAt?: IsoTimestamp
  readonly transitionSeq: number
  readonly lastHeartbeatAt?: IsoTimestamp
  readonly missedHeartbeats: number
  readonly health: WorkerHealth
  readonly terminationReason?: string
  readonly failureCause?: WorkerFailureCause
  readonly processId?: string
  readonly terminalId?: string
  readonly restartGeneration: number
  readonly rootWorkerId: string
  readonly parentWorkerId?: string
  readonly depth: number
  readonly lineage: readonly string[]
  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Transition (WorkerLifecycle-Part01 §WorkerTransition)
// ---------------------------------------------------------------------------

export interface WorkerTransition {
  readonly workerId: string
  readonly seq: number
  readonly from: WorkerState
  readonly to: WorkerState
  readonly trigger: WorkerTrigger
  readonly actor: RuntimeActorRef
  readonly reason: string
  readonly at: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Failure Record (WorkerLifecycle-Part04 §WorkerFailureRecord)
// ---------------------------------------------------------------------------

export interface WorkerFailureRecord {
  readonly workerId: string
  readonly cause: WorkerFailureCause
  readonly detail: string
  readonly stateAtFailure: WorkerState
  readonly transitionSeqAtFailure: number
  readonly processExitCode?: number
  readonly processSignal?: string
  readonly lastOutputTail?: string
  readonly detectedBy: RuntimeActorRef
  readonly at: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Transition Result (WorkerLifecycle-Part02 §TransitionResult)
// ---------------------------------------------------------------------------

export type TransitionResult =
  | { readonly ok: true; readonly record: WorkerLifecycleRecord; readonly event: WorkerLifecycleEvent }
  | { readonly ok: false; readonly error: TransitionError }

export interface TransitionError {
  readonly kind:
    | "illegal_transition"
    | "worker_not_found"
    | "state_changed_concurrently"
    | "corrupt_lifecycle_record"
    | "persistence_failed"
  readonly workerId: string
  readonly attemptedFrom: WorkerState
  readonly attemptedTrigger: WorkerTrigger
  readonly actualState?: WorkerState
  readonly message: string
}

// ---------------------------------------------------------------------------
// Worker Lifecycle Event (WorkerLifecycle-Part02 §Lifecycle Events)
// ---------------------------------------------------------------------------

export interface WorkerLifecycleEvent {
  readonly type: "worker.state_changed"
  readonly workerId: string
  readonly workspaceId: string
  readonly sessionId: string
  readonly seq: number
  readonly from: WorkerState
  readonly to: WorkerState
  readonly trigger: WorkerTrigger
  readonly actor: RuntimeActorRef
  readonly reason: string
  readonly restartGeneration: number
  readonly at: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Recovery Event (WorkerLifecycle-Part05 §Recovery Events)
// ---------------------------------------------------------------------------

export interface WorkerRecoveryEvent {
  readonly type: "worker.recovered"
  readonly workerId: string
  readonly workspaceId: string
  readonly restartGeneration: number
  readonly stateBeforeRestart: WorkerState
  readonly stateAfterRecovery: WorkerState
  readonly osPidFound: boolean
  readonly at: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker Identity Assignment (WorkerCreation-Part03 §Derived Identity)
// ---------------------------------------------------------------------------

export interface WorkerIdentityAssignment {
  readonly workerId: string
  readonly rootWorkerId: string
  readonly parentWorkerId?: string
  readonly depth: number
  readonly siblingIndex: number
  readonly lineage: readonly string[]
  readonly displayName: string
}

// ---------------------------------------------------------------------------
// Worker Heartbeat (WorkerLifecycle-Part04 §Heartbeats)
// ---------------------------------------------------------------------------

export interface WorkerHeartbeat {
  readonly workerId: string
  readonly restartGeneration: number
  readonly seq: number
  readonly processId: string
  readonly at: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Recovery Table Entry (WorkerLifecycle-Part05 §Recovery Table)
// ---------------------------------------------------------------------------

export interface RecoveryAction {
  readonly state: WorkerState
  readonly action: string
  readonly description: string
}

export const RECOVERY_TABLE: ReadonlyMap<WorkerState, RecoveryAction> = new Map([
  ["requested", { state: "requested", action: "re_admit", description: "Re-admit. Nothing was allocated." }],
  ["queued", { state: "queued", action: "re_enqueue", description: "Re-enqueue with the Scheduler." }],
  ["spawning", { state: "spawning", action: "fatal_error", description: "Process may or may not exist. Mark crashed." }],
  ["initializing", { state: "initializing", action: "fatal_error", description: "Half-initialized is not recoverable." }],
  ["idle", { state: "idle", action: "fatal_error", description: "Process is gone; only record survived." }],
  ["working", { state: "working", action: "fatal_error", description: "In-flight task disposed." }],
  ["waiting", { state: "waiting", action: "fatal_error", description: "Awaited response can never arrive." }],
  ["blocked", { state: "blocked", action: "fatal_error", description: "Release the gate so others can proceed." }],
  ["paused", { state: "paused", action: "fatal_error", description: "Frozen PTY did not survive restart." }],
  ["failing", { state: "failing", action: "cleanup_done", description: "Resume the death procedure." }],
  ["terminating", { state: "terminating", action: "cleanup_done", description: "Re-run death procedure (idempotent)." }],
  ["zombie", { state: "zombie", action: "sweep", description: "Hand to escaped-process sweep." }],
])

// ---------------------------------------------------------------------------
// Default Lifecycle Record Factory
// ---------------------------------------------------------------------------

export function createLifecycleRecord(params: {
  workerId: string
  workspaceId: string
  sessionId: string
  processId?: string
  terminalId?: string
  parentWorkerId?: string
  depth?: number
  lineage?: readonly string[]
}): WorkerLifecycleRecord {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    workerId: params.workerId,
    workspaceId: params.workspaceId,
    sessionId: params.sessionId,
    state: "requested",
    stateEnteredAt: now,
    transitionSeq: 0,
    missedHeartbeats: 0,
    health: "unknown",
    processId: params.processId,
    terminalId: params.terminalId,
    restartGeneration: 0,
    rootWorkerId: params.parentWorkerId ? params.lineage?.[0] ?? params.workerId : params.workerId,
    parentWorkerId: params.parentWorkerId,
    depth: params.depth ?? 0,
    lineage: params.lineage ?? [params.workerId],
    createdAt: now,
    updatedAt: now,
  }
}
