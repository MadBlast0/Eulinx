/**
 * P06-SPAWN-CLEANUP — Worker Cleanup Tests
 */

import { describe, it, expect } from "vitest"
import {
  buildCleanupPlan,
  executeRollback,
  createQuarantineState,
  createFailureRecord,
  CREATION_ROLLBACK_POINTS,
} from "./worker-cleanup"

describe("buildCleanupPlan", () => {
  it("returns empty plan for idle state", () => {
    const plan = buildCleanupPlan("idle")
    expect(plan).toHaveLength(0)
  })

  it("returns empty plan for working state", () => {
    const plan = buildCleanupPlan("working")
    expect(plan).toHaveLength(0)
  })

  it("returns cleanup plan for failing state", () => {
    const plan = buildCleanupPlan("failing")
    expect(plan.length).toBeGreaterThan(0)
    expect(plan.some(a => a.kind === "release_locks")).toBe(true)
    expect(plan.some(a => a.kind === "flush_artifacts")).toBe(true)
    expect(plan.some(a => a.kind === "terminate_process")).toBe(true)
  })

  it("returns cleanup plan for terminating state", () => {
    const plan = buildCleanupPlan("terminating")
    expect(plan.length).toBeGreaterThan(0)
    expect(plan.some(a => a.kind === "release_locks")).toBe(true)
    expect(plan.some(a => a.kind === "cleanup_sandbox")).toBe(true)
  })

  it("all actions are idempotent", () => {
    for (const state of ["failing", "terminating"] as const) {
      const plan = buildCleanupPlan(state)
      for (const action of plan) {
        expect(action.idempotent).toBe(true)
      }
    }
  })

  it("includes required flag on each action", () => {
    const plan = buildCleanupPlan("failing")
    for (const action of plan) {
      expect(typeof action.required).toBe("boolean")
    }
  })
})

describe("CREATION_ROLLBACK_POINTS", () => {
  it("has 7 rollback points", () => {
    expect(CREATION_ROLLBACK_POINTS.length).toBe(7)
  })

  it("steps are sequential", () => {
    for (let i = 0; i < CREATION_ROLLBACK_POINTS.length; i++) {
      expect(CREATION_ROLLBACK_POINTS[i]?.step).toBe(i + 1)
    }
  })
})

describe("executeRollback", () => {
  it("rolls back completed steps in reverse order", async () => {
    const executedSteps: number[] = []
    const result = await executeRollback([1, 2, 3], async (step) => {
      executedSteps.push(step.step)
      return true
    })
    expect(result.completedSteps).toEqual([3, 2, 1])
    expect(executedSteps).toEqual([3, 2, 1])
  })

  it("returns error on rollback failure", async () => {
    const result = await executeRollback([1, 2, 3], async (step) => {
      if (step.step === 2) return false
      return true
    })
    expect(result.completedSteps).toEqual([3])
    expect(result.failedStep).toBe(2)
    expect(result.error).toBeDefined()
  })

  it("handles empty completed steps", async () => {
    const result = await executeRollback([], async () => true)
    expect(result.completedSteps).toHaveLength(0)
    expect(result.error).toBeUndefined()
  })
})

describe("createQuarantineState", () => {
  it("creates quarantine state with all restrictions", () => {
    const state = createQuarantineState("wkr_001", "suspicious activity")
    expect(state.workerId).toBe("wkr_001")
    expect(state.reason).toBe("suspicious activity")
    expect(state.canReceiveInput).toBe(false)
    expect(state.canInvokeTools).toBe(false)
    expect(state.canWriteArtifacts).toBe(false)
    expect(state.canSpawnChildren).toBe(false)
    expect(state.mustBeReviewed).toBe(true)
  })
})

describe("createFailureRecord", () => {
  it("creates failure record with all fields", () => {
    const record = createFailureRecord({
      workerId: "wkr_001",
      cause: "process_crashed",
      detail: "Exit code 137",
      stateAtFailure: "working",
      transitionSeqAtFailure: 5,
      processExitCode: 137,
      processSignal: "SIGKILL",
      lastOutputTail: "some output here",
      detectedBy: { kind: "runtime_service", id: "LifecycleWatchdog" },
    })
    expect(record.workerId).toBe("wkr_001")
    expect(record.cause).toBe("process_crashed")
    expect(record.processExitCode).toBe(137)
    expect(record.processSignal).toBe("SIGKILL")
    expect(record.stateAtFailure).toBe("working")
    expect(record.transitionSeqAtFailure).toBe(5)
  })

  it("truncates lastOutputTail to 8192 bytes", () => {
    const longOutput = "x".repeat(10_000)
    const record = createFailureRecord({
      workerId: "wkr_001",
      cause: "unknown",
      detail: "test",
      stateAtFailure: "working",
      transitionSeqAtFailure: 0,
      lastOutputTail: longOutput,
      detectedBy: { kind: "runtime_service", id: "test" },
    })
    expect(record.lastOutputTail?.length).toBeLessThanOrEqual(8192)
  })
})
