import type { ReactNode } from "react"
import { Network, FileStack, TerminalSquare } from "lucide-react"
import type { CanvasViewKind } from "../project-types"
import { NodeGraph } from "../node-graph"
import { ArtifactsView } from "./artifacts-view"
import { TerminalView } from "../terminal"

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
}

export function getCanvasViewMeta(kind: CanvasViewKind): CanvasViewMeta {
  return CANVAS_VIEW_REGISTRY[kind]
}
