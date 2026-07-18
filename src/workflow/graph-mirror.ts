/**
 * P16-WF-DAG — Graph Mirror (In-Memory)
 *
 * The in-memory representation of a workflow graph snapshot.
 * Built from SQLite at run start and after app restart.
 * Read path for the tick loop; SQLite is the write path.
 * From WorkflowEngine-Part02 §The In-Memory Mirror and §Building the Mirror.
 */

import type {
  NodeId,
  EdgeId,
  NodeDefinition,
  EdgeDefinition,
  GraphSnapshot,
  NodeRuntimeState,
  NodeState,
  SnapshotId,
} from "./workflow-types"

// ---------------------------------------------------------------------------
// Composite state key (WorkflowEngine-Part02 §stateKey)
// ---------------------------------------------------------------------------

export function stateKey(nodeId: NodeId, iterationIndex: number): string {
  return `${nodeId}#${iterationIndex}`
}

export function parseStateKey(key: string): { nodeId: NodeId; iterationIndex: number } {
  const idx = key.lastIndexOf("#")
  if (idx === -1) {
    throw new Error(`Invalid state key: ${key}`)
  }
  return {
    nodeId: key.slice(0, idx) as NodeId,
    iterationIndex: parseInt(key.slice(idx + 1), 10),
  }
}

// ---------------------------------------------------------------------------
// Graph Mirror (WorkflowEngine-Part02 §The In-Memory Mirror)
// ---------------------------------------------------------------------------

export interface GraphMirror {
  readonly snapshotId: SnapshotId
  readonly nodes: ReadonlyMap<NodeId, NodeDefinition>
  readonly edges: ReadonlyMap<EdgeId, EdgeDefinition>
  readonly outgoing: ReadonlyMap<NodeId, readonly EdgeId[]>
  readonly incoming: ReadonlyMap<NodeId, readonly EdgeId[]>
  readonly states: Map<string, NodeRuntimeState>
  readonly readySet: Set<string>
  readonly runningSet: Set<string>
  readonly topoOrder: readonly NodeId[]
}

// ---------------------------------------------------------------------------
// Topological sort (Kahn's algorithm)
// WorkflowEngine-Part02 §Building the Mirror step 7
// ---------------------------------------------------------------------------

