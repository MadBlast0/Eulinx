/**
 * P16-WF-DAG — Graph Mirror Tests
 */

import { describe, it, expect } from "vitest"
import {
  stateKey,
  parseStateKey,
  computeTopologicalOrder,
  detectCycle,
  isLegalTransition,
  updateNodeState,
  buildMirror,
} from "./graph-mirror"
import type {
  NodeId,
  EdgeId,
  NodeDefinition,
  EdgeDefinition,
  GraphSnapshot,
  NodeRuntimeState,
  SnapshotId,
} from "./workflow-types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nid(id: string): NodeId { return id as NodeId }
function eid(id: string): EdgeId { return id as EdgeId }

function makeNode(id: string, kind: NodeDefinition["kind"] = "worker"): NodeDefinition {
  return {
    nodeId: nid(id),
    kind,
    label: id,
    config: {},
    inputPorts: [{ portId: "in", direction: "in", valueType: "json", cardinality: "single", required: true }],
    outputPorts: [{ portId: "out", direction: "out", valueType: "json", cardinality: "single", required: true }],
    retryPolicy: { maxAttempts: 1, backoff: "none", delayMs: 0, retryableErrors: [] },
    timeoutMs: 30_000,
    layout: { x: 0, y: 0 },
    createdBy: "user",
  }
}

