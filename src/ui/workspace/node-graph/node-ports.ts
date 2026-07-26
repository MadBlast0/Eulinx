import { Position } from "@xyflow/react"
import type { EulinxNodeKind } from "./node-types"

export type PortType = "control" | "data" | "artifact" | "any"

export interface PortDef {
  readonly id: string
  readonly label: string
  readonly position: Position
  readonly type: "source" | "target"
  readonly portKind: PortType
}

/** Official port definitions per node kind from the docs */
export const NODE_PORTS: Partial<Record<EulinxNodeKind, readonly PortDef[]>> = {
  input: [
    { id: "out", label: "out", position: Position.Right, type: "source", portKind: "control" },
  ],
  output: [
    { id: "in", label: "in", position: Position.Left, type: "target", portKind: "control" },
  ],
  worker: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.context", label: "context", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.artifacts", label: "artifacts", position: Position.Right, type: "source", portKind: "artifact" },
    { id: "out.result", label: "result", position: Position.Right, type: "source", portKind: "data" },
  ],
  orchestrator: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.goal", label: "goal", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.plan", label: "plan", position: Position.Right, type: "source", portKind: "data" },
  ],
  builder: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.spec", label: "spec", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.artifacts", label: "artifacts", position: Position.Right, type: "source", portKind: "artifact" },
  ],
  verifier: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.artifacts", label: "artifacts", position: Position.Left, type: "target", portKind: "artifact" },
    { id: "out.pass", label: "pass", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.fail", label: "fail", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.verdict", label: "verdict", position: Position.Right, type: "source", portKind: "data" },
  ],
  condition: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.value", label: "value", position: Position.Left, type: "target", portKind: "data" },
    { id: "out.true", label: "true", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.false", label: "false", position: Position.Right, type: "source", portKind: "control" },
  ],
  loop: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.collection", label: "collection", position: Position.Left, type: "target", portKind: "data" },
    { id: "out.body", label: "body", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.item", label: "item", position: Position.Right, type: "source", portKind: "data" },
    { id: "out.done", label: "done", position: Position.Right, type: "source", portKind: "control" },
  ],
  merge: [
    { id: "in.a", label: "a", position: Position.Left, type: "target", portKind: "any" },
    { id: "in.b", label: "b", position: Position.Left, type: "target", portKind: "any" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
  ],
  artifact: [
    { id: "in.artifact", label: "artifact", position: Position.Left, type: "target", portKind: "artifact" },
    { id: "out.artifact", label: "artifact", position: Position.Right, type: "source", portKind: "artifact" },
  ],
  memory: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.query", label: "query", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.result", label: "result", position: Position.Right, type: "source", portKind: "data" },
  ],
  tool: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.args", label: "args", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.result", label: "result", position: Position.Right, type: "source", portKind: "data" },
  ],
  mcp: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.result", label: "result", position: Position.Right, type: "source", portKind: "data" },
  ],
  delay: [
    { id: "in", label: "in", position: Position.Left, type: "target", portKind: "control" },
    { id: "out", label: "out", position: Position.Right, type: "source", portKind: "control" },
  ],
  human_approval: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.artifacts", label: "artifacts", position: Position.Left, type: "target", portKind: "artifact" },
    { id: "out.approve", label: "approve", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.reject", label: "reject", position: Position.Right, type: "source", portKind: "control" },
  ],
  switch: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.value", label: "value", position: Position.Left, type: "target", portKind: "data" },
    { id: "out.0", label: "case 1", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.1", label: "case 2", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.default", label: "default", position: Position.Right, type: "source", portKind: "control" },
  ],
  filter: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.value", label: "value", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
  ],
  set: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.value", label: "value", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.value", label: "value", position: Position.Right, type: "source", portKind: "data" },
  ],
  code: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.value", label: "value", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.result", label: "result", position: Position.Right, type: "source", portKind: "data" },
  ],
  threshold: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.value", label: "value", position: Position.Left, type: "target", portKind: "data" },
    { id: "out.above", label: "above", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.equal", label: "equal", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.below", label: "below", position: Position.Right, type: "source", portKind: "control" },
  ],
  webhook_trigger: [
    { id: "out", label: "data", position: Position.Right, type: "source", portKind: "data" },
  ],
  schedule_trigger: [
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
  ],
  http_request: [
    { id: "in", label: "control", position: Position.Left, type: "target", portKind: "control" },
    { id: "in.url", label: "url", position: Position.Left, type: "target", portKind: "data" },
    { id: "in.body", label: "body", position: Position.Left, type: "target", portKind: "data" },
    { id: "out", label: "control", position: Position.Right, type: "source", portKind: "control" },
    { id: "out.response", label: "response", position: Position.Right, type: "source", portKind: "data" },
  ],
}

/** Get ports for a node kind, falling back to generic in/out */
export function getPortsForKind(kind: EulinxNodeKind): readonly PortDef[] {
  return NODE_PORTS[kind] ?? [
    { id: "in", label: "in", position: Position.Left, type: "target", portKind: "control" },
    { id: "out", label: "out", position: Position.Right, type: "source", portKind: "control" },
  ]
}
