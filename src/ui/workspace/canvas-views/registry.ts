import type { ReactNode } from "react"
import { Network, FileStack, TerminalSquare } from "lucide-react"
import type { CanvasViewKind } from "../project-types"

export interface CanvasViewMeta {
  readonly label: string
  readonly icon: typeof Network
  readonly render: () => ReactNode
}

/** Registry-driven dispatch for canvas center views.
 *  To add a new kind (e.g. "browser"), add one entry here and wire it in
 *  use-projects/addView as needed. node-graph is special-cased in canvas.tsx
 *  because it needs its provider wrapping, but its metadata still lives here. */
export const CANVAS_VIEW_REGISTRY: Record<CanvasViewKind, CanvasViewMeta> = {
  "node-graph": {
    label: "Graph",
    icon: Network,
    render: () => null,
  },
  artifacts: {
    label: "Artifacts",
    icon: FileStack,
    render: () => null,
  },
  terminal: {
    label: "Terminal",
    icon: TerminalSquare,
    render: () => null,
  },
}

export function getCanvasViewMeta(kind: CanvasViewKind): CanvasViewMeta {
  return CANVAS_VIEW_REGISTRY[kind]
}
