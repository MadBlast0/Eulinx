/* eslint-disable no-non-null-assertion */
/**
 * P04-STATE-WORKFLOW — Workflow State Tests
 */

import { describe, it, expect } from "vitest"
import type { RunId, WorkspaceId, GraphNodeId } from "@/core/types"
import {
  canWorkflowRunTransition,
  WORKFLOW_RUN_TERMINAL,
  createPersistedWorkflowRun,
  transitionWorkflowRun,
  completeNodeStep,
  failNodeStep,
  skipNodeStep,
  validateWorkflowRun,
} from "./workflow-state"
import type { PersistedWorkflowRun, PersistedNodeStep, WorkflowRunState } from "./workflow-state"

function rid(id: string): RunId { return id as unknown as RunId }
function ws(id: string): WorkspaceId { return id as unknown as WorkspaceId }
function gnid(id: string): GraphNodeId { return id as unknown as GraphNodeId }

function makeRun(overrides?: Partial<PersistedWorkflowRun>): PersistedWorkflowRun {
  const base = createPersistedWorkflowRun(
    rid("run_1"), "wf_1", 1, ws("ws_1"), "proj_1", "sess_1",
    { kind: "user", actorId: "u_1", reason: "test", at: "2025-01-01T00:00:00.000Z" as import("@/core/types").IsoTimestamp },
    "snap_1", "ctx_1", 10, "1.0.0",
  )
  return { ...base, ...overrides }
}

function makeStep(overrides?: Partial<PersistedNodeStep>): PersistedNodeStep {
  return {
    id: "run_1:node_1",
    runId: rid("run_1"),
    nodeId: gnid("node_1"),
    iterationIndex: 0,
    state: "running",
    attempt: 1,
    maxAttempts: 3,
    inputs: [],
    outputs: [],
    workspaceId: ws("ws_1"),
    lastPersistedAt: "2025-01-01T00:00:00.000Z" as import("@/core/types").IsoTimestamp,
    metadata: {
      createdAt: "2025-01-01T00:00:00.000Z" as import("@/core/types").IsoTimestamp,
      updatedAt: "2025-01-01T00:00:00.000Z" as import("@/core/types").IsoTimestamp,
      version: 1,
      checksum: "",
    },
    ...overrides,
  }
}

describe("canWorkflowRunTransition", () => {
  it("allows created -> validating", () => {
    expect(canWorkflowRunTransition("created", "validating")).toBe(true)
  })
  it("allows validating -> running", () => {
    expect(canWorkflowRunTransition("validating", "running")).toBe(true)
  })
  it("allows running -> pausing", () => {
    expect(canWorkflowRunTransition("running", "pausing")).toBe(true)
  })
  it("allows running -> succeeded", () => {
    expect(canWorkflowRunTransition("running", "succeeded")).toBe(true)
  })
  it("allows pausing -> paused", () => {
    expect(canWorkflowRunTransition("pausing", "paused")).toBe(true)
  })
  it("allows paused -> running", () => {
    expect(canWorkflowRunTransition("paused", "running")).toBe(true)
  })
  it("rejects created -> running", () => {
    expect(canWorkflowRunTransition("created", "running")).toBe(false)
  })
  it("rejects succeeded -> running", () => {
    expect(canWorkflowRunTransition("succeeded", "running")).toBe(false)
  })
})

describe("WORKFLOW_RUN_TERMINAL", () => {
  it("contains terminal states", () => {
    expect(WORKFLOW_RUN_TERMINAL).toContain("succeeded")
    expect(WORKFLOW_RUN_TERMINAL).toContain("failed")
    expect(WORKFLOW_RUN_TERMINAL).toContain("cancelled")
  })
})

describe("createPersistedWorkflowRun", () => {
  it("creates initial run", () => {
    const run = makeRun()
    expect(run.runId).toBe("run_1")
    expect(run.id).toBe("run_1")
    expect(run.state).toBe("created")
    expect(run.seq).toBe(1)
    expect(run.currentTick).toBe(0)
    expect(run.nodeCount).toBe(10)
    expect(run.determinismSeed).toBeTruthy()
  })
})

describe("transitionWorkflowRun", () => {
  it("transitions and bumps seq + tick", () => {
    const run = makeRun()
    const next = transitionWorkflowRun(run, "validating", "Start validation")
    expect(next.state).toBe("validating")
    expect(next.seq).toBe(2)
    expect(next.currentTick).toBe(1)
  })
  it("sets endedAt on terminal states", () => {
    let run = makeRun()
    run = transitionWorkflowRun(run, "validating", "1")
    run = transitionWorkflowRun(run, "running", "2")
    run = transitionWorkflowRun(run, "succeeded", "3")
    expect(run.endedAt).toBeTruthy()
  })
  it("sets pausedAt on paused", () => {
    let run = makeRun()
    run = transitionWorkflowRun(run, "validating", "1")
    run = transitionWorkflowRun(run, "running", "2")
    run = transitionWorkflowRun(run, "pausing", "3")
    run = transitionWorkflowRun(run, "paused", "4")
    expect(run.pausedAt).toBeTruthy()
  })
  it("throws on invalid transition", () => {
    const run = makeRun()
    expect(() => transitionWorkflowRun(run, "running", "Bad")).toThrow("Invalid workflow run transition")
  })
})

describe("completeNodeStep", () => {
  it("marks step succeeded and bumps counters", () => {
    const run = makeRun()
    const step = makeStep()
    const { run: updatedRun, step: updatedStep } = completeNodeStep(run, step)
    expect(updatedStep.state).toBe("succeeded")
    expect(updatedStep.completedAt).toBeTruthy()
    expect(updatedRun.completedNodeCount).toBe(1)
    expect(updatedRun.seq).toBe(2)
  })
})

describe("failNodeStep", () => {
  it("marks step failed and bumps counters", () => {
    const run = makeRun()
    const step = makeStep()
    const { run: updatedRun, step: updatedStep } = failNodeStep(run, step, { code: "err", message: "boom" })
    expect(updatedStep.state).toBe("failed")
    expect(updatedStep.error?.message).toBe("boom")
    expect(updatedRun.failedNodeCount).toBe(1)
  })
})

describe("skipNodeStep", () => {
  it("marks step skipped and bumps counters", () => {
    const run = makeRun()
    const step = makeStep()
    const { run: updatedRun, step: updatedStep } = skipNodeStep(run, step)
    expect(updatedStep.state).toBe("skipped")
    expect(updatedRun.skippedNodeCount).toBe(1)
  })
})

describe("validateWorkflowRun", () => {
  it("returns no errors for valid run", () => {
    const run = makeRun()
    expect(validateWorkflowRun(run)).toEqual([])
  })
  it("catches node count overflow", () => {
    const run = makeRun({ nodeCount: 2 })
    const modified = { ...run, completedNodeCount: 3 }
    const errors = validateWorkflowRun(modified)
    expect(errors).toContain("Sum of completed/failed/skipped exceeds node count")
  })
  it("requires endedAt for terminal runs", () => {
    const run = makeRun({ state: "succeeded" as WorkflowRunState, endedAt: undefined })
    const errors = validateWorkflowRun(run)
    expect(errors).toContain("Terminal run must have endedAt")
  })
  it("rejects endedAt on running runs", () => {
    const run = makeRun({ state: "running" as WorkflowRunState, endedAt: "2025-01-01T00:00:00.000Z" as import("@/core/types").IsoTimestamp })
    const errors = validateWorkflowRun(run)
    expect(errors).toContain("Running run must not have endedAt")
  })
})
