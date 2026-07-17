/**
 * P05-SCH-POLICIES — Readiness Evaluation (Safety Gates)
 *
 * Evaluates whether a SchedulingUnit can run by running it through all
 * safety gates in order: runtime_state → dependencies → permission →
 * approval → lock → budget → resource. Returns a ReadinessResult with
 * blockers explaining why the unit cannot run (Scheduler-Part02/Part05).
 */

import type {
  SchedulingUnit,
  ReadinessResult,
  ReadinessBlocker,
  BlockerKind,
} from "./scheduler-types"

// ---------------------------------------------------------------------------
// Gate context — external state the readiness checker needs
// ---------------------------------------------------------------------------

export interface ReadinessContext {
  /** Whether the runtime is in a state that allows work. */
  readonly runtimeReady: boolean
  /** Map of unitId → completion state for dependency resolution. */
  readonly completedUnitIds: ReadonlySet<string>
  /** Set of lock IDs that are currently held. */
  readonly heldLockIds: ReadonlySet<string>
  /** Set of permissions that are currently approved. */
  readonly approvedPermissions: ReadonlySet<string>
  /** Whether approval has been granted for the unit. */
  readonly approvedUnitIds: ReadonlySet<string>
  /** Total running count for concurrency check. */
  readonly runningCount: number
  /** Maximum allowed concurrent units. */
  readonly maxConcurrency: number
  /** Total budget consumed in current window. */
  readonly totalBudgetCostMicroUsd: number
  /** Maximum budget allowed. */
  readonly maxBudgetCostMicroUsd: number
}

// ---------------------------------------------------------------------------
// Default context (all-pass)
// ---------------------------------------------------------------------------

export function createDefaultReadinessContext(): ReadinessContext {
  return {
    runtimeReady: true,
    completedUnitIds: new Set(),
    heldLockIds: new Set(),
    approvedPermissions: new Set(),
    approvedUnitIds: new Set(),
    runningCount: 0,
    maxConcurrency: Infinity,
    totalBudgetCostMicroUsd: 0,
    maxBudgetCostMicroUsd: Infinity,
  }
}

// ---------------------------------------------------------------------------
// Gate evaluation
// ---------------------------------------------------------------------------

function checkRuntimeGate(
  _unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessBlocker | undefined {
  if (!ctx.runtimeReady) {
    return {
      kind: "runtime_state",
      message: "Runtime is not in a state that accepts work",
      recoverable: true,
    }
  }
  return undefined
}

function checkDependencyGate(
  unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessBlocker | undefined {
  for (const depId of unit.dependencies) {
    if (!ctx.completedUnitIds.has(depId)) {
      return {
        kind: "dependency",
        message: `Dependency ${depId} has not completed`,
        blockingObjectId: depId,
        recoverable: true,
      }
    }
  }
  return undefined
}

function checkPermissionGate(
  unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessBlocker | undefined {
  for (const perm of unit.requiredPermissions) {
    if (!ctx.approvedPermissions.has(perm)) {
      return {
        kind: "permission",
        message: `Permission "${perm}" not approved`,
        blockingObjectId: perm,
        recoverable: true,
      }
    }
  }
  return undefined
}

function checkApprovalGate(
  unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessBlocker | undefined {
  // Approval gate blocks when the unit has unapproved permissions AND
  // has not been explicitly approved. If all permissions pass the
  // permission gate, no additional approval is required.
  if (unit.requiredPermissions.length > 0) {
    const hasUnapproved = unit.requiredPermissions.some(
      (p) => !ctx.approvedPermissions.has(p),
    )
    if (hasUnapproved && !ctx.approvedUnitIds.has(unit.id)) {
      return {
        kind: "approval",
        message: `Unit ${unit.id} waiting for human approval`,
        blockingObjectId: unit.id,
        recoverable: true,
      }
    }
  }
  return undefined
}

function checkLockGate(
  unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessBlocker | undefined {
  for (const lockId of unit.requiredLocks) {
    if (ctx.heldLockIds.has(lockId)) {
      return {
        kind: "lock",
        message: `Lock "${lockId}" is held by another unit`,
        blockingObjectId: lockId,
        recoverable: true,
      }
    }
  }
  return undefined
}

function checkBudgetGate(
  unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessBlocker | undefined {
  if (
    unit.budgetEstimate?.estimatedCostMicroUsd !== undefined &&
    ctx.maxBudgetCostMicroUsd < Infinity
  ) {
    const projected =
      ctx.totalBudgetCostMicroUsd + unit.budgetEstimate.estimatedCostMicroUsd
    if (projected > ctx.maxBudgetCostMicroUsd) {
      return {
        kind: "budget",
        message: `Budget would be exceeded: projected ${projected} > max ${ctx.maxBudgetCostMicroUsd}`,
        recoverable: true,
      }
    }
  }
  return undefined
}

function checkResourceGate(
  _unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessBlocker | undefined {
  if (ctx.maxConcurrency < Infinity && ctx.runningCount >= ctx.maxConcurrency) {
    return {
      kind: "resource",
      message: `Concurrency limit reached: ${ctx.runningCount}/${ctx.maxConcurrency}`,
      recoverable: true,
    }
  }
  return undefined
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** All gate checkers in recommended order (Scheduler-Part05 §Safety Gate Order). */
const GATE_CHECKS: Array<
  (unit: SchedulingUnit, ctx: ReadinessContext) => ReadinessBlocker | undefined
> = [
  checkRuntimeGate,
  checkDependencyGate,
  checkPermissionGate,
  checkApprovalGate,
  checkLockGate,
  checkBudgetGate,
  checkResourceGate,
]

/**
 * Evaluate readiness for a scheduling unit.
 *
 * Runs all safety gates in order and returns the first blocker found,
 * or a ready result with no blockers.
 */
export function evaluateReadiness(
  unit: SchedulingUnit,
  ctx: ReadinessContext,
): ReadinessResult {
  const blockers: ReadinessBlocker[] = []

  for (const check of GATE_CHECKS) {
    const blocker = check(unit, ctx)
    if (blocker) {
      blockers.push(blocker)
      // Return first blocker only — the primary gate failure
      return {
        unitId: unit.id,
        ready: false,
        blockers,
        checkedAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
      }
    }
  }

  return {
    unitId: unit.id,
    ready: true,
    blockers: [],
    checkedAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
  }
}

/**
 * Evaluate readiness for multiple units and partition into ready and blocked.
 */
export function partitionByReadiness(
  units: readonly SchedulingUnit[],
  ctx: ReadinessContext,
): {
  ready: SchedulingUnit[]
  blocked: Array<{ unit: SchedulingUnit; result: ReadinessResult }>
} {
  const ready: SchedulingUnit[] = []
  const blocked: Array<{ unit: SchedulingUnit; result: ReadinessResult }> = []

  for (const unit of units) {
    const result = evaluateReadiness(unit, ctx)
    if (result.ready) {
      ready.push(unit)
    } else {
      blocked.push({ unit, result })
    }
  }

  return { ready, blocked }
}

/**
 * Map a ReadinessBlocker kind to the corresponding wait queue.
 */
export function blockerToWaitQueue(kind: BlockerKind): string {
  const mapping: Record<BlockerKind, string> = {
    dependency: "dependency_wait",
    permission: "permission_wait",
    approval: "approval_wait",
    lock: "lock_wait",
    budget: "budget_wait",
    runtime_state: "dependency_wait",
    resource: "dependency_wait",
    tool_unavailable: "dependency_wait",
    workspace_unavailable: "dependency_wait",
  }
  return mapping[kind]
}
