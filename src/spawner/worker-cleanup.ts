/**
 * P06-SPAWN-CLEANUP — Worker Cleanup & Destruction
 *
 * WorkerLifecycle-Part03 §Entry/Exit Side Effects.
 * WorkerSpawner-Part05 §Cancellation, §Recovery, §Quarantine.
 * WorkerCreation-Part05 §Rollback Points.
 */

import type { IsoTimestamp } from "@/core/types"
import type { WorkerState, WorkerFailureCause } from "./worker-state"
import type { WorkerFailureRecord } from "./worker-lifecycle"
import type { RuntimeActorRef } from "./spawner-types"

// ---------------------------------------------------------------------------
// Cleanup Action Types
// ---------------------------------------------------------------------------

export type CleanupActionKind =
  | "release_locks"
  | "flush_artifacts"
  | "flush_memory"
  | "cascade_to_children"
  | "tear_down_terminal"
  | "cleanup_sandbox"
  | "revoke_permissions"
  | "release_budget"
  | "terminate_process"
  | "mark_record"

export interface CleanupAction {
  readonly kind: CleanupActionKind
  readonly description: string
  readonly required: boolean
  readonly idempotent: boolean
}

// ---------------------------------------------------------------------------
// Cleanup Plan (WorkerLifecycle-Part03 §Exit Side Effects)
// ---------------------------------------------------------------------------

/**
 * Build a cleanup plan for a Worker entering terminating/failing.
 * Each action is idempotent per spec requirement.
 */
export function buildCleanupPlan(state: WorkerState): readonly CleanupAction[] {
  const actions: CleanupAction[] = []

  if (state === "failing" || state === "terminating") {
    // WorkerTermination-Part02: death procedure
    actions.push({ kind: "release_locks", description: "Release all held locks", required: true, idempotent: true })
    actions.push({ kind: "flush_artifacts", description: "Flush in-progress artifacts", required: true, idempotent: true })
    actions.push({ kind: "flush_memory", description: "Write memory to durable store", required: true, idempotent: true })
    actions.push({ kind: "cascade_to_children", description: "Terminate child Workers", required: true, idempotent: true })
    actions.push({ kind: "tear_down_terminal", description: "Close terminal and PTY", required: true, idempotent: true })
    actions.push({ kind: "cleanup_sandbox", description: "Remove sandbox directory per policy", required: false, idempotent: true })
    actions.push({ kind: "revoke_permissions", description: "Revoke attached permission grants", required: true, idempotent: true })
    actions.push({ kind: "release_budget", description: "Release reserved budget", required: true, idempotent: true })
    actions.push({ kind: "terminate_process", description: "Kill OS process if still alive", required: true, idempotent: true })
    actions.push({ kind: "mark_record", description: "Mark Worker record as terminated", required: true, idempotent: true })
  }

  return actions
}

// ---------------------------------------------------------------------------
// Rollback Points (WorkerCreation-Part05 §Rollback Points)
// ---------------------------------------------------------------------------

export interface RollbackPoint {
  readonly step: number
  readonly name: string
  readonly rollbackAction: string
  readonly description: string
}

export const CREATION_ROLLBACK_POINTS: readonly RollbackPoint[] = [
  { step: 1, name: "identity_reserved", rollbackAction: "release_identity", description: "Release identity reservation" },
  { step: 2, name: "worker_record_created", rollbackAction: "mark_creation_failed", description: "Mark creation_failed, do not delete silently" },
  { step: 3, name: "permission_profile_attached", rollbackAction: "revoke_grants", description: "Revoke permission grants" },
  { step: 4, name: "sandbox_created", rollbackAction: "cleanup_sandbox", description: "Cleanup sandbox directory" },
  { step: 5, name: "terminal_created", rollbackAction: "close_terminal", description: "Close terminal" },
  { step: 6, name: "process_started", rollbackAction: "terminate_process", description: "Terminate process" },
  { step: 7, name: "context_package_created", rollbackAction: "archive_context", description: "Mark unused or archive context package" },
]

// ---------------------------------------------------------------------------
// Rollback Executor
// ---------------------------------------------------------------------------

export interface RollbackResult {
  readonly completedSteps: readonly number[]
  readonly failedStep?: number
  readonly error?: string
}

/**
 * Execute rollback for completed creation steps in reverse order.
 * WorkerCreation-Part05: "any failure runs every completed rollback in reverse order."
 */
export async function executeRollback(
  completedSteps: readonly number[],
  executor: (step: RollbackPoint) => Promise<boolean>,
): Promise<RollbackResult> {
  const reversed = [...completedSteps].reverse()
  const rolledBack: number[] = []

  for (const stepNum of reversed) {
    const point = CREATION_ROLLBACK_POINTS.find(p => p.step === stepNum)
    if (!point) continue

    try {
      const success = await executor(point)
      if (success) {
        rolledBack.push(stepNum)
      } else {
        return { completedSteps: rolledBack, failedStep: stepNum, error: `Rollback failed at step ${stepNum}: ${point.name}` }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { completedSteps: rolledBack, failedStep: stepNum, error: `Rollback failed at step ${stepNum}: ${msg}` }
    }
  }

  return { completedSteps: rolledBack }
}

// ---------------------------------------------------------------------------
// Quarantine Rules (WorkerSpawner-Part05 §Quarantine)
// ---------------------------------------------------------------------------

export interface QuarantineState {
  readonly workerId: string
  readonly quarantinedAt: IsoTimestamp
  readonly reason: string
  readonly canReceiveInput: false
  readonly canInvokeTools: false
  readonly canWriteArtifacts: false
  readonly canSpawnChildren: false
  readonly mustBeReviewed: true
}

export function createQuarantineState(workerId: string, reason: string): QuarantineState {
  return {
    workerId,
    quarantinedAt: new Date().toISOString() as IsoTimestamp,
    reason,
    canReceiveInput: false,
    canInvokeTools: false,
    canWriteArtifacts: false,
    canSpawnChildren: false,
    mustBeReviewed: true,
  }
}

// ---------------------------------------------------------------------------
// Failure Record Factory (WorkerLifecycle-Part04)
// ---------------------------------------------------------------------------

export function createFailureRecord(params: {
  workerId: string
  cause: WorkerFailureCause
  detail: string
  stateAtFailure: WorkerState
  transitionSeqAtFailure: number
  processExitCode?: number
  processSignal?: string
  lastOutputTail?: string
  detectedBy: RuntimeActorRef
}): WorkerFailureRecord {
  return {
    workerId: params.workerId,
    cause: params.cause,
    detail: params.detail,
    stateAtFailure: params.stateAtFailure,
    transitionSeqAtFailure: params.transitionSeqAtFailure,
    processExitCode: params.processExitCode,
    processSignal: params.processSignal,
    lastOutputTail: params.lastOutputTail
      ? params.lastOutputTail.slice(-8192)
      : undefined,
    detectedBy: params.detectedBy,
    at: new Date().toISOString() as IsoTimestamp,
  }
}

// ---------------------------------------------------------------------------
// Cleanup Summary
// ---------------------------------------------------------------------------

export interface CleanupSummary {
  readonly workerId: string
  readonly actionsExecuted: readonly CleanupActionKind[]
  readonly actionsFailed: readonly CleanupActionKind[]
  readonly success: boolean
  readonly durationMs: number
}
