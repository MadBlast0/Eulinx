/**
 * P16-WF-MANAGER — Workflow Engine Tests
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { WorkflowEngine } from "./workflow-engine"
import type {
  SchedulerAdapter,
  ExecutionEngineAdapter,
  PersistenceAdapter,
  WorkflowEventEmitter,
} from "./workflow-engine"
import type {
  WorkflowRunId,
  NodeId,
  EdgeId,
  GraphSnapshot,
  NodeDefinition,
  EdgeDefinition,
  WorkflowNodeResult,
  AdmissionResponse,
  SnapshotId,
} from "./workflow-types"

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

function makeNode(id: string, kind: NodeDefinition["kind"] = "worker"): NodeDefinition {
  return {
    nodeId: id as NodeId,
    kind,
    label: id,
    config: {},
    inputPorts: [{ portId: "in", direction: "in", valueType: "json", cardinality: "single", required: false }],
    outputPorts: [{ portId: "out", direction: "out", valueType: "json", cardinality: "single", required: true }],
    retryPolicy: { maxAttempts: 1, backoff: "none", delayMs: 0, retryableErrors: [] },
    timeoutMs: 30_000,
    layout: { x: 0, y: 0 },
    createdBy: "user",
  }
}

function makeEdge(id: string, from: string, to: string): EdgeDefinition {
  return {
    edgeId: id as EdgeId,
    kind: "control",
    fromNodeId: from as NodeId,
    fromPortId: "out",
    toNodeId: to as NodeId,
    toPortId: "in",
    cardinality: "single",
    ordering: 0,
    required: true,
    activationPolicy: { mode: "all" },
    origin: { authorKind: "user", authorId: "test", trusted: true },
    validation: { valid: true, checkedAt: new Date().toISOString(), errors: [] },
  }
}

function makeSnapshot(nodes: NodeDefinition[], edges: EdgeDefinition[]): GraphSnapshot {
  return {
    snapshotId: "snap_test" as SnapshotId,
    workflowId: "wf_test",
    workflowVersion: 1,
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    contentHash: "hash_test",
  }
}

function makeSuccessResult(executionId: string): WorkflowNodeResult {
  return {
    ok: true,
    executionId,
    outputs: { result: "done" },
    metrics: { durationMs: 100, tokensUsed: 0, costUsd: 0, toolCalls: 0 },
  }
}

// ---------------------------------------------------------------------------
// Mock implementations
// ---------------------------------------------------------------------------

function createMockScheduler(): SchedulerAdapter {
  return {
    admit: vi.fn().mockResolvedValue({
      admitted: [],
      deferred: [],
      rejected: [],
    } as AdmissionResponse),
  }
}

function createMockExecutor(): ExecutionEngineAdapter {
  return {
    execute: vi.fn().mockResolvedValue(makeSuccessResult("exec_test")),
    status: vi.fn().mockResolvedValue("unknown" as const),
    cancel: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockPersistence(): PersistenceAdapter {
  const runs = new Map<string, any>()
  const nodeStates = new Map<string, any>()

  return {
    saveRun: vi.fn().mockImplementation(async (run) => {
      runs.set(run.runId, run)
      return { ok: true, value: undefined }
    }),
    loadRun: vi.fn().mockImplementation(async (runId) => {
      return { ok: true, value: runs.get(runId) ?? null }
    }),
    loadSnapshot: vi.fn().mockResolvedValue({ ok: true, value: null }),
    saveNodeState: vi.fn().mockImplementation(async (state) => {
      const key = `${state.runId}_${state.nodeId}_${state.iterationIndex}`
      nodeStates.set(key, state)
      return { ok: true, value: undefined }
    }),
    loadNodeStates: vi.fn().mockImplementation(async (runId) => {
      const states = [...nodeStates.values()].filter((s: any) => s.runId === runId)
      return { ok: true, value: states }
    }),
    saveRunContext: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    loadRunContext: vi.fn().mockResolvedValue({ ok: true, value: null }),
    appendTransition: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  }
}

function createMockEmitter(): WorkflowEventEmitter {
  return { emit: vi.fn() }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("WorkflowEngine", () => {
  let scheduler: SchedulerAdapter
  let executor: ExecutionEngineAdapter
  let persistence: PersistenceAdapter
  let emitter: WorkflowEventEmitter
  let engine: WorkflowEngine

  beforeEach(() => {
    scheduler = createMockScheduler()
    executor = createMockExecutor()
    persistence = createMockPersistence()
    emitter = createMockEmitter()
    engine = new WorkflowEngine(scheduler, executor, persistence, emitter)
  })

  describe("createRun", () => {
    it("creates a run from a valid graph", async () => {
      const snapshot = makeSnapshot(
        [makeNode("A"), makeNode("B")],
        [makeEdge("e1", "A", "B")],
      )

      const trigger = {
        triggerId: "trig_1",
        kind: "user_manual" as const,
        firedAt: new Date().toISOString(),
        firedBy: "test",
        payload: {},
      }

      const result = await engine.createRun(
        "wf_test",
        1,
        snapshot,
        trigger,
        "ws_test" as any,
        "proj_test",
        "sess_test",
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.value.state).toBe("running")
        expect(result.value.nodeCount).toBe(2)
      }
    })

    it("rejects graph with illegal cycle", async () => {
      const snapshot = makeSnapshot(
        [makeNode("A"), makeNode("B")],
        [makeEdge("e1", "A", "B"), makeEdge("e2", "B", "A")],
      )

      const trigger = {
        triggerId: "trig_1",
        kind: "user_manual" as const,
        firedAt: new Date().toISOString(),
        firedBy: "test",
        payload: {},
      }

      const result = await engine.createRun(
        "wf_test",
        1,
        snapshot,
        trigger,
        "ws_test" as any,
        "proj_test",
        "sess_test",
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("graph_invalid")
      }
    })
  })

  describe("computeReadySet", () => {
    it("returns empty for non-running run", () => {
      const run = {
        runId: "run1" as WorkflowRunId,
        state: "created" as const,
        runSeq: 0,
      } as any
      const mirror = engine.getMirror("run1" as WorkflowRunId) ?? {
        readySet: new Set(["A#0"]),
        runningSet: new Set(),
        topoOrder: ["A" as NodeId],
      }

      // The engine's computeReadySet checks run.state
      const result = engine.computeReadySet(mirror as any, run)
      expect(result).toEqual([])
    })
  })

  describe("tick", () => {
    it("returns ok for non-existent run", async () => {
      const result = await engine.tick("nonexistent" as WorkflowRunId)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error.kind).toBe("run_not_found")
      }
    })
  })

  describe("pauseRun", () => {
    it("returns error for non-existent run", async () => {
      const result = await engine.pauseRun("nonexistent" as WorkflowRunId)
      expect(result.ok).toBe(false)
    })
  })

  describe("resumeRun", () => {
    it("returns error for non-existent run", async () => {
      const result = await engine.resumeRun("nonexistent" as WorkflowRunId)
      expect(result.ok).toBe(false)
    })
  })

  describe("cancelRun", () => {
    it("returns error for non-existent run", async () => {
      const result = await engine.cancelRun("nonexistent" as WorkflowRunId)
      expect(result.ok).toBe(false)
    })
  })
})
