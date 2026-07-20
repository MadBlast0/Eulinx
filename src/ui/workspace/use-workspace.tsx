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
import type { GraphNode } from "./project-types"
import {
  getNodeTypeMeta,
  type EulinxNodeKind,
} from "./node-graph/node-types"

const NODE_KINDS: readonly NodeKind[] = ["terminal", "browser", "map"]

function isNodeKind(kind: string): kind is NodeKind {
  return (NODE_KINDS as readonly string[]).includes(kind)
}

/** Project a persisted GraphNode onto the presentational CanvasNode shape.
 *  The persisted kind set is a superset; non-3 base kinds fall back to "map"
 *  for the canvas token lookup. */
function toCanvasNode(node: GraphNode, selected: boolean): CanvasNode {
  const kind: NodeKind = isNodeKind(node.kind) ? node.kind : "map"
  return {
    id: node.id,
    kind,
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
  autoLayout(): void
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

  const moveNode = useCallback(
    (id: string, x: number, y: number) => {
      projects.moveNode(id, x, y)
    },
    [projects],
  )

  const addNode = useCallback(
    (kind: EulinxNodeKind, shell?: string) => {
      const id = `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
      const x = 200 + Math.random() * 300
      const y = 150 + Math.random() * 200
      const label =
        shell && shell.length > 0 ? `Terminal (${shell})` : getNodeTypeMeta(kind).label
      const width = kind === "browser" ? 280 : kind === "map" ? 180 : 240
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
    [projects],
  )

  const autoLayout = useCallback(() => {
    const graphNodes = graph?.nodes ?? []
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
  }, [graph, projects])

  const removeNode = useCallback(
    (id: string) => {
      projects.removeNode(id)
      setSelectedId((prev) => (prev === id ? null : prev))
    },
    [projects],
  )

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
      autoLayout,
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
      selectNode,
      moveNode,
      addNode,
      removeNode,
      autoLayout,
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
