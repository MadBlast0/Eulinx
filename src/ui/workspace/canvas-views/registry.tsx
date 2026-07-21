import type { ReactNode } from "react"
import {
  Network,
  FileStack,
  TerminalSquare,
  Database,
  GitBranch,
  Layers,
  Search,
  BarChart3,
  Braces,
} from "lucide-react"
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
  readonly icon: typeof Network
  readonly render: () => ReactNode
}

export const CANVAS_VIEW_REGISTRY: Record<CanvasViewKind, CanvasViewMeta> = {
  "node-graph": {
    label: "Graph",
    icon: Network,
    render: () => <NodeGraph />,
  },
  artifacts: {
    label: "Artifacts",
    icon: FileStack,
    render: () => <ArtifactsView />,
  },
  terminal: {
    label: "Terminal",
    icon: TerminalSquare,
    render: () => <TerminalView ptyId="canvas-terminal" className="h-full" />,
  },
  "memory-graph": {
    label: "Memory Graph",
    icon: Database,
    render: () => <MemoryGraph />,
  },
  "knowledge-graph": {
    label: "Knowledge Graph",
    icon: Network,
    render: () => <KnowledgeGraph />,
  },
  "causal-trace": {
    label: "Causal Trace",
    icon: GitBranch,
    render: () => <CausalTrace />,
  },
  "session-timeline": {
    label: "Session Timeline",
    icon: Layers,
    render: () => <SessionTimeline />,
  },
  "vector-explorer": {
    label: "Vector Explorer",
    icon: BarChart3,
    render: () => <VectorExplorer />,
  },
  "query-playground": {
    label: "Query Playground",
    icon: Braces,
    render: () => <QueryPlayground />,
  },
  "workspace-dashboard": {
    label: "Dashboard",
    icon: BarChart3,
    render: () => <WorkspaceDashboard />,
  },
  "unified-search": {
    label: "Unified Search",
    icon: Search,
    render: () => <UnifiedSearch />,
  },
}

export function getCanvasViewMeta(kind: CanvasViewKind): CanvasViewMeta {
  return CANVAS_VIEW_REGISTRY[kind]
}