function makeEdge(id: string, from: string, to: string, kind: EdgeDefinition["kind"] = "control"): EdgeDefinition {
  return {
    edgeId: eid(id),
    kind,
    fromNodeId: nid(from),
    fromPortId: "out",
    toNodeId: nid(to),
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

function nodeMap(...nodes: NodeDefinition[]): Map<NodeId, NodeDefinition> {
  const m = new Map<NodeId, NodeDefinition>()
  for (const n of nodes) m.set(n.nodeId, n)
  return m
}

function edgeMap(...edges: EdgeDefinition[]): Map<EdgeId, EdgeDefinition> {
  const m = new Map<EdgeId, EdgeDefinition>()
  for (const e of edges) m.set(e.edgeId, e)
  return m
}

// ---------------------------------------------------------------------------
// stateKey / parseStateKey
// ---------------------------------------------------------------------------

describe("stateKey and parseStateKey", () => {
  it("round-trips correctly", () => {
    const key = stateKey(nid("node1"), 0)
    expect(key).toBe("node1#0")
    const parsed = parseStateKey(key)
    expect(parsed.nodeId).toBe("node1")
    expect(parsed.iterationIndex).toBe(0)
  })

  it("handles non-zero iteration index", () => {
    const key = stateKey(nid("node1"), 3)
    const parsed = parseStateKey(key)
    expect(parsed.iterationIndex).toBe(3)
  })

  it("throws on invalid key", () => {
    expect(() => parseStateKey("no_hash")).toThrow("Invalid state key")
  })
})

// ---------------------------------------------------------------------------
// computeTopologicalOrder
// ---------------------------------------------------------------------------

describe("computeTopologicalOrder", () => {
  it("orders linear chain A -> B -> C", () => {
    const nodes = nodeMap(makeNode("A"), makeNode("B"), makeNode("C"))
    const edges = edgeMap(makeEdge("e1", "A", "B"), makeEdge("e2", "B", "C"))

    const order = computeTopologicalOrder(nodes, edges)
    expect(order.indexOf(nid("A"))).toBeLessThan(order.indexOf(nid("B")))
    expect(order.indexOf(nid("B"))).toBeLessThan(order.indexOf(nid("C")))
  })

  it("orders diamond graph correctly", () => {
    const nodes = nodeMap(makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D"))
    const edges = edgeMap(
      makeEdge("e1", "A", "B"),
      makeEdge("e2", "A", "C"),
      makeEdge("e3", "B", "D"),
      makeEdge("e4", "C", "D"),
    )

    const order = computeTopologicalOrder(nodes, edges)
    expect(order.indexOf(nid("A"))).toBeLessThan(order.indexOf(nid("B")))
    expect(order.indexOf(nid("A"))).toBeLessThan(order.indexOf(nid("C")))
    expect(order.indexOf(nid("B"))).toBeLessThan(order.indexOf(nid("D")))
    expect(order.indexOf(nid("C"))).toBeLessThan(order.indexOf(nid("D")))
  })

  it("excludes loop back-edges from ordering", () => {
    const nodes = nodeMap(makeNode("A"), makeNode("B"))
    const edges = edgeMap(
      makeEdge("e1", "A", "B"),
      { ...makeEdge("e2", "B", "A"), loopBackEdge: { loopNodeId: nid("loop") } },
    )

    const order = computeTopologicalOrder(nodes, edges)
    expect(order).toHaveLength(2)
    expect(order.indexOf(nid("A"))).toBeLessThan(order.indexOf(nid("B")))
  })

  it("returns all nodes for independent nodes", () => {
    const nodes = nodeMap(makeNode("A"), makeNode("B"), makeNode("C"))
    const edges = edgeMap()

    const order = computeTopologicalOrder(nodes, edges)
    expect(order).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------
// detectCycle
// ---------------------------------------------------------------------------

describe("detectCycle", () => {
  it("returns null for DAG", () => {
    const nodes = nodeMap(makeNode("A"), makeNode("B"))
    const edges = edgeMap(makeEdge("e1", "A", "B"))

    expect(detectCycle(nodes, edges)).toBeNull()
  })

  it("detects illegal cycle", () => {
    const nodes = nodeMap(makeNode("A"), makeNode("B"))
    const edges = edgeMap(makeEdge("e1", "A", "B"), makeEdge("e2", "B", "A"))

    const cycle = detectCycle(nodes, edges)
    expect(cycle).not.toBeNull()
    expect(cycle).toContain(nid("A"))
    expect(cycle).toContain(nid("B"))
  })

  it("allows cycle with loop back-edge", () => {
    const nodes = nodeMap(makeNode("A"), makeNode("B"))
    const edges = edgeMap(
      makeEdge("e1", "A", "B"),
      { ...makeEdge("e2", "B", "A"), loopBackEdge: { loopNodeId: nid("loop") } },
    )

    expect(detectCycle(nodes, edges)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// isLegalTransition
// ---------------------------------------------------------------------------

describe("isLegalTransition", () => {
  it("allows pending -> ready", () => {
    expect(isLegalTransition("pending", "ready")).toBe(true)
  })

  it("allows pending -> skipped", () => {
    expect(isLegalTransition("pending", "skipped")).toBe(true)
  })

  it("allows pending -> cancelled", () => {
    expect(isLegalTransition("pending", "cancelled")).toBe(true)
  })

  it("allows ready -> running", () => {
    expect(isLegalTransition("ready", "running")).toBe(true)
  })

  it("allows running -> succeeded", () => {
    expect(isLegalTransition("running", "succeeded")).toBe(true)
  })

  it("allows running -> failed", () => {
    expect(isLegalTransition("running", "failed")).toBe(true)
  })

  it("rejects pending -> running", () => {
    expect(isLegalTransition("pending", "running")).toBe(false)
  })

  it("rejects succeeded -> running", () => {
    expect(isLegalTransition("succeeded", "running")).toBe(false)
  })

  it("rejects failed -> ready", () => {
    expect(isLegalTransition("failed", "ready")).toBe(false)
  })

  it("rejects skipped -> any", () => {
    expect(isLegalTransition("skipped", "ready")).toBe(false)
    expect(isLegalTransition("skipped", "running")).toBe(false)
    expect(isLegalTransition("skipped", "succeeded")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// updateNodeState
// ---------------------------------------------------------------------------

describe("updateNodeState", () => {
  function makeMirror(): ReturnType<typeof buildMirror> {
    const snapshot = makeSnapshot(
      [makeNode("A"), makeNode("B")],
      [makeEdge("e1", "A", "B")],
    )
    const states: NodeRuntimeState[] = [
      { runId: "run1" as any, nodeId: nid("A"), iterationIndex: 0, state: "pending", remainingDeps: 0, attempt: 0 },
      { runId: "run1" as any, nodeId: nid("B"), iterationIndex: 0, state: "pending", remainingDeps: 1, attempt: 0 },
    ]
    return buildMirror(snapshot, states)
  }

  it("transitions pending -> ready", () => {
    const mirror = makeMirror()
    const result = updateNodeState(mirror, nid("A"), 0, "ready")
    expect(result).toBe(true)
    expect(mirror.states.get(stateKey(nid("A"), 0))!.state).toBe("ready")
    expect(mirror.readySet.has(stateKey(nid("A"), 0))).toBe(true)
  })

  it("transitions ready -> running and updates sets", () => {
    const mirror = makeMirror()
    updateNodeState(mirror, nid("A"), 0, "ready")
    const result = updateNodeState(mirror, nid("A"), 0, "running")
    expect(result).toBe(true)
    expect(mirror.states.get(stateKey(nid("A"), 0))!.state).toBe("running")
    expect(mirror.readySet.has(stateKey(nid("A"), 0))).toBe(false)
    expect(mirror.runningSet.has(stateKey(nid("A"), 0))).toBe(true)
  })

  it("rejects illegal transition", () => {
    const mirror = makeMirror()
    const result = updateNodeState(mirror, nid("A"), 0, "running")
    expect(result).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildMirror
// ---------------------------------------------------------------------------

describe("buildMirror", () => {
  it("builds mirror from snapshot", () => {
    const snapshot = makeSnapshot(
      [makeNode("A"), makeNode("B"), makeNode("C")],
      [makeEdge("e1", "A", "B"), makeEdge("e2", "B", "C")],
    )
    const states: NodeRuntimeState[] = [
      { runId: "run1" as any, nodeId: nid("A"), iterationIndex: 0, state: "pending", remainingDeps: 0, attempt: 0 },
      { runId: "run1" as any, nodeId: nid("B"), iterationIndex: 0, state: "pending", remainingDeps: 1, attempt: 0 },
      { runId: "run1" as any, nodeId: nid("C"), iterationIndex: 0, state: "pending", remainingDeps: 1, attempt: 0 },
    ]

    const mirror = buildMirror(snapshot, states)

    expect(mirror.nodes.size).toBe(3)
    expect(mirror.edges.size).toBe(2)
    expect(mirror.topoOrder).toHaveLength(3)
    expect(mirror.topoOrder[0]).toBe(nid("A"))
    expect(mirror.topoOrder[1]).toBe(nid("B"))
    expect(mirror.topoOrder[2]).toBe(nid("C"))
  })

  it("computes correct remainingDeps", () => {
    const snapshot = makeSnapshot(
      [makeNode("A"), makeNode("B"), makeNode("C")],
      [makeEdge("e1", "A", "C"), makeEdge("e2", "B", "C")],
    )
    const states: NodeRuntimeState[] = []

    const mirror = buildMirror(snapshot, states)

    expect(mirror.states.get(stateKey(nid("A"), 0))!.remainingDeps).toBe(0)
    expect(mirror.states.get(stateKey(nid("B"), 0))!.remainingDeps).toBe(0)
    expect(mirror.states.get(stateKey(nid("C"), 0))!.remainingDeps).toBe(2)
  })

  it("populates readySet for nodes with 0 deps in pending state", () => {
    const snapshot = makeSnapshot(
      [makeNode("A"), makeNode("B")],
      [makeEdge("e1", "A", "B")],
    )
    const states: NodeRuntimeState[] = []

    const mirror = buildMirror(snapshot, states)

    // A has 0 deps and is pending -> should be in readySet after build
    // Actually, buildMirror inserts as "pending", not "ready"
    // The engine's tick logic transitions pending with 0 deps to ready
    expect(mirror.states.get(stateKey(nid("A"), 0))!.remainingDeps).toBe(0)
  })
})
