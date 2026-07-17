/**
 * P05-SCHEDULER — Scheduler Types Tests
 *
 * Tests for SchedulingState transitions, PRIORITY_NUMERIC, and DEFAULT_RETRY_POLICY.
 */

import { describe, it, expect } from "vitest"
import type { SchedulingState } from "./scheduler-types"
import {
  PRIORITY_NUMERIC,
  DEFAULT_RETRY_POLICY,
} from "./scheduler-types"

// ---------------------------------------------------------------------------
// SchedulingState transitions (from Scheduler-Diagrams.md state diagram)
// ---------------------------------------------------------------------------

const SCHED_TRANSITIONS: Map<SchedulingState, readonly SchedulingState[]> = new Map([
  ["created", ["queued", "cancelled", "skipped"]],
  ["queued", [
    "waiting_for_dependencies",
    "waiting_for_permission",
    "waiting_for_lock",
    "waiting_for_budget",
    "waiting_for_approval",
    "ready",
    "cancelled",
    "skipped",
  ]],
  ["waiting_for_dependencies", ["queued", "cancelled", "skipped"]],
  ["waiting_for_permission", ["queued", "cancelled", "skipped"]],
  ["waiting_for_lock", ["queued", "cancelled", "skipped"]],
  ["waiting_for_budget", ["queued", "cancelled", "skipped"]],
  ["waiting_for_approval", ["queued", "cancelled", "skipped"]],
  ["ready", ["scheduled", "cancelled"]],
  ["scheduled", ["running", "cancelled"]],
  ["running", ["completed", "failed", "cancelled"]],
  ["completed", []],
  ["failed", []],
  ["cancelled", []],
  ["skipped", []],
])

function canScheduleTransition(from: SchedulingState, to: SchedulingState): boolean {
  const allowed = SCHED_TRANSITIONS.get(from)
  return allowed !== undefined && (allowed as readonly SchedulingState[]).includes(to)
}

describe("SchedulingState transitions", () => {
  it("created can transition to queued", () => {
    expect(canScheduleTransition("created", "queued")).toBe(true)
  })

  it("created can transition to cancelled", () => {
    expect(canScheduleTransition("created", "cancelled")).toBe(true)
  })

  it("created can transition to skipped", () => {
    expect(canScheduleTransition("created", "skipped")).toBe(true)
  })

  it("queued can transition to waiting_for_dependencies", () => {
    expect(canScheduleTransition("queued", "waiting_for_dependencies")).toBe(true)
  })

  it("queued can transition to waiting_for_permission", () => {
    expect(canScheduleTransition("queued", "waiting_for_permission")).toBe(true)
  })

  it("queued can transition to waiting_for_lock", () => {
    expect(canScheduleTransition("queued", "waiting_for_lock")).toBe(true)
  })

  it("queued can transition to waiting_for_budget", () => {
    expect(canScheduleTransition("queued", "waiting_for_budget")).toBe(true)
  })

  it("queued can transition to waiting_for_approval", () => {
    expect(canScheduleTransition("queued", "waiting_for_approval")).toBe(true)
  })

  it("queued can transition to ready", () => {
    expect(canScheduleTransition("queued", "ready")).toBe(true)
  })

  it("waiting_for_dependencies can go back to queued", () => {
    expect(canScheduleTransition("waiting_for_dependencies", "queued")).toBe(true)
  })

  it("waiting_for_permission can go back to queued", () => {
    expect(canScheduleTransition("waiting_for_permission", "queued")).toBe(true)
  })

  it("waiting_for_lock can go back to queued", () => {
    expect(canScheduleTransition("waiting_for_lock", "queued")).toBe(true)
  })

  it("waiting_for_budget can go back to queued", () => {
    expect(canScheduleTransition("waiting_for_budget", "queued")).toBe(true)
  })

  it("waiting_for_approval can go back to queued", () => {
    expect(canScheduleTransition("waiting_for_approval", "queued")).toBe(true)
  })

  it("ready transitions to scheduled", () => {
    expect(canScheduleTransition("ready", "scheduled")).toBe(true)
  })

  it("scheduled transitions to running", () => {
    expect(canScheduleTransition("scheduled", "running")).toBe(true)
  })

  it("running transitions to completed", () => {
    expect(canScheduleTransition("running", "completed")).toBe(true)
  })

  it("running transitions to failed", () => {
    expect(canScheduleTransition("running", "failed")).toBe(true)
  })

  it("running transitions to cancelled", () => {
    expect(canScheduleTransition("running", "cancelled")).toBe(true)
  })

  it("completed is terminal", () => {
    expect(canScheduleTransition("completed", "queued")).toBe(false)
    expect(canScheduleTransition("completed", "running")).toBe(false)
  })

  it("failed is terminal", () => {
    expect(canScheduleTransition("failed", "queued")).toBe(false)
    expect(canScheduleTransition("failed", "running")).toBe(false)
  })

  it("cancelled is terminal", () => {
    expect(canScheduleTransition("cancelled", "queued")).toBe(false)
  })

  it("skipped is terminal", () => {
    expect(canScheduleTransition("skipped", "queued")).toBe(false)
  })

  it("created cannot skip to ready", () => {
    expect(canScheduleTransition("created", "ready")).toBe(false)
  })

  it("created cannot go to running", () => {
    expect(canScheduleTransition("created", "running")).toBe(false)
  })

  it("waiting states cannot go to running directly", () => {
    expect(canScheduleTransition("waiting_for_dependencies", "running")).toBe(false)
    expect(canScheduleTransition("waiting_for_permission", "running")).toBe(false)
    expect(canScheduleTransition("waiting_for_lock", "running")).toBe(false)
    expect(canScheduleTransition("waiting_for_budget", "running")).toBe(false)
    expect(canScheduleTransition("waiting_for_approval", "running")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Priority Numeric Ordering
// ---------------------------------------------------------------------------

describe("PRIORITY_NUMERIC", () => {
  it("critical has lowest numeric value (highest priority)", () => {
    expect(PRIORITY_NUMERIC.critical).toBe(0)
  })

  it("high < normal", () => {
    expect(PRIORITY_NUMERIC.high).toBeLessThan(PRIORITY_NUMERIC.normal)
  })

  it("normal < low", () => {
    expect(PRIORITY_NUMERIC.normal).toBeLessThan(PRIORITY_NUMERIC.low)
  })

  it("low < background", () => {
    expect(PRIORITY_NUMERIC.low).toBeLessThan(PRIORITY_NUMERIC.background)
  })

  it("covers all 5 priority levels", () => {
    expect(Object.keys(PRIORITY_NUMERIC)).toHaveLength(5)
  })
})

// ---------------------------------------------------------------------------
// Default Retry Policy
// ---------------------------------------------------------------------------

describe("DEFAULT_RETRY_POLICY", () => {
  it("allows 3 attempts", () => {
    expect(DEFAULT_RETRY_POLICY.maxAttempts).toBe(3)
  })

  it("uses exponential backoff", () => {
    expect(DEFAULT_RETRY_POLICY.backoff).toBe("exponential")
  })

  it("has a delay", () => {
    expect(DEFAULT_RETRY_POLICY.delayMs).toBeGreaterThan(0)
  })

  it("retries on lock_conflict", () => {
    expect(DEFAULT_RETRY_POLICY.retryOn).toContain("lock_conflict")
  })

  it("requires revalidation", () => {
    expect(DEFAULT_RETRY_POLICY.requireRevalidation).toBe(true)
  })
})
