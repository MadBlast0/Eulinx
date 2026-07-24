import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type EdgeTypes,
  type NodeTypes,
  type NodeMouseHandler,
} from "@xyflow/react"
import { graphlib, layout } from "@dagrejs/dagre"
import "@xyflow/react/dist/style.css"
import { CustomNode } from "./custom-node"
import { CustomEdge } from "./custom-edge"
import { CanvasGrid } from "./canvas-grid"
import { ZoomControls } from "./zoom-controls"
import { MinimapWidget } from "./minimap-widget"
import { NodeGraphProvider, useNodeGraph } from "./use-node-graph"
import { useWorkspace } from "../use-workspace"
import { useProjects } from "../use-projects"
import { useCommand } from "../keyboard/use-keyboard"
import { cn } from "@/utils/cn"
import type { EulinxNodeKind } from "./node-types"

const nodeTypes: NodeTypes = { eulinx: CustomNode }
const edgeTypes: EdgeTypes = { eulinx: CustomEdge }

function NodeGraphInner() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useNodeGraph()
  const { x, y, zoom } = useViewport()
  const { openContextMenu } = useWorkspace()
  const [handTool, setHandTool] = useState(false)

  // Toggle hand tool (command registered in default-keymap)
  useCommand("graph.panTool", useCallback(() => {
    setHandTool((v) => !v)
  }, []))

  // Exit hand mode on Escape
  useEffect(() => {
    if (!handTool) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHandTool(false)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [handTool])

  // Dynamic pan/selection based on hand tool state
  const panOnDrag: number[] | undefined = useMemo(() => {
    if (handTool) return [0, 1, 2]
    return [1, 2]
  }, [handTool])

  const selectionOnDrag = !handTool

  const rf = useReactFlow()
  const { graph: projectGraph, setGraphNodes } = useProjects()
  const projectGraphRef = useRef(projectGraph)
  projectGraphRef.current = projectGraph

  // Dagre-based auto-layout (triggered by "eulinx:graph-auto-layout" event)
  useEffect(() => {
    const handler = () => {
      const flowNodes = rf.getNodes()
      const flowEdges = rf.getEdges()
      if (flowNodes.length === 0) return

      const g = new graphlib.Graph()
      g.setDefaultEdgeLabel(() => ({}))
      g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 })

      for (const node of flowNodes) {
        const w = node.measured?.width ?? node.width ?? 200
        const h = node.measured?.height ?? node.height ?? 100
        g.setNode(node.id, { width: w, height: h })
      }

      for (const edge of flowEdges) {
        g.setEdge(edge.source, edge.target)
      }

      layout(g)

      const graph = projectGraphRef.current
      if (!graph) return
      setGraphNodes(
        graph.nodes.map((n) => {
          const dagreNode = g.node(n.id)
          if (!dagreNode) return n
          const w = flowNodes.find((fn) => fn.id === n.id)?.measured?.width ?? n.width ?? 200
          const h = flowNodes.find((fn) => fn.id === n.id)?.measured?.height ?? 100
          return { ...n, x: dagreNode.x - w / 2, y: dagreNode.y - h / 2 }
        }),
      )
    }

    window.addEventListener("eulinx:graph-auto-layout", handler)
    return () => window.removeEventListener("eulinx:graph-auto-layout", handler)
  }, [rf, setGraphNodes])

  const defaultEdgeOptions = useMemo(() => ({ type: "eulinx" }), [])

  const onNodeContextMenu: NodeMouseHandler = useMemo(
    () => (_event, node) => {
      _event.preventDefault()
      _event.stopPropagation()
      const kind = (node.data as { kind?: EulinxNodeKind }).kind ?? "unknown"
      openContextMenu({
        x: _event.clientX,
        y: _event.clientY,
        nodeId: node.id,
        nodeKind: kind,
        nodeLabel: (node.data as { label?: string }).label ?? node.id,
      })
    },
    [openContextMenu],
  )

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
        /* ── Selection / Pan ── */
        selectionOnDrag={selectionOnDrag}
        panOnDrag={panOnDrag}       /* H toggles left-click pan */
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Control"
        /* ── Grid ── */
        snapToGrid
        snapGrid={[16, 16] as [number, number]}
        /* ── Connection ── */
        connectionLineStyle={{ stroke: "var(--Eulinx-color-accent)", strokeWidth: 1.5 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        /* ── Node interaction ── */
        deleteKeyCode="Backspace"
        onNodeContextMenu={onNodeContextMenu}
        /* ── Styling ── */
        className={cn("h-full w-full", handTool && "hand-tool")}
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