export function computeTopologicalOrder(
  nodes: ReadonlyMap<NodeId, NodeDefinition>,
  edges: ReadonlyMap<EdgeId, EdgeDefinition>,
): NodeId[] {
  const inDegree = new Map<NodeId, number>()
  const adj = new Map<NodeId, NodeId[]>()

  for (const [nodeId] of nodes) {
    inDegree.set(nodeId, 0)
    adj.set(nodeId, [])
  }

  // Only count control and dependency edges, excluding loop back-edges
  for (const [, edge] of edges) {
    if (edge.loopBackEdge) continue
    if (edge.kind === "loop_back") continue
    inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1)
    adj.get(edge.fromNodeId)?.push(edge.toNodeId)
  }

  // Kahn's with stable tie-break by nodeId
  const queue: NodeId[] = []
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId)
  }
  queue.sort()

  const result: NodeId[] = []
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    result.push(nodeId)
    for (const neighbor of adj.get(nodeId) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) {
        // Insert in sorted position for determinism
        const insertIdx = queue.findIndex((q) => q > neighbor)
        if (insertIdx === -1) {
          queue.push(neighbor)
        } else {
          queue.splice(insertIdx, 0, neighbor)
        }
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Detect illegal cycles (for validation)
// ---------------------------------------------------------------------------

export function detectCycle(
  nodes: ReadonlyMap<NodeId, NodeDefinition>,
  edges: ReadonlyMap<EdgeId, EdgeDefinition>,
): NodeId[] | null {
  const topo = computeTopologicalOrder(nodes, edges)
  if (topo.length === nodes.size) return null
  // Return nodes not in topo order = the cycle members
  const topoSet = new Set(topo)
  return [...nodes.keys()].filter((id) => !topoSet.has(id))
}

// ---------------------------------------------------------------------------
// Build adjacency maps
// ---------------------------------------------------------------------------

function buildAdjacency(
  edges: ReadonlyMap<EdgeId, EdgeDefinition>,
): { outgoing: Map<NodeId, EdgeId[]>; incoming: Map<NodeId, EdgeId[]> } {
  const outgoing = new Map<NodeId, EdgeId[]>()
  const incoming = new Map<NodeId, EdgeId[]>()

  // Sort edges by edgeId for deterministic ordering
  const sorted = [...edges.values()].sort((a, b) => a.edgeId.localeCompare(b.edgeId))

  for (const edge of sorted) {
    const out = outgoing.get(edge.fromNodeId) ?? []
    out.push(edge.edgeId)
    outgoing.set(edge.fromNodeId, out)

    const inc = incoming.get(edge.toNodeId) ?? []
    inc.push(edge.edgeId)
    incoming.set(edge.toNodeId, inc)
  }

  return { outgoing, incoming }
}

// ---------------------------------------------------------------------------
// Compute initial remaining deps
// WorkflowEngine-Part02 §Building the Mirror step 9
// ---------------------------------------------------------------------------

function computeInitialRemainingDeps(
  nodeId: NodeId,
  incoming: Map<NodeId, EdgeId[]>,
  edges: ReadonlyMap<EdgeId, EdgeDefinition>,
): number {
  const inEdges = incoming.get(nodeId) ?? []
  let count = 0
  for (const edgeId of inEdges) {
    const edge = edges.get(edgeId)
    if (!edge) continue
    // Loop back-edges don't count toward remainingDeps
    if (edge.loopBackEdge) continue
    if (edge.kind === "loop_back") continue
    count++
  }
  return count
}

// ---------------------------------------------------------------------------
// Build GraphMirror from snapshot + persisted state
// WorkflowEngine-Part02 §Building the Mirror
// ---------------------------------------------------------------------------

export function buildMirror(
  snapshot: GraphSnapshot,
  persistedStates: readonly NodeRuntimeState[],
): GraphMirror {
  const nodeMap = new Map<NodeId, NodeDefinition>()
  for (const node of snapshot.nodes) {
    nodeMap.set(node.nodeId, node)
  }

  const edgeMap = new Map<EdgeId, EdgeDefinition>()
  for (const edge of snapshot.edges) {
    edgeMap.set(edge.edgeId, edge)
  }

  const { outgoing, incoming } = buildAdjacency(edgeMap)
  const topoOrder = computeTopologicalOrder(nodeMap, edgeMap)

  // Build states map from persisted data
  const states = new Map<string, NodeRuntimeState>()
  for (const state of persistedStates) {
    const key = stateKey(state.nodeId, state.iterationIndex)
    states.set(key, state)
  }

  // Insert missing states for nodes at iteration 0 (step 9)
  for (const [nodeId] of nodeMap) {
    const key = stateKey(nodeId, 0)
    if (!states.has(key)) {
      states.set(key, {
        runId: persistedStates[0]?.runId ?? ("" as any),
        nodeId,
        iterationIndex: 0,
        state: "pending",
        remainingDeps: computeInitialRemainingDeps(nodeId, incoming, edgeMap),
        attempt: 0,
      })
    }
  }

  // Rebuild readySet and runningSet
  const readySet = new Set<string>()
  const runningSet = new Set<string>()
  for (const [key, state] of states) {
    if (state.state === "ready") readySet.add(key)
    if (state.state === "running") runningSet.add(key)
  }

  return {
    snapshotId: snapshot.snapshotId,
    nodes: nodeMap,
    edges: edgeMap,
    outgoing,
    incoming,
    states,
    readySet,
    runningSet,
    topoOrder,
  }
}

// ---------------------------------------------------------------------------
// Node state transition helpers
// ---------------------------------------------------------------------------

/**
 * Check if a transition from one node state to another is legal.
 * NodeArchitecture-Part03 §Transition Rules
 */
export function isLegalTransition(from: NodeState, to: NodeState): boolean {
  const LEGAL: Record<NodeState, readonly NodeState[]> = {
    pending: ["ready", "skipped", "cancelled"],
    ready: ["running", "skipped", "cancelled"],
    running: ["succeeded", "failed", "cancelled"],
    succeeded: [],
    failed: [],
    skipped: [],
    cancelled: [],
  }
  return LEGAL[from].includes(to)
}

/**
 * Update node state in the mirror and manage readySet/runningSet.
 * Returns true if the update succeeded, false if the node was already in target state.
 */
export function updateNodeState(
  mirror: GraphMirror,
  nodeId: NodeId,
  iterationIndex: number,
  newState: NodeState,
  patch?: Partial<Omit<NodeRuntimeState, "runId" | "nodeId" | "iterationIndex" | "state">>,
): boolean {
  const key = stateKey(nodeId, iterationIndex)
  const current = mirror.states.get(key)
  if (!current) return false

  if (!isLegalTransition(current.state, newState)) return false
  if (current.state === newState) return false

  // Remove from old set
  if (current.state === "ready") mirror.readySet.delete(key)
  if (current.state === "running") mirror.runningSet.delete(key)

  // Update state
  const updated: NodeRuntimeState = {
    ...current,
    state: newState,
    ...patch,
  }
  mirror.states.set(key, updated)

  // Add to new set
  if (newState === "ready") mirror.readySet.add(key)
  if (newState === "running") mirror.runningSet.add(key)

  return true
}
