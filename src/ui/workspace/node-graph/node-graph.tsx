import { useMemo } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  useViewport,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { CustomNode } from "./custom-node"
import { CustomEdge } from "./custom-edge"
import { CanvasGrid } from "./canvas-grid"
import { ZoomControls } from "./zoom-controls"
import { MinimapWidget } from "./minimap-widget"
import { NodeGraphProvider, useNodeGraph } from "./use-node-graph"

const nodeTypes: NodeTypes = { eulinx: CustomNode }
const edgeTypes: EdgeTypes = { eulinx: CustomEdge }

function NodeGraphInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useNodeGraph()
  const { x, y, zoom } = useViewport()

  const defaultEdgeOptions = useMemo(() => ({ type: "eulinx" }), [])

  return (
    <div className="relative h-full w-full bg-[color:var(--Eulinx-color-background)]">
      {/* Grid canvas — OUTSIDE ReactFlow's transformed viewport */}
      <CanvasGrid viewport={{ x, y, zoom }} />

      {/* Zoom controls — bottom-left */}
      <ZoomControls />

      {/* Minimap widget — bottom-right (outside ReactFlow viewport) */}
      <MinimapWidget />

      {/* ReactFlow — nodes, edges */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
        /* ── Camera behavior ── */
        minZoom={0.1}
        maxZoom={4}
        zoomOnDoubleClick={false}
        panOnScroll={false}
        zoomOnScroll
        /* ── Performance ── */
        onlyRenderVisibleElements
        /* ── Selection ── */
        selectionOnDrag
        panOnDrag={[1, 2]}          /* middle/right click = pan */
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        /* ── Grid ── */
        snapToGrid
        snapGrid={[16, 16] as [number, number]}
        /* ── Connection ── */
        connectionLineStyle={{ stroke: "var(--Eulinx-color-accent)", strokeWidth: 1.5 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        /* ── Styling ── */
        className="h-full w-full"
        deleteKeyCode={null}
      />
    </div>
  )
}

export function NodeGraph() {
  return (
    <div className="h-full w-full">
      <ReactFlowProvider>
        <NodeGraphProvider>
          <NodeGraphInner />
        </NodeGraphProvider>
      </ReactFlowProvider>
    </div>
  )
}
