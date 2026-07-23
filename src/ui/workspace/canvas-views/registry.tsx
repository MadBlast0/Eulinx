import type { ReactNode } from "react"
import type { CanvasViewKind } from "../project-types"
import { NodeGraph } from "../node-graph"
import { ArtifactsView } from "./artifacts-view"
import { TerminalView } from "../terminal"
import UnifiedSearch from "./panels/unified-search"
import WorkspaceDashboard from "./panels/workspace-dashboard"
import MemoryGraph from "./panels/memory-graph"
import KnowledgeGraph from "./panels/knowledge-graph"
import CausalTrace from "./panels/causal-trace"
import SessionTimeline from "./panels/session-timeline"
import VectorExplorer from "./panels/vector-explorer"
import QueryPlayground from "./panels/query-playground"

export interface CanvasViewMeta {
  readonly label: string
  readonly iconName: string
  readonly render: () => ReactNode
}

export const CANVAS_VIEW_REGISTRY: Record<CanvasViewKind, CanvasViewMeta> = {
  "node-graph": {
    label: "Graph",
    iconName: "graph",
    render: () => <NodeGraph />,
  },
  artifacts: {
    label: "Artifacts",
    iconName: "artifacts",
    render: () => <ArtifactsView />,
  },
  terminal: {
    label: "Terminal",
    iconName: "terminal",
    render: () => <TerminalView ptyId="canvas-terminal" className="h-full" />,
  },
  "memory-graph": {
    label: "Memory Graph",
    iconName: "memory",
    render: () => <MemoryGraph />,
  },
  "knowledge-graph": {
    label: "Knowledge Graph",
    iconName: "knowledge",
    render: () => <KnowledgeGraph />,
  },
  "causal-trace": {
    label: "Causal Trace",
    iconName: "conditions",
    render: () => <CausalTrace />,
  },
  "session-timeline": {
    label: "Session Timeline",
    iconName: "loops",
    render: () => <SessionTimeline />,
  },
  "vector-explorer": {
    label: "Vector Explorer",
    iconName: "knowledge",
    render: () => <VectorExplorer />,
  },
  "query-playground": {
    label: "Query Playground",
    iconName: "variables",
    render: () => <QueryPlayground />,
  },
  "workspace-dashboard": {
    label: "Dashboard",
    iconName: "graph",
    render: () => <WorkspaceDashboard />,
  },
  "unified-search": {
    label: "Unified Search",
    iconName: "search",
    render: () => <UnifiedSearch />,
  },
}

export function getCanvasViewMeta(kind: CanvasViewKind): CanvasViewMeta {
  return CANVAS_VIEW_REGISTRY[kind]
}
