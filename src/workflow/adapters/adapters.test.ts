/**
 * P16-WF-ADAPTER — Adapter wiring tests
 */

import { describe, it, expect, vi } from "vitest"
import { SchedulerAdapter } from "./scheduler-adapter"
import { ExecutionEngineAdapter } from "./execution-engine-adapter"
import { PersistenceAdapter } from "./persistence-adapter"
import type { Scheduler } from "@/scheduler/scheduler"
import type { ExecutionEngine } from "@/runtime/services/execution-engine"
import type { AdmissionRequest } from "../workflow-types"
import type { WorkflowRun, NodeRuntimeState, NodeState } from "../workflow-types"
import { RunContext } from "../run-context"

function makeFakeScheduler(): Scheduler {
  const enqueue = vi.fn().mockReturnValue({ ok: true, error: undefined })
  return { enqueue } as unknown as Scheduler
}

function makeAdmissionRequest(): AdmissionRequest {
  return {
    runId: "run_1" as never,
    workspaceId: "ws_1" as never,
    projectId: "p_1",
    candidates: [
      {
        nodeId: "a" as never,
        iterationIndex: 0,
        kind: "worker",
        topoRank: 0,
        estimatedCost: {
          expectedDurationMs: 0,
          expectedTokens: 0,
          expectedCostUsd: 0,
          spawnsWorker: false,
          spawnsProcess: false,
        },
        requiredResources: [],
      },
    ],
    runPriority: "normal",
  }
}

describe("SchedulerAdapter", () => {
  it("admits candidates to the real scheduler", async () => {
    const fake = makeFakeScheduler()
    const enqueue = vi.spyOn(fake, "enqueue")
    const adapter = new SchedulerAdapter(fake)
    const response = await adapter.admit(makeAdmissionRequest())

    expect(enqueue).toHaveBeenCalledOnce()
    expect(response.admitted).toEqual(["a#0"])
    expect(response.rejected).toHaveLength(0)
  })

  it("rejects candidates the scheduler refuses", async () => {
    const fake = makeFakeScheduler()
    vi.spyOn(fake, "enqueue").mockReturnValue({
      ok: false,
      error: { kind: "validation_error", message: "already enqueued" },
    } as never)
    const adapter = new SchedulerAdapter(fake)
    const response = await adapter.admit(makeAdmissionRequest())
    expect(response.admitted).toHaveLength(0)
    expect(response.rejected).toHaveLength(1)
    expect(response.rejected[0]?.reason).toBe("resource_unavailable_permanently")
  })
})

describe("ExecutionEngineAdapter", () => {
  it("executes a task and reports completion", async () => {
    const fake: ExecutionEngine = {
      execute: vi.fn().mockReturnValue({ executionId: "exec_x" } as never),
      getStatus: vi.fn().mockImplementation((id) =>
        id === "exec_x" ? ({ state: "completed" } as never) : undefined,
      ),
      cancel: vi.fn(),
    } as unknown as ExecutionEngine

    const adapter = new ExecutionEngineAdapter(fake)
    const result = await adapter.execute({
      executionId: "exec_x",
      runId: "run_1" as never,
      nodeId: "a" as never,
      iterationIndex: 0,
      attempt: 1,
      kind: "worker",
      config: {},
      inputs: {},
      workspaceId: "ws_1" as never,
      projectId: "p_1",
      sessionId: "s_1",
      ownerRef: { kind: "workflow_node", runId: "run_1", nodeId: "a" },
      timeoutMs: 1000,
      deterministicSeed: "seed",
      mode: "normal",
    } as never)

    expect(fake.execute).toHaveBeenCalledOnce()
    expect(result.ok).toBe(true)
  })
})

describe("PersistenceAdapter", () => {
  it("round-trips a run and node states", async () => {
    const adapter = new PersistenceAdapter({ storageKey: "test_wf_state" })
    const run: WorkflowRun = {
      runId: "run_1" as never,
      workflowId: "wf_1",
      workflowVersion: 1,
      workspaceId: "ws_1" as never,
      projectId: "p_1",
      sessionId: "s_1",
      state: "running",
      runSeq: 1,
      trigger: { triggerId: "t", kind: "user_manual", firedAt: "", firedBy: "" } as never,
      mode: "normal",
      graphSnapshotId: "snap_1" as never,
      contextId: "ctx_1",
      startedAt: "",
      nodeCount: 1,
      completedNodeCount: 0,
      failedNodeCount: 0,
      skippedNodeCount: 0,
      restartGeneration: 0,
      determinismSeed: "seed" as never,
    }
    const save = await adapter.saveRun(run)
    expect(save.ok).toBe(true)

    const load = await adapter.loadRun("run_1" as never)
    expect(load.ok).toBe(true)
    if (load.ok) expect(load.value?.state).toBe("running")

    const nodeState: NodeRuntimeState = {
      runId: "run_1" as never,
      nodeId: "a" as never,
      iterationIndex: 0,
      state: "running" as NodeState,
      remainingDeps: 0,
      attempt: 1,
    }
    await adapter.saveNodeState(nodeState)
    const states = await adapter.loadNodeStates("run_1" as never)
    expect(states.ok).toBe(true)
    if (states.ok) expect(states.value).toHaveLength(1)
  })

  it("round-trips a run context", async () => {
    const adapter = new PersistenceAdapter({ storageKey: "test_wf_state_ctx" })
    const ctx = new RunContext("run_2" as never, 1)
    ctx.writeOutput("a" as never, "out", 0, { hello: "world" } as never, "e" as never, 20)
    const save = await adapter.saveRunContext(ctx)
    expect(save.ok).toBe(true)

    const load = await adapter.loadRunContext("run_2" as never)
    expect(load.ok).toBe(true)
    if (load.ok && load.value) {
      const v = load.value.readOutput("a" as never, "out", 0)
      expect(v?.value).toEqual({ hello: "world" })
    } else {
      throw new Error("context not restored")
    }
  })
})
