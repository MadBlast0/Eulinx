/**
 * NodeGraph — Styled MiniMap (NodeGraph-Part04 §The Minimap).
 *
 * Wraps React Flow's <MiniMap> with token styling. Non-interactive overview,
 * bottom-right, click-to-pan disabled (only drag-scroll per spec).
 */

import { MiniMap, type MiniMapProps } from "@xyflow/react"
import { token } from "@/ui/tokens"
import type { EulinxNodeKind } from "./node-graph-shared"
import { getNodeTypeMeta } from "./node-graph-shared"

/** Map a node kind to a minimap swatch color (from its accent role token). */
function nodeColor(node: { data?: Record<string, unknown> }): string {
  const kind = (node.data?.kind ?? "unknown") as EulinxNodeKind
  const meta = getNodeTypeMeta(kind)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return `var(${meta.accent as any})`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GraphMiniMapProps = MiniMapProps<any>

export function GraphMiniMap(props: GraphMiniMapProps): React.ReactNode {
  return (
    <MiniMap
      {...props}
      pannable
      zoomable={false}
      ariaLabel="Graph overview"
      style={{
        background: token("--Eulinx-color-elevated"),
        border: `${token("--Eulinx-border-thin")} solid ${token("--Eulinx-color-border")}`,
        borderRadius: token("--Eulinx-radius-md"),
        boxShadow: token("--Eulinx-elev-sm"),
        width: 200,
        height: 140,
      }}
      maskColor={token("--Eulinx-color-surface")}
      maskStrokeColor={token("--Eulinx-color-border")}
      nodeColor={nodeColor}
      nodeStrokeColor={token("--Eulinx-color-border-strong")}
      nodeStrokeWidth={2}
      nodeBorderRadius={4}
    />
  )
}
