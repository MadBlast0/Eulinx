import type { EulinxNodeKind } from "./node-graph/node-types"

export type CanvasViewKind =
  | "node-graph"
  | "artifacts"
  | "terminal"
  | "memory-graph"
  | "knowledge-graph"
  | "causal-trace"
  | "session-timeline"
  | "vector-explorer"
  | "query-playground"
  | "workspace-dashboard"
  | "unified-search"

export interface GraphNode {
  id: string
  kind: EulinxNodeKind
  label: string
  x: number
  y: number
  width: number
  accent?: "accent" | "green" | "amber" | "red" | "purple"
  shell?: string
  url?: string
  lines?: readonly {
    prompt?: string
    command?: string
    output?: string
    outputColor?: "green" | "amber" | "red" | "muted"
    cursor?: boolean
  }[]
}

export interface GraphEdge {
  id: string
  from: string
  to: string
}

export interface NodeGraphDoc {
  id: string
  name: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  updatedAt: number
}

export interface CanvasView {
  id: string
  kind: CanvasViewKind
  name: string
  graphId?: string
}

export interface ProjectDoc {
  id: string
  name: string
  /** Absolute folder path; "" (or "local:/<name>") in the browser fallback. */
  path: string
  views: CanvasView[]
  activeViewId?: string
  /** Embedded graphs keyed by NodeGraphDoc.id. Kept inside the registry so the
   *  whole workspace persists to a single file. */
  graphs?: Record<string, NodeGraphDoc>
}

export interface WorkspaceDoc {
  version: 1
  projects: ProjectDoc[]
  activeProjectId?: string
}
