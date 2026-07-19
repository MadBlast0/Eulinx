import { useMemo } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { CustomNode } from "./custom-node"
import { CustomEdge } from "./custom-edge"
import { GraphMinimap } from "./graph-minimap"
import { NodeGraphProvider, useNodeGraph } from "./use-node-graph"

const nodeTypes: NodeTypes = { eulinx: CustomNode }
const edgeTypes: EdgeTypes = { eulinx: CustomEdge }

function NodeGraphInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useNodeGraph()

  const defaultEdgeOptions = useMemo(() => ({ type: "eulinx" }), [])

  return (
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
      className="h-full w-full bg-[color:var(--Eulinx-color-background)]"
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={20}
        size={1}
        color="color-mix(in srgb, var(--Eulinx-color-text-muted) 40%, transparent)"
      />
      <Controls
        className="!border !border-[color:var(--Eulinx-color-border)] !bg-[color:var(--Eulinx-color-surface)] !shadow-[var(--Eulinx-elev-md)]"
        showInteractive={false}
      />
      <GraphMinimap />
    </ReactFlow>
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
