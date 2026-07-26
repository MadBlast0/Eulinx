/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import {
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type OnConnect,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react"
import { useWorkspace } from "../use-workspace"
import type { CanvasNode, EdgeConn } from "../types"
import type { CustomNodeData, CustomNodeType } from "./custom-node"
import type { EulinxNodeKind } from "./node-types"
import type { WorkerState } from "../a11y/state-signals"
import { validateConnection, getDefaultEdgeKind } from "./connection-rules"

function projectNode(node: CanvasNode): CustomNodeType {
  return {
    id: node.id,
    type: "eulinx",
    position: { x: node.x, y: node.y },
    selected: node.selected ?? false,
    data: {
      kind: node.kind as EulinxNodeKind,
      label: node.label,
      url: node.url,
      status: node.status as WorkerState | undefined,
      shell: node.shell,
      lines: node.lines,
      ports: node.ports,
    } satisfies CustomNodeData,
  }
}

function projectEdge(conn: EdgeConn): Edge {
  return {
    id: `${conn.from}->${conn.to}`,
    source: conn.from,
    target: conn.to,
    type: "eulinx",
    data: { kind: conn.kind ?? "control" },
  }
}

interface NodeGraphContextValue {
  readonly nodes: CustomNodeType[]
  readonly edges: Edge[]
  readonly onNodesChange: OnNodesChange<CustomNodeType>
  readonly onEdgesChange: OnEdgesChange
  readonly onConnect: OnConnect
}

const NodeGraphContext = createContext<NodeGraphContextValue | null>(null)

export function NodeGraphProvider({ children }: { children: ReactNode }) {
  const {
    nodes: wsNodes,
    connections,
    selectNode,
    moveNode,
    addConnection,
  } = useWorkspace()

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<CustomNodeType>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  // Sync workspace nodes → ReactFlow nodes, preserving any internal dimensions
  // (e.g. from NodeResizer) that aren't persisted to the project store.
  useEffect(() => {
    setNodes((prev) => {
      const prevMap = new Map(prev.map((n) => [n.id, n]))
      return wsNodes.map((ws) => {
        const prev = prevMap.get(ws.id)
        const p = projectNode(ws)
        return {
          ...p,
          data: { ...prev?.data, ...p.data },
          width: prev?.width ?? p.width,
          height: prev?.height ?? p.height,
        }
      })
    })
  }, [wsNodes, setNodes])

  // Sync workspace edges → ReactFlow edges
  useEffect(() => {
    setEdges(connections.map(projectEdge))
  }, [connections, setEdges])

  const onNodesChange = useCallback<OnNodesChange<CustomNodeType>>(
    (changes) => {
      onNodesChangeRaw(changes)
      for (const change of changes) {
        if (change.type === "position" && change.position && !change.dragging) {
          moveNode(change.id, change.position.x, change.position.y)
        }
        if (change.type === "select" && change.selected) {
          selectNode(change.id)
        }
      }
    },
    [onNodesChangeRaw, moveNode, selectNode],
  )

  // Persist new connections to workspace
  const onConnect = useCallback<OnConnect>(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return

      // Find source and target node kinds
      const sourceNode = wsNodes.find((n) => n.id === connection.source)
      const targetNode = wsNodes.find((n) => n.id === connection.target)
      if (!sourceNode || !targetNode) return

      const sourceKind = sourceNode.kind as EulinxNodeKind
      const targetKind = targetNode.kind as EulinxNodeKind

      // Validate
      const validation = validateConnection(sourceKind, targetKind)
      if (!validation.valid) {
        console.warn("Connection rejected:", validation.reason)
        return
      }

      // Auto-detect edge kind
      const edgeKind = getDefaultEdgeKind(sourceKind, targetKind)

      addConnection(connection.source, connection.target, edgeKind)
    },
    [addConnection, wsNodes],
  )

  const value = useMemo<NodeGraphContextValue>(
    () => ({ nodes, edges, onNodesChange, onEdgesChange, onConnect }),
    [nodes, edges, onNodesChange, onEdgesChange, onConnect],
  )

  return (
    <NodeGraphContext.Provider value={value}>
      {children}
    </NodeGraphContext.Provider>
  )
}

export function useNodeGraph(): NodeGraphContextValue {
  const ctx = useContext(NodeGraphContext)
  if (!ctx) {
    throw new Error("useNodeGraph must be used within NodeGraphProvider")
  }
  return ctx
}
