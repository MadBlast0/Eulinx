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

const INITIAL_NODES: readonly CanvasNode[] = [
  {
    id: "node-main-term",
    kind: "terminal",
    label: "Main Terminal",
    x: 60,
    y: 140,
    width: 260,
    accent: "accent",
    selected: true,
    lines: [
      { prompt: "$", command: "cd ~/eulinx" },
      { output: "~/eulinx", outputColor: "muted" },
      { prompt: "$", command: "pnpm dev" },
      { output: "VITE v5.4.12  ready in 312ms", outputColor: "muted" },
      { output: "  ➜  Local:   http://localhost:1420/", outputColor: "muted" },
      { prompt: "$", cursor: true },
    ],
  },
  {
    id: "node-term1",
    kind: "terminal",
    label: "Terminal 1",
    x: 380,
    y: 100,
    width: 240,
    accent: "green",
    lines: [
      { prompt: "$", command: "cargo test" },
      { output: "running 42 tests", outputColor: "muted" },
      { output: "test result: ok. 42 passed", outputColor: "green" },
      { prompt: "$", cursor: true },
    ],
  },
  {
    id: "node-term2",
    kind: "terminal",
    label: "Terminal 2",
    x: 670,
    y: 100,
    width: 220,
    accent: "amber",
    lines: [
      { prompt: "$", command: "git status" },
      { output: "3 changed, 12 insertions", outputColor: "amber" },
      { prompt: "$", cursor: true },
    ],
  },
  {
    id: "node-browser",
    kind: "browser",
    label: "Browser",
    x: 440,
    y: 300,
    width: 280,
    accent: "red",
    url: "localhost:1420",
  },
  {
    id: "node-term4",
    kind: "terminal",
    label: "Terminal",
    x: 120,
    y: 330,
    width: 240,
    accent: "accent",
    lines: [
      { prompt: "$", command: "pnpm lint" },
      { output: "0 errors, 2 warnings", outputColor: "green" },
      { prompt: "$", cursor: true },
    ],
  },
  {
    id: "node-map",
    kind: "map",
    label: "Map",
    x: 720,
    y: 340,
    width: 180,
    accent: "purple",
  },
]

const CONNECTIONS: readonly EdgeConn[] = [
  { from: "node-main-term", to: "node-term1" },
  { from: "node-main-term", to: "node-term4" },
  { from: "node-term1", to: "node-term2" },
  { from: "node-term2", to: "node-browser" },
  { from: "node-term4", to: "node-browser" },
]

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
  addNode(kind: NodeKind, shell?: string): void
  removeNode(id: string): void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [nodes, setNodes] = useState<readonly CanvasNode[]>(INITIAL_NODES)
  const [selectedId, setSelectedId] = useState<string | null>("node-main-term")
  const [rightTab, setRightTab] = useState<RightTab>("files")
  const [bottomTab, setBottomTab] = useState<BottomTab>("logs")
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true)
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [overlay, setOverlay] = useState<OverlayKind>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [nodeCounter, setNodeCounter] = useState(0)

  const selectNode = useCallback((id: string) => {
    setSelectedId(id)
    setNodes((prev) => prev.map((n) => ({ ...n, selected: n.id === id })))
  }, [])

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)))
  }, [])

  const addNode = useCallback(
    (kind: NodeKind, shell?: string) => {
      const next = nodeCounter + 1
      setNodeCounter(next)
      const id = `node-new-${next}`
      const x = 200 + Math.random() * 300
      const y = 150 + Math.random() * 200
      const node: CanvasNode =
        kind === "terminal"
          ? {
              id,
              kind: "terminal",
              label: shell && shell.length > 0 ? `Terminal (${shell})` : "Terminal",
              x,
              y,
              width: 240,
              accent: "accent",
              shell: shell && shell.length > 0 ? shell : undefined,
              lines: [{ prompt: "$", cursor: true }],
            }
          : kind === "browser"
            ? {
                id,
                kind: "browser",
                label: "Browser",
                x,
                y,
                width: 280,
                accent: "red",
                url: "about:blank",
              }
            : {
                id,
                kind: "map",
                label: "Map",
                x,
                y,
                width: 180,
                accent: "purple",
              }
      setNodes((prev) => [...prev, node])
      setContextMenu(null)
    },
    [nodeCounter],
  )

  const removeNode = useCallback((id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }, [])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      nodes,
      connections: CONNECTIONS,
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
    }),
    [
      nodes,
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
