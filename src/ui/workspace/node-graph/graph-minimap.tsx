import { MiniMap, type Node } from "@xyflow/react"
import { getNodeTypeMeta } from "./node-types"
import type { CustomNodeData } from "./custom-node"

function nodeColor(node: Node): string {
  const data = node.data as Partial<CustomNodeData>
  if (data?.kind) {
    return getNodeTypeMeta(data.kind).accentVar
  }
  return "var(--Eulinx-color-node-graph-edge)"
}

export function GraphMinimap() {
  return (
    <MiniMap
      pannable
      zoomable={false}
      ariaLabel="Node graph minimap"
      position="bottom-right"
      nodeColor={nodeColor}
      nodeStrokeColor="var(--Eulinx-color-border)"
      maskColor="color-mix(in srgb, var(--Eulinx-color-background) 60%, transparent)"
      style={{
        background: "var(--Eulinx-color-surface)",
        border: "1px solid var(--Eulinx-color-border)",
        borderRadius: "var(--Eulinx-radius-md)",
      }}
    />
  )
}
