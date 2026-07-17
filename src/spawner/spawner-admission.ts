/**
 * P06-SPAWN-POLICIES — Admission Control
 *
 * WorkerCreation-Part03 §Admission Control: decides whether to accept work,
 * distinct from scheduling (when) and validation (is it legal).
 * Capacity pressure defers, budget exhaustion rejects.
 */

import type { SpawnPriority } from "./spawner-types"

// ---------------------------------------------------------------------------
// Admission Pressure (WorkerCreation-Part03 §AdmissionPressure)
// ---------------------------------------------------------------------------

export type AdmissionPressure =
  | "workspace_worker_limit"
  | "session_worker_limit"
  | "global_worker_limit"
  | "terminal_slots_exhausted"
  | "provider_rate_limited"
  | "workspace_budget_exhausted"
  | "session_budget_exhausted"
  | "parent_budget_exhausted"
  | "disk_pressure"
  | "runtime_degraded"
  | "queue_depth_exceeded"

// ---------------------------------------------------------------------------
// Admission Verdict
// ---------------------------------------------------------------------------

export type AdmissionVerdict = "admit" | "defer" | "reject"

export interface AdmissionDecision {
  readonly verdict: AdmissionVerdict
  readonly retryAfterMs?: number
  readonly reason?: AdmissionPressure
}

// ---------------------------------------------------------------------------
// Default Retry Delays per Pressure (WorkerCreation-Part03 §Pressure Table)
// ---------------------------------------------------------------------------

const DEFER_DELAY_MS: Record<string, number> = {
  workspace_worker_limit: 5_000,
  session_worker_limit: 5_000,
  global_worker_limit: 5_000,
  terminal_slots_exhausted: 5_000,
  queue_depth_exceeded: 10_000,
  disk_pressure: 30_000,
  runtime_degraded: 10_000,
}

// ---------------------------------------------------------------------------
// Admission State Input
// ---------------------------------------------------------------------------

export interface AdmissionState {
  readonly liveWorkersInWorkspace: number
  readonly liveWorkersInSession: number
  readonly liveWorkersGlobal: number
  readonly freeTerminalSlots: number
  readonly providerRateLimited: boolean
  readonly providerRetryAfterMs?: number
  readonly workspaceBudgetRemaining: number
  readonly sessionBudgetRemaining: number
  readonly parentBudgetRemaining?: number
  readonly freeDiskBytes: number
  readonly minimumDiskBytes: number
  readonly runtimeHealth: "healthy" | "degraded" | "unhealthy"
  readonly schedulerQueueDepth: number
  readonly maxSchedulerQueueDepth: number
  readonly maxLiveWorkersPerWorkspace: number
  readonly maxLiveWorkersPerSession: number
  readonly maxLiveWorkersGlobal: number
}

// ---------------------------------------------------------------------------
// Admission Algorithm (WorkerCreation-Part03 §The Admission Algorithm)
// ---------------------------------------------------------------------------

export function evaluateAdmission(
  state: AdmissionState,
  priority: SpawnPriority,
): AdmissionDecision {
  // Step 1: Workspace worker limit
  if (state.liveWorkersInWorkspace >= state.maxLiveWorkersPerWorkspace) {
    return defer("workspace_worker_limit")
  }

  // Step 2: Session worker limit
  if (state.liveWorkersInSession >= state.maxLiveWorkersPerSession) {
    return defer("session_worker_limit")
  }

  // Step 3: Global worker limit
  if (state.liveWorkersGlobal >= state.maxLiveWorkersGlobal) {
    return defer("global_worker_limit")
  }

  // Step 4: Terminal slots
  if (state.freeTerminalSlots <= 0) {
    return defer("terminal_slots_exhausted")
  }

  // Step 5: Provider rate limit
  if (state.providerRateLimited) {
    return {
      verdict: "defer",
      retryAfterMs: state.providerRetryAfterMs ?? DEFER_DELAY_MS.provider_rate_limited,
      reason: "provider_rate_limited",
    }
  }

  // Step 6: Workspace budget (reject — budget doesn't free up)
  if (state.workspaceBudgetRemaining <= 0) {
    return reject("workspace_budget_exhausted")
  }

  // Step 7: Session budget (reject)
  if (state.sessionBudgetRemaining <= 0) {
    return reject("session_budget_exhausted")
  }

  // Step 8: Parent budget (reject)
  if (state.parentBudgetRemaining !== undefined && state.parentBudgetRemaining <= 0) {
    return reject("parent_budget_exhausted")
  }

  // Step 9: Disk pressure
  if (state.freeDiskBytes < state.minimumDiskBytes) {
    return defer("disk_pressure")
  }

  // Step 10: Runtime health
  if (state.runtimeHealth === "degraded" || state.runtimeHealth === "unhealthy") {
    return defer("runtime_degraded")
  }

  // Step 11: Queue depth (critical bypasses this only)
  if (state.schedulerQueueDepth >= state.maxSchedulerQueueDepth && priority !== "critical") {
    return defer("queue_depth_exceeded")
  }

  // Step 12: Admit
  return { verdict: "admit" }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defer(reason: AdmissionPressure): AdmissionDecision {
  return {
    verdict: "defer",
    retryAfterMs: DEFER_DELAY_MS[reason] ?? 5_000,
    reason,
  }
}

function reject(reason: AdmissionPressure): AdmissionDecision {
  return {
    verdict: "reject",
    reason,
  }
}

// ---------------------------------------------------------------------------
// Admission Pressure Helpers
// ---------------------------------------------------------------------------

export function isRetryablePressure(pressure: AdmissionPressure): boolean {
  // Budget pressures are not retryable
  return pressure !== "workspace_budget_exhausted" &&
    pressure !== "session_budget_exhausted" &&
    pressure !== "parent_budget_exhausted"
}
