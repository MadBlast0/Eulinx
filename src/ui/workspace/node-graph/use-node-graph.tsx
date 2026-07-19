import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react"
import {
  addEdge,
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

function toNodeKind(kind: CanvasNode["kind"]): EulinxNodeKind {
  return kind
}

function projectNode(node: CanvasNode): CustomNodeType {
  return {
    id: node.id,
    type: "eulinx",
    position: { x: node.x, y: node.y },
    selected: node.selected ?? false,
    data: {
      kind: toNodeKind(node.kind),
      label: node.label,
      url: node.url,
    } satisfies CustomNodeData,
  }
}

function projectEdge(conn: EdgeConn): Edge {
  return {
    id: `${conn.from}->${conn.to}`,
    source: conn.from,
    target: conn.to,
    type: "eulinx",
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
  } = useWorkspace()

  const [nodes, setNodes, onNodesChangeRaw] = useNodesState<CustomNodeType>(
    wsNodes.map(projectNode),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    connections.map(projectEdge),
  )

  useEffect(() => {
    setNodes(wsNodes.map(projectNode))
  }, [wsNodes, setNodes])

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

  const onConnect = useCallback<OnConnect>(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge({ ...connection, type: "eulinx" }, eds),
      )
    },
    [setEdges],
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
