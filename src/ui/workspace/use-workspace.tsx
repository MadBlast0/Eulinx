import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  BottomTab,
  CanvasNode,
  ContextMenuState,
  EdgeConn,
  NodeKind,
  OverlayKind,
  RightTab,
} from "./types"
import { useProjects } from "./use-projects"
import type { GraphEdge, GraphNode } from "./project-types"
import {
  getNodeTypeMeta,
  type EulinxNodeKind,
} from "./node-graph/node-types"

/** Project a persisted GraphNode onto the presentational CanvasNode shape. */
function toCanvasNode(node: GraphNode, selected: boolean): CanvasNode {
  return {
    id: node.id,
    kind: node.kind as NodeKind,
    label: node.label,
    x: node.x,
    y: node.y,
    width: node.width,
    accent: node.accent,
    shell: node.shell,
    url: node.url,
    lines: node.lines,
    selected,
  }
}

function toEdgeConn(edge: { id: string; from: string; to: string }): EdgeConn {
  return { from: edge.from, to: edge.to }
}

interface WorkspaceContextValue {
  readonly nodes: readonly CanvasNode[]
  readonly connections: readonly EdgeConn[]
  readonly selectedId: string | null
  readonly rightTab: RightTab
  readonly bottomTab: BottomTab
  readonly bottomPanelOpen: boolean
  readonly leftSidebarOpen: boolean
  readonly rightSidebarOpen: boolean
  readonly overlay: OverlayKind
  readonly contextMenu: ContextMenuState | null
  readonly canUndo: boolean
  readonly canRedo: boolean
  setRightTab(tab: RightTab): void
  setBottomTab(tab: BottomTab): void
  setBottomPanelOpen(open: boolean): void
  toggleLeftSidebar(): void
  toggleRightSidebar(): void
  setOverlay(overlay: OverlayKind): void
  openContextMenu(state: ContextMenuState): void
  closeContextMenu(): void
  selectNode(id: string): void
  moveNode(id: string, x: number, y: number): void
  addNode(kind: EulinxNodeKind, shell?: string): void
  removeNode(id: string): void
  addConnection(from: string, to: string): void
  autoLayout(): void
  undo(): void
  redo(): void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const projects = useProjects()
  const { graph } = projects

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rightTab, setRightTab] = useState<RightTab>("files")
  const [bottomTab, setBottomTab] = useState<BottomTab>("logs")
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [overlay, setOverlay] = useState<OverlayKind>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [undoStack, setUndoStack] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }[]>([])
  const [redoStack, setRedoStack] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }[]>([])

  const nodes = useMemo<readonly CanvasNode[]>(() => {
    if (!graph) return []
    return graph.nodes.map((n) => toCanvasNode(n, n.id === selectedId))
  }, [graph, selectedId])

  const connections = useMemo<readonly EdgeConn[]>(() => {
    if (!graph) return []
    return graph.edges.map(toEdgeConn)
  }, [graph])

  const selectNode = useCallback(
    (id: string) => {
      setSelectedId(id)
    },
    [],
  )

  const pushSnapshot = useCallback(() => {
    const g = projects.graph
    if (!g) return
    setUndoStack((prev) => {
      const next = [{ nodes: [...g.nodes], edges: [...g.edges] }, ...prev]
      return next.length > 50 ? next.slice(0, 50) : next
    })
    setRedoStack([])
  }, [projects.graph])

  const undo = useCallback(() => {
    const snapshot = undoStack[0]
    if (!snapshot || !projects.graph) return
    setRedoStack((prev) => [{ nodes: [...projects.graph!.nodes], edges: [...projects.graph!.edges] }, ...prev]) // Safe: guarded by null check above
    setUndoStack((prev) => prev.slice(1))
    projects.setGraphNodes(snapshot.nodes)
    projects.setGraphEdges(snapshot.edges)
  }, [undoStack, projects])

  const redo = useCallback(() => {
    const snapshot = redoStack[0]
    if (!snapshot || !projects.graph) return
    setUndoStack((prev) => [{ nodes: [...projects.graph!.nodes], edges: [...projects.graph!.edges] }, ...prev]) // Safe: guarded by null check above
    setRedoStack((prev) => prev.slice(1))
    projects.setGraphNodes(snapshot.nodes)
    projects.setGraphEdges(snapshot.edges)
  }, [redoStack, projects])

  const moveNode = useCallback(
    (id: string, x: number, y: number) => {
      pushSnapshot()
      projects.moveNode(id, x, y)
    },
    [projects, pushSnapshot],
  )

  const addNode = useCallback(
    (kind: EulinxNodeKind, shell?: string) => {
      pushSnapshot()
      const id = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const x = 200 + Math.random() * 300
      const y = 150 + Math.random() * 200
      const label =
        shell && shell.length > 0 ? `Terminal (${shell})` : getNodeTypeMeta(kind).label
      const width = kind === "browser" ? 280 : kind === "map" ? 180 : kind === "terminal" ? 480 : 240
      const node: GraphNode = {
        id,
        kind,
        label,
        x,
        y,
        width,
        accent: "accent",
        shell: shell && shell.length > 0 ? shell : undefined,
        lines: kind === "terminal" ? [{ prompt: "$", cursor: true }] : undefined,
        url: kind === "browser" ? "https://example.com" : undefined,
      }
      projects.addNode(node)
      setSelectedId(id)
      setContextMenu(null)
    },
    [projects, pushSnapshot],
  )

  const autoLayout = useCallback(() => {
    const g = projects.graph
    if (!g) return
    pushSnapshot()
    const graphNodes = g.nodes
    if (graphNodes.length > 0) {
      const columns = Math.max(1, Math.ceil(Math.sqrt(graphNodes.length)))
      const originX = 120
      const originY = 120
      const colSpacing = 320
      const rowSpacing = 200
      graphNodes.forEach((node, index) => {
        const col = index % columns
        const row = Math.floor(index / columns)
        projects.moveNode(node.id, originX + col * colSpacing, originY + row * rowSpacing)
      })
    }
    setContextMenu(null)
  }, [projects, pushSnapshot])

  const removeNode = useCallback(
    (id: string) => {
      pushSnapshot()
      projects.removeNode(id)
      setSelectedId((prev) => (prev === id ? null : prev))
    },
    [projects, pushSnapshot],
  )

  const addConnection = useCallback(
    (from: string, to: string) => {
      if (!projects.graph) return
      pushSnapshot()
      const newEdge: GraphEdge = { id: `${from}->${to}`, from, to }
      projects.setGraphEdges([...projects.graph.edges, newEdge])
    },
    [projects, pushSnapshot],
  )

  const canUndo = undoStack.length > 0
  const canRedo = redoStack.length > 0

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      nodes,
      connections,
      selectedId,
      rightTab,
      bottomTab,
      bottomPanelOpen,
      leftSidebarOpen,
      rightSidebarOpen,
      overlay,
      contextMenu,
      canUndo,
      canRedo,
      setRightTab,
      setBottomTab,
      setBottomPanelOpen,
      toggleLeftSidebar: () => setLeftSidebarOpen((v) => !v),
      toggleRightSidebar: () => setRightSidebarOpen((v) => !v),
      setOverlay,
      openContextMenu: setContextMenu,
      closeContextMenu: () => setContextMenu(null),
      selectNode,
      moveNode,
      addNode,
      removeNode,
      addConnection,
      autoLayout,
      undo,
      redo,
    }),
    [
      nodes,
      connections,
      selectedId,
      rightTab,
      bottomTab,
      bottomPanelOpen,
      leftSidebarOpen,
      rightSidebarOpen,
      overlay,
      contextMenu,
      canUndo,
      canRedo,
      selectNode,
      moveNode,
      addNode,
      removeNode,
      addConnection,
      autoLayout,
      undo,
      redo,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider")
  }
  return ctx
}
