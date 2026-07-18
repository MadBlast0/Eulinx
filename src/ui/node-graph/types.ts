/**
 * NodeGraph — Object model & shared types (NodeGraph-Part01 §NodeGraph Object Model).
 *
 * Mirrors the spec exactly. React Flow is the renderer; this module is the
 * projection model it consumes. Every color is a token, every kind is a literal
 * union, and there are no `any` types anywhere.
 */

import type { Node as RFNode, Edge as RFEdge, XYPosition } from "@xyflow/react"

export type NodeId = string
export type EdgeId = string
export type RunId = string
export type WorkerId = string
export type PortId = string
export type IsoTimestamp = string

/** The canonical node kinds. Exactly 17 entries (16 concrete + unknown). */
export type EulinxNodeKind =
  | "input"
  | "output"
  | "trigger"
  | "worker"
  | "orchestrator"
  | "builder"
  | "verifier"
  | "condition"
  | "loop"
  | "merge"
  | "artifact"
  | "memory"
  | "tool"
  | "mcp"
  | "delay"
  | "human_approval"
  | "unknown"

/** Node execution state. */
export type EulinxNodeState =
  | "pending"
  | "ready"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled"

/** Derived visual state. Superset of EulinxNodeState. */
export type NodeVisualState =
  | "pending"
  | "ready"
  | "running"
  | "waiting"
  | "blocked"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled"
  | "stale"

export type PortDirection = "in" | "out"

/** Mirrors the edge kinds in the spec. */
export type EulinxEdgeKind =
  | "control"
  | "data"
  | "artifact"
  | "dependency"
  | "communication"

/** Data type carried by a port. Drives the compatibility matrix. */
export type PortDataType =
  | "control"
  | "text"
  | "json"
  | "artifact_ref"
  | "artifact_set"
  | "boolean"
  | "number"
  | "memory_ref"
  | "any"

export type EulinxPort = {
  portId: PortId
  nodeId: NodeId
  direction: PortDirection
  /** Human label rendered on hover. Max 24 chars enforced at render. */
  label: string
  dataType: PortDataType
  /** An in-port with required=true and no satisfied edge renders an error ring. */
  required: boolean
  /** How many edges may attach. null means unbounded. Out-ports are usually null. */
  maxConnections: number | null
  /** Index within its side, top to bottom. Drives geometry. */
  ordinal: number
}

/** The payload React Flow carries on every node. */
export type EulinxNodeData = {
  nodeId: NodeId
  runId: RunId
  kind: EulinxNodeKind
  /** User-facing title. Truncated with ellipsis at render. */
  label: string
  /** One-line summary shown in the body zone. May be empty string. */
  subtitle: string
  state: EulinxNodeState
  visualState: NodeVisualState
  ports: EulinxPort[]
  /** Present only when this node is currently bound to a live Worker. */
  workerId: WorkerId | null
  /** 0..1. null means indeterminate; render a pulse instead of a bar. */
  progress: number | null
  /** Provider/model badge text, e.g. "sonnet". Empty string hides the badge. */
  modelBadge: string
  /** Attempt number, 1-based. Values > 1 render a retry badge. */
  attempt: number
  /** Count of artifacts this node has emitted so far. 0 hides the badge. */
  artifactCount: number
  /** Set when state === "failed". Rendered in the inspector, not the node. */
  errorCode: string | null
  errorMessage: string | null
  /** Loop nodes only. null on every other kind. */
  iteration: { current: number; max: number } | null
  /** True while this node is animating in after a runtime insertion. */
  isEntering: boolean
  /** True when the node was inserted by an Orchestrator, not the author. */
  isDynamic: boolean
  /** Monotonic per-node version from the backend. Used to reject stale deltas. */
  version: number
  startedAt: IsoTimestamp | null
  finishedAt: IsoTimestamp | null
  /** Merge nodes only: how many in-ports are currently attached. */
  incomingEdgeCount?: number
  /** MCP nodes only: the server connection indicator state. */
  mcpConnection?: "connected" | "connecting" | "unreachable" | "unknown"
  /** Verifier nodes only: verdict counts. */
  verdict?: { pass: number; fail: number; skip: number }
  /** Human-approval node outcome text. */
  approvalOutcome?: string | null
}

/** The payload React Flow carries on every edge. */
export type EulinxEdgeData = {
  edgeId: EdgeId
  kind: EulinxEdgeKind
  sourcePortId: PortId
  targetPortId: PortId
  /** True when the edge's condition is met and data has flowed. */
  satisfied: boolean
  /** True while a payload is visibly travelling this edge. */
  active: boolean
  /** Condition edges only. The branch label, e.g. "true". Empty string otherwise. */
  branchLabel: string
  /** Rendered mid-edge when non-null, e.g. an artifact count. */
  badge: string | null
}

export type EulinxGraphNode = RFNode<EulinxNodeData>
export type EulinxGraphEdge = RFEdge<EulinxEdgeData>

export type Viewport = { x: number; y: number; zoom: number }

/** Presentation-only per-node state. Never sent to the engine as truth. */
export type NodeViewState = {
  position: XYPosition
  collapsed: boolean
  /** True when the user has manually placed this node. Auto-layout skips it. */
  pinned: boolean
}

/** Canvas lifecycle states (Part01 §States). */
export type GraphCanvasState =
  | "idle"
  | "loading"
  | "ready"
  | "live"
  | "degraded"
  | "resyncing"
  | "error"

/** Build a sane default for an empty node-data object. */
export function makeEmptyNodeData(partial: Partial<EulinxNodeData> & {
  nodeId: NodeId
  runId: RunId
  kind: EulinxNodeKind
  label: string
}): EulinxNodeData {
  return {
    runId: partial.runId,
    kind: partial.kind,
    label: partial.label,
    nodeId: partial.nodeId,
    subtitle: partial.subtitle ?? "",
    state: partial.state ?? "pending",
    visualState: partial.visualState ?? "pending",
    ports: partial.ports ?? [],
    workerId: partial.workerId ?? null,
    progress: partial.progress ?? null,
    modelBadge: partial.modelBadge ?? "",
    attempt: partial.attempt ?? 1,
    artifactCount: partial.artifactCount ?? 0,
    errorCode: partial.errorCode ?? null,
    errorMessage: partial.errorMessage ?? null,
    iteration: partial.iteration ?? null,
    isEntering: partial.isEntering ?? false,
    isDynamic: partial.isDynamic ?? false,
    version: partial.version ?? 0,
    startedAt: partial.startedAt ?? null,
    finishedAt: partial.finishedAt ?? null,
    incomingEdgeCount: partial.incomingEdgeCount,
    mcpConnection: partial.mcpConnection,
    verdict: partial.verdict,
    approvalOutcome: partial.approvalOutcome ?? null,
  }
}
