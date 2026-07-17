/**
 * P05-SCH-ALLOC — Budget Pool Tests
 *
 * Tests for budget reservation, consumption, and release.
 */

import { describe, it, expect } from "vitest"
import { BudgetPool, UNLIMITED_BUDGET_POOL } from "./budgets"
import type { BudgetEstimate } from "./scheduler-types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEstimate(overrides: Partial<BudgetEstimate> = {}): BudgetEstimate {
  return {
    confidence: "medium",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// BudgetPool
// ---------------------------------------------------------------------------

describe("BudgetPool", () => {
  it("allows reservation within limits", () => {
    const pool = new BudgetPool({
      maxCostMicroUsd: 1000,
      maxWorkers: 5,
      maxToolInvocations: 10,
      maxFileWrites: 20,
      maxTokens: 100_000,
      maxRuntimeMs: 60_000,
    })

    const estimate = makeEstimate({
      estimatedCostMicroUsd: 500,
      estimatedWorkers: 2,
    })
    expect(pool.canReserve(estimate)).toBe(true)
  })

  it("rejects reservation exceeding cost limit", () => {
    const pool = new BudgetPool({
      maxCostMicroUsd: 1000,
      maxWorkers: 5,
      maxToolInvocations: 10,
      maxFileWrites: 20,
      maxTokens: 100_000,
      maxRuntimeMs: 60_000,
    })

    const estimate = makeEstimate({ estimatedCostMicroUsd: 1500 })
    expect(pool.canReserve(estimate)).toBe(false)
  })

  it("rejects reservation exceeding worker limit", () => {
    const pool = new BudgetPool({
      maxCostMicroUsd: 1000,
      maxWorkers: 2,
      maxToolInvocations: 10,
      maxFileWrites: 20,
      maxTokens: 100_000,
      maxRuntimeMs: 60_000,
    })

    const estimate = makeEstimate({ estimatedWorkers: 3 })
    expect(pool.canReserve(estimate)).toBe(false)
  })

  it("reserves and tracks consumption", () => {
    const pool = new BudgetPool({
      maxCostMicroUsd: 1000,
      maxWorkers: 5,
      maxToolInvocations: 10,
      maxFileWrites: 20,
      maxTokens: 100_000,
      maxRuntimeMs: 60_000,
    })

    const estimate = makeEstimate({
      estimatedCostMicroUsd: 300,
      estimatedWorkers: 1,
    })
    const reservation = pool.reserve("u1", estimate)
    expect(reservation).toBeDefined()
    expect(reservation!.unitId).toBe("u1")

    const consumption = pool.getConsumption()
    expect(consumption.costMicroUsd).toBe(300)
    expect(consumption.workers).toBe(1)
  })

  it("releases reservation", () => {
    const pool = new BudgetPool({
      maxCostMicroUsd: 1000,
      maxWorkers: 5,
      maxToolInvocations: 10,
      maxFileWrites: 20,
      maxTokens: 100_000,
      maxRuntimeMs: 60_000,
    })

    pool.reserve("u1", makeEstimate({ estimatedCostMicroUsd: 300 }))
    pool.release("u1")

    const consumption = pool.getConsumption()
    expect(consumption.costMicroUsd).toBe(0)
  })

  it("returns undefined when releasing unknown unit", () => {
    const pool = new BudgetPool(UNLIMITED_BUDGET_POOL)
    expect(pool.release("unknown")).toBeUndefined()
  })

  it("returns undefined when reserve fails", () => {
    const pool = new BudgetPool({
      maxCostMicroUsd: 100,
      maxWorkers: 1,
      maxToolInvocations: 10,
      maxFileWrites: 20,
      maxTokens: 100_000,
      maxRuntimeMs: 60_000,
    })

    pool.reserve("u1", makeEstimate({ estimatedCostMicroUsd: 100 }))
    const reservation = pool.reserve("u2", makeEstimate({ estimatedCostMicroUsd: 100 }))
    expect(reservation).toBeUndefined()
  })

  it("tracks active reservations", () => {
    const pool = new BudgetPool(UNLIMITED_BUDGET_POOL)
    pool.reserve("u1", makeEstimate())
    pool.reserve("u2", makeEstimate())
    expect(pool.activeReservations).toBe(2)

    pool.release("u1")
    expect(pool.activeReservations).toBe(1)
  })

  it("reset clears everything", () => {
    const pool = new BudgetPool(UNLIMITED_BUDGET_POOL)
    pool.reserve("u1", makeEstimate({ estimatedCostMicroUsd: 100 }))
    pool.reset()
    expect(pool.activeReservations).toBe(0)
    expect(pool.getConsumption().costMicroUsd).toBe(0)
  })

  it("unlimited pool always allows reservation", () => {
    const pool = new BudgetPool(UNLIMITED_BUDGET_POOL)
    expect(
      pool.canReserve(
        makeEstimate({
          estimatedCostMicroUsd: 999_999_999,
          estimatedWorkers: 999,
        }),
      ),
    ).toBe(true)
  })
})
