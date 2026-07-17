/**
 * P06-SPAWN-POLICIES — Admission Control Tests
 */

import { describe, it, expect } from "vitest"
import { evaluateAdmission, isRetryablePressure } from "./spawner-admission"
import type { AdmissionState } from "./spawner-admission"

const FULL_STATE: AdmissionState = {
  liveWorkersInWorkspace: 0,
  liveWorkersInSession: 0,
  liveWorkersGlobal: 0,
  freeTerminalSlots: 4,
  providerRateLimited: false,
  workspaceBudgetRemaining: 100,
  sessionBudgetRemaining: 100,
  parentBudgetRemaining: 100,
  freeDiskBytes: 10_000_000_000,
  minimumDiskBytes: 100_000_000,
  runtimeHealth: "healthy",
  schedulerQueueDepth: 0,
  maxSchedulerQueueDepth: 100,
  maxLiveWorkersPerWorkspace: 32,
  maxLiveWorkersPerSession: 16,
  maxLiveWorkersGlobal: 64,
}

describe("Admission Control", () => {
  it("admits when all conditions are met", () => {
    const decision = evaluateAdmission(FULL_STATE, "normal")
    expect(decision.verdict).toBe("admit")
  })

  it("defers when workspace worker limit reached", () => {
    const state = { ...FULL_STATE, liveWorkersInWorkspace: 32 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("workspace_worker_limit")
  })

  it("defers when session worker limit reached", () => {
    const state = { ...FULL_STATE, liveWorkersInSession: 16 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("session_worker_limit")
  })

  it("defers when global worker limit reached", () => {
    const state = { ...FULL_STATE, liveWorkersGlobal: 64 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("global_worker_limit")
  })

  it("defers when terminal slots exhausted", () => {
    const state = { ...FULL_STATE, freeTerminalSlots: 0 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("terminal_slots_exhausted")
  })

  it("defers when provider rate limited", () => {
    const state = { ...FULL_STATE, providerRateLimited: true, providerRetryAfterMs: 5000 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("provider_rate_limited")
    expect(decision.retryAfterMs).toBe(5000)
  })

  it("rejects when workspace budget exhausted", () => {
    const state = { ...FULL_STATE, workspaceBudgetRemaining: 0 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("reject")
    expect(decision.reason).toBe("workspace_budget_exhausted")
  })

  it("rejects when session budget exhausted", () => {
    const state = { ...FULL_STATE, sessionBudgetRemaining: 0 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("reject")
    expect(decision.reason).toBe("session_budget_exhausted")
  })

  it("rejects when parent budget exhausted", () => {
    const state = { ...FULL_STATE, parentBudgetRemaining: 0 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("reject")
    expect(decision.reason).toBe("parent_budget_exhausted")
  })

  it("defers when disk pressure", () => {
    const state = { ...FULL_STATE, freeDiskBytes: 50_000_000, minimumDiskBytes: 100_000_000 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("disk_pressure")
  })

  it("defers when runtime degraded", () => {
    const state = { ...FULL_STATE, runtimeHealth: "degraded" as const }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("runtime_degraded")
  })

  it("defers when queue depth exceeded for normal priority", () => {
    const state = { ...FULL_STATE, schedulerQueueDepth: 100 }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.verdict).toBe("defer")
    expect(decision.reason).toBe("queue_depth_exceeded")
  })

  it("critical bypasses queue_depth_exceeded", () => {
    const state = { ...FULL_STATE, schedulerQueueDepth: 100 }
    const decision = evaluateAdmission(state, "critical")
    expect(decision.verdict).toBe("admit")
  })

  it("critical does NOT bypass budget", () => {
    const state = { ...FULL_STATE, workspaceBudgetRemaining: 0 }
    const decision = evaluateAdmission(state, "critical")
    expect(decision.verdict).toBe("reject")
  })

  it("checks workspace limit before session limit", () => {
    const state = {
      ...FULL_STATE,
      liveWorkersInWorkspace: 32,
      liveWorkersInSession: 0,
    }
    const decision = evaluateAdmission(state, "normal")
    expect(decision.reason).toBe("workspace_worker_limit")
  })
})

describe("isRetryablePressure", () => {
  it("capacity pressures are retryable", () => {
    expect(isRetryablePressure("workspace_worker_limit")).toBe(true)
    expect(isRetryablePressure("session_worker_limit")).toBe(true)
    expect(isRetryablePressure("global_worker_limit")).toBe(true)
    expect(isRetryablePressure("terminal_slots_exhausted")).toBe(true)
    expect(isRetryablePressure("runtime_degraded")).toBe(true)
    expect(isRetryablePressure("disk_pressure")).toBe(true)
  })

  it("budget pressures are not retryable", () => {
    expect(isRetryablePressure("workspace_budget_exhausted")).toBe(false)
    expect(isRetryablePressure("session_budget_exhausted")).toBe(false)
    expect(isRetryablePressure("parent_budget_exhausted")).toBe(false)
  })
})
