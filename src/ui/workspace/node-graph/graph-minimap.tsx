import { useState } from "react"
import { MiniMap, useReactFlow, type Node } from "@xyflow/react"
import { Maximize2, Minimize2 } from "lucide-react"
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
  const [collapsed, setCollapsed] = useState(false)
  const { fitView } = useReactFlow()

  if (collapsed) {
    return (
      <div className="absolute bottom-3 right-3 z-20">
        <button
          type="button"
          aria-label="Show minimap"
          onClick={() => setCollapsed(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text-muted)] shadow-[var(--Eulinx-elev-sm)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
        >
          <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
    )
  }

  return (
    <div className="absolute bottom-3 right-3 z-20 flex flex-col items-end gap-1">
      {/* Minimap */}
      <div className="relative">
        <MiniMap
          pannable
          zoomable={false}
          ariaLabel="Node graph minimap"
          nodeColor={nodeColor}
          nodeStrokeColor="var(--Eulinx-color-border)"
          nodeBorderRadius={4}
          maskColor="color-mix(in srgb, var(--Eulinx-color-background) 60%, transparent)"
          style={{
            background: "var(--Eulinx-color-surface)",
            border: "1px solid var(--Eulinx-color-border)",
            borderRadius: "var(--Eulinx-radius-md)",
            boxShadow: "var(--Eulinx-elev-sm)",
          }}
        />
        {/* Collapse button — top-right corner of minimap */}
        <button
          type="button"
          aria-label="Hide minimap"
          onClick={() => setCollapsed(true)}
          className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text-muted)] shadow-sm transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
        >
          <Minimize2 className="h-2.5 w-2.5" strokeWidth={2} />
        </button>
      </div>

      {/* Fit view button — below minimap */}
      <button
        type="button"
        aria-label="Fit view"
        onClick={() => fitView({ duration: 200 })}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-[color:var(--Eulinx-color-text-muted)] shadow-[var(--Eulinx-elev-sm)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]"
      >
        <Maximize2 className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  )
}
