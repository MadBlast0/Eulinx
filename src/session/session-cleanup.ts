/**
 * P07-SESSION-CLEANUP — Session Cleanup
 *
 * Session-Part04: Security and cleanup.
 * Session-Part01: "A Session MUST NOT outlive its Workspace."
 * Handles resource cleanup when a session ends or is destroyed.
 */

import type { SessionId, WorkspaceId, WorkerId, IsoTimestamp } from "@/core/types"
import type { PersistedSessionState } from "@/state/session-state"
import { SESSION_TERMINAL } from "@/state/session-state"

// ---------------------------------------------------------------------------
// Cleanup Action Types
// ---------------------------------------------------------------------------

export type SessionCleanupActionKind =
  | "terminate_workers"
  | "release_locks"
  | "flush_memory"
  | "archive_artifacts"
  | "release_budget"
  | "cleanup_temp_files"
  | "remove_event_log"
  | "update_metrics"
  | "emit_final_event"

export interface SessionCleanupAction {
  readonly kind: SessionCleanupActionKind
  readonly description: string
  readonly required: boolean
  readonly idempotent: boolean
}

// ---------------------------------------------------------------------------
// Cleanup Plan
// ---------------------------------------------------------------------------

export function buildSessionCleanupPlan(state: PersistedSessionState): readonly SessionCleanupAction[] {
  const actions: SessionCleanupAction[] = []

  // Always: terminate active workers
  if (state.activeWorkerIds.length > 0) {
    actions.push({
      kind: "terminate_workers",
      description: `Terminate ${state.activeWorkerIds.length} active worker(s)`,
      required: true,
      idempotent: true,
    })
  }

  // Always: release locks (idempotent)
  actions.push({
    kind: "release_locks",
    description: "Release all session-scoped locks",
    required: true,
    idempotent: true,
  })

  // Always: flush memory
  actions.push({
    kind: "flush_memory",
    description: "Write session memory to durable store",
    required: true,
    idempotent: true,
  })

  // Always: archive artifacts
  if (state.artifactIds.length > 0) {
    actions.push({
      kind: "archive_artifacts",
      description: `Archive ${state.artifactIds.length} artifact(s)`,
      required: false,
      idempotent: true,
    })
  }

  // Always: release budget
  actions.push({
    kind: "release_budget",
    description: "Release session-scoped budget reservations",
    required: true,
    idempotent: true,
  })

  // Always: cleanup temp files
  actions.push({
    kind: "cleanup_temp_files",
    description: "Remove temporary execution files",
    required: false,
    idempotent: true,
  })

  // Always: emit final event
  actions.push({
    kind: "emit_final_event",
    description: "Emit session cleanup complete event",
    required: true,
    idempotent: true,
  })

  return actions
}

// ---------------------------------------------------------------------------
// Cleanup Summary
// ---------------------------------------------------------------------------

export interface SessionCleanupSummary {
  readonly sessionId: SessionId
  readonly actionsExecuted: readonly SessionCleanupActionKind[]
  readonly actionsFailed: readonly SessionCleanupActionKind[]
  readonly success: boolean
  readonly durationMs: number
  readonly cleanedUpAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Cleanup Executor
// ---------------------------------------------------------------------------

export async function executeSessionCleanup(
  state: PersistedSessionState,
  executor: (action: SessionCleanupAction) => Promise<boolean>,
): Promise<SessionCleanupSummary> {
  const start = Date.now()
  const plan = buildSessionCleanupPlan(state)
  const executed: SessionCleanupActionKind[] = []
  const failed: SessionCleanupActionKind[] = []

  for (const action of plan) {
    try {
      const success = await executor(action)
      if (success) {
        executed.push(action.kind)
      } else if (action.required) {
        failed.push(action.kind)
      }
    } catch {
      if (action.required) {
        failed.push(action.kind)
      }
    }
  }

  const now = new Date().toISOString() as IsoTimestamp
  return {
    sessionId: state.id,
    actionsExecuted: executed,
    actionsFailed: failed,
    success: failed.length === 0,
    durationMs: Date.now() - start,
    cleanedUpAt: now,
  }
}

// ---------------------------------------------------------------------------
// Cleanup Validation
// ---------------------------------------------------------------------------

export function isSessionCleanedUp(state: PersistedSessionState): boolean {
  const isTerminal = (SESSION_TERMINAL as readonly string[]).includes(state.state)
  return isTerminal && state.activeWorkerIds.length === 0
}
