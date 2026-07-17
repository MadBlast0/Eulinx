/**
 * P05-SCH-POLICIES — Readiness Evaluation Tests
 *
 * Tests for all safety gates: runtime, dependencies, permissions, approval,
 * locks, budget, and concurrency resource checks.
 */

import { describe, it, expect } from "vitest"
import {
  evaluateReadiness,
  partitionByReadiness,
  blockerToWaitQueue,
  createDefaultReadinessContext,
} from "./readiness"
import type { SchedulingUnit } from "./scheduler-types"
import type { ReadinessContext } from "./readiness"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUnit(
  id: string,
  overrides: Partial<SchedulingUnit> = {},
): SchedulingUnit {
  return {
    id,
    kind: "task",
    workspaceId: "ws-1" as SchedulingUnit["workspaceId"],
    priority: "normal",
    dependencies: [],
    requiredPermissions: [],
    requiredLocks: [],
    state: "queued",
    createdAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    updatedAt: new Date().toISOString() as import("@/core/types").IsoTimestamp,
    ...overrides,
  }
}

function allPassContext(overrides: Partial<ReadinessContext> = {}): ReadinessContext {
  return { ...createDefaultReadinessContext(), ...overrides }
}

// ---------------------------------------------------------------------------
// Runtime Gate
// ---------------------------------------------------------------------------

