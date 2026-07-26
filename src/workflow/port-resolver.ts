/**
 * P16-WF — Port Resolver (Data Flow Between Nodes)
 *
 * Resolves a node's input port values from connected upstream outputs,
 * and stores a node's output port values into the RunContext after execution.
 * The bridge between the graph's edge definitions and the RunContext's
 * keyed value store.
 */

import type { RunContext } from "./run-context"
import type { NodeId, EdgeDefinition, NodeDefinition, JsonValue } from "./workflow-types"

// ---------------------------------------------------------------------------
// Resolved Inputs
// ---------------------------------------------------------------------------

export interface ResolvedInputs {
  /** Map of targetPortId → resolved value from upstream output. */
  readonly values: Record<string, JsonValue>
  /** Ports that were declared required but had no incoming edge with a value. */
  readonly unsatisfied: readonly string[]
}

// ---------------------------------------------------------------------------
// Resolve Inputs
// ---------------------------------------------------------------------------

/**
 * Resolve a node's input port values by reading upstream outputs from the
 * RunContext. For each incoming edge, looks up the source node's output
 * value using the output key format `nodeId:portId:iterationIndex`.
 *
 * @param nodeId        The target node whose inputs are being resolved.
 * @param iterationIndex The iteration index for this node's execution.
 * @param node          The target node definition (for port metadata).
 * @param incomingEdges All edges targeting this node.
 * @param runContext    The run context containing upstream output values.
 * @returns Resolved input values and any unsatisfied required ports.
 */
export function resolveInputs(
  _nodeId: NodeId,
  _iterationIndex: number,
  node: NodeDefinition,
  incomingEdges: readonly EdgeDefinition[],
  runContext: RunContext,
): ResolvedInputs {
  const values: Record<string, JsonValue> = {}
  const satisfiedPorts = new Set<string>()

  for (const edge of incomingEdges) {
    // Skip loop back-edges — they don't carry data for the current iteration
    if (edge.loopBackEdge || edge.kind === "loop_back") continue

    // Look up the source node's output in the run context.
    // The source iteration is typically 0 for simple graphs; for loop nodes
    // the loop executor manages iteration-specific lookups.
    const sourceIteration = 0
    const outVal = runContext.readOutput(
      edge.fromNodeId as NodeId,
      edge.fromPortId,
      sourceIteration,
    )

    if (outVal) {
      values[edge.toPortId] = outVal.value
      satisfiedPorts.add(edge.toPortId)
    }
  }

  // Check for unsatisfied required input ports
  const unsatisfied: string[] = []
  for (const port of node.inputPorts) {
    if (port.required && !satisfiedPorts.has(port.portId)) {
      // Check if a default value exists — if so, it's not truly unsatisfied
      if (port.defaultValue === undefined) {
        unsatisfied.push(port.portId)
      } else {
        values[port.portId] = port.defaultValue
      }
    }
  }

  return { values, unsatisfied }
}

// ---------------------------------------------------------------------------
// Store Outputs
// ---------------------------------------------------------------------------

/**
 * Store a node's output port values into the RunContext after successful
 * execution. Each output is written using the output key format and
 * associated with the edge that connects to the downstream consumer.
 *
 * For outputs that connect to multiple downstream nodes, the value is
 * stored once under the node's own key — downstream resolution reads
 * from this key via the edge's fromNodeId/fromPortId.
 *
 * @param nodeId         The node that produced outputs.
 * @param iterationIndex The iteration index for this execution.
 * @param outputs        Map of portId → value produced by the executor.
 * @param outgoingEdges  Edges originating from this node (for edge association).
 * @param runContext     The run context to write into.
 * @returns Number of outputs successfully stored.
 */
export function storeOutputs(
  nodeId: NodeId,
  iterationIndex: number,
  outputs: Record<string, JsonValue>,
  outgoingEdges: readonly EdgeDefinition[],
  runContext: RunContext,
): number {
  let stored = 0

  for (const [portId, value] of Object.entries(outputs)) {
    // Find an outgoing edge from this port to associate with the write.
    // If multiple edges share the same source port, use the first one.
    const viaEdge = outgoingEdges.find((e) => e.fromPortId === portId)
    if (!viaEdge) continue

    const result = runContext.writeOutput(
      nodeId,
      portId,
      iterationIndex,
      value,
      viaEdge.edgeId,
      estimateSize(value),
    )

    if (result.ok) {
      stored++
    }
  }

  return stored
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Rough byte-size estimate for budget tracking. */
function estimateSize(value: JsonValue): number {
  if (value === null || value === undefined) return 8
  if (typeof value === "string") return value.length * 2
  if (typeof value === "number" || typeof value === "boolean") return 8
  // Objects/arrays — serialize to estimate
  try {
    return JSON.stringify(value).length * 2
  } catch {
    return 64
  }
}