describe("Runtime Gate", () => {
  it("passes when runtime is ready", () => {
    const unit = makeUnit("u1")
    const ctx = allPassContext({ runtimeReady: true })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  it("blocks when runtime is not ready", () => {
    const unit = makeUnit("u1")
    const ctx = allPassContext({ runtimeReady: false })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(false)
    expect(result.blockers).toHaveLength(1)
    expect(result.blockers[0]!.kind).toBe("runtime_state")
    expect(result.blockers[0]!.recoverable).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Dependency Gate
// ---------------------------------------------------------------------------

describe("Dependency Gate", () => {
  it("passes when all dependencies completed", () => {
    const unit = makeUnit("u1", { dependencies: ["dep-1", "dep-2"] })
    const ctx = allPassContext({
      completedUnitIds: new Set(["dep-1", "dep-2"]),
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })

  it("blocks when dependency not completed", () => {
    const unit = makeUnit("u1", { dependencies: ["dep-1", "dep-2"] })
    const ctx = allPassContext({
      completedUnitIds: new Set(["dep-1"]),
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(false)
    expect(result.blockers[0]!.kind).toBe("dependency")
    expect(result.blockers[0]!.blockingObjectId).toBe("dep-2")
  })

  it("passes with no dependencies", () => {
    const unit = makeUnit("u1", { dependencies: [] })
    const ctx = allPassContext()
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Permission Gate
// ---------------------------------------------------------------------------

describe("Permission Gate", () => {
  it("passes when all permissions approved", () => {
    const unit = makeUnit("u1", { requiredPermissions: ["file.write", "git.push"] })
    const ctx = allPassContext({
      approvedPermissions: new Set(["file.write", "git.push"]),
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })

  it("blocks when permission not approved", () => {
    const unit = makeUnit("u1", { requiredPermissions: ["git.push"] })
    const ctx = allPassContext({
      approvedPermissions: new Set(),
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(false)
    expect(result.blockers[0]!.kind).toBe("permission")
    expect(result.blockers[0]!.blockingObjectId).toBe("git.push")
  })

  it("passes with no required permissions", () => {
    const unit = makeUnit("u1", { requiredPermissions: [] })
    const ctx = allPassContext()
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Lock Gate
// ---------------------------------------------------------------------------

describe("Lock Gate", () => {
  it("passes when locks are available", () => {
    const unit = makeUnit("u1", { requiredLocks: ["lock-1"] })
    const ctx = allPassContext({
      heldLockIds: new Set(),
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })

  it("blocks when lock is held", () => {
    const unit = makeUnit("u1", { requiredLocks: ["lock-1"] })
    const ctx = allPassContext({
      heldLockIds: new Set(["lock-1"]),
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(false)
    expect(result.blockers[0]!.kind).toBe("lock")
    expect(result.blockers[0]!.blockingObjectId).toBe("lock-1")
  })
})

// ---------------------------------------------------------------------------
// Budget Gate
// ---------------------------------------------------------------------------

describe("Budget Gate", () => {
  it("passes when budget available", () => {
    const unit = makeUnit("u1", {
      budgetEstimate: { estimatedCostMicroUsd: 500, confidence: "medium" },
    })
    const ctx = allPassContext({
      totalBudgetCostMicroUsd: 200,
      maxBudgetCostMicroUsd: 1000,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })

  it("blocks when budget exceeded", () => {
    const unit = makeUnit("u1", {
      budgetEstimate: { estimatedCostMicroUsd: 500, confidence: "medium" },
    })
    const ctx = allPassContext({
      totalBudgetCostMicroUsd: 800,
      maxBudgetCostMicroUsd: 1000,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(false)
    expect(result.blockers[0]!.kind).toBe("budget")
  })

  it("passes with no budget estimate", () => {
    const unit = makeUnit("u1")
    const ctx = allPassContext({
      totalBudgetCostMicroUsd: 999,
      maxBudgetCostMicroUsd: 1000,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })

  it("passes with unlimited budget", () => {
    const unit = makeUnit("u1", {
      budgetEstimate: { estimatedCostMicroUsd: 999_999, confidence: "low" },
    })
    const ctx = allPassContext({
      totalBudgetCostMicroUsd: 0,
      maxBudgetCostMicroUsd: Infinity,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Resource Gate (Concurrency)
// ---------------------------------------------------------------------------

describe("Resource Gate", () => {
  it("passes when under concurrency limit", () => {
    const unit = makeUnit("u1")
    const ctx = allPassContext({
      runningCount: 3,
      maxConcurrency: 8,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })

  it("blocks when at concurrency limit", () => {
    const unit = makeUnit("u1")
    const ctx = allPassContext({
      runningCount: 8,
      maxConcurrency: 8,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(false)
    expect(result.blockers[0]!.kind).toBe("resource")
  })

  it("passes with unlimited concurrency", () => {
    const unit = makeUnit("u1")
    const ctx = allPassContext({
      runningCount: 1000,
      maxConcurrency: Infinity,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// All gates combined
// ---------------------------------------------------------------------------

describe("All gates combined", () => {
  it("passes when all conditions satisfied", () => {
    const unit = makeUnit("u1", {
      dependencies: ["dep-1"],
      requiredPermissions: ["file.write"],
      requiredLocks: ["lock-1"],
      budgetEstimate: { estimatedCostMicroUsd: 100, confidence: "high" },
    })
    const ctx = allPassContext({
      runtimeReady: true,
      completedUnitIds: new Set(["dep-1"]),
      approvedPermissions: new Set(["file.write"]),
      heldLockIds: new Set(),
      totalBudgetCostMicroUsd: 50,
      maxBudgetCostMicroUsd: 1000,
      runningCount: 2,
      maxConcurrency: 8,
    })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(true)
    expect(result.blockers).toHaveLength(0)
  })

  it("returns first blocker only (runtime blocks before dependency)", () => {
    const unit = makeUnit("u1", { dependencies: ["missing-dep"] })
    const ctx = allPassContext({ runtimeReady: false })
    const result = evaluateReadiness(unit, ctx)
    expect(result.ready).toBe(false)
    expect(result.blockers).toHaveLength(1)
    expect(result.blockers[0]!.kind).toBe("runtime_state")
  })
})

// ---------------------------------------------------------------------------
// partitionByReadiness
// ---------------------------------------------------------------------------

describe("partitionByReadiness", () => {
  it("partitions units into ready and blocked", () => {
    const ready = makeUnit("ready-1")
    const blocked = makeUnit("blocked-1", { dependencies: ["missing"] })
    const alsoReady = makeUnit("ready-2")

    const ctx = allPassContext()
    const result = partitionByReadiness([ready, blocked, alsoReady], ctx)

    expect(result.ready).toHaveLength(2)
    expect(result.blocked).toHaveLength(1)
    expect(result.blocked[0]!.unit.id).toBe("blocked-1")
  })

  it("returns all ready when all pass", () => {
    const units = [makeUnit("a"), makeUnit("b")]
    const ctx = allPassContext()
    const result = partitionByReadiness(units, ctx)
    expect(result.ready).toHaveLength(2)
    expect(result.blocked).toHaveLength(0)
  })

  it("returns all blocked when none pass", () => {
    const units = [
      makeUnit("a", { dependencies: ["x"] }),
      makeUnit("b", { dependencies: ["y"] }),
    ]
    const ctx = allPassContext()
    const result = partitionByReadiness(units, ctx)
    expect(result.ready).toHaveLength(0)
    expect(result.blocked).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// blockerToWaitQueue
// ---------------------------------------------------------------------------

describe("blockerToWaitQueue", () => {
  it("maps dependency to dependency_wait", () => {
    expect(blockerToWaitQueue("dependency")).toBe("dependency_wait")
  })

  it("maps permission to permission_wait", () => {
    expect(blockerToWaitQueue("permission")).toBe("permission_wait")
  })

  it("maps approval to approval_wait", () => {
    expect(blockerToWaitQueue("approval")).toBe("approval_wait")
  })

  it("maps lock to lock_wait", () => {
    expect(blockerToWaitQueue("lock")).toBe("lock_wait")
  })

  it("maps budget to budget_wait", () => {
    expect(blockerToWaitQueue("budget")).toBe("budget_wait")
  })

  it("maps runtime_state to dependency_wait", () => {
    expect(blockerToWaitQueue("runtime_state")).toBe("dependency_wait")
  })
})
