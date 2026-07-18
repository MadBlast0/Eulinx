/**
 * P18-UI-DASH — Workspace Layout Shell
 *
 * The top-level window shell: region model, resizable panes, focus model.
 * Every surface mounts inside this shell.
 * From WorkspaceLayout-Part01 through Part06.
 */

import { useEffect, type ReactNode } from "react"
import { useLayoutStore, REGION_CONSTRAINTS, type RegionId, type SizableRegionId } from "@/stores/layout-store"
import { layout as layoutTokens } from "@/ui/tokens/design-tokens"

interface WorkspaceLayoutProps {
  readonly titleBar?: ReactNode
  readonly sidebar?: ReactNode
  readonly canvas?: ReactNode
  readonly inspector?: ReactNode
  readonly panel?: ReactNode
  readonly statusBar?: ReactNode
}

export function WorkspaceLayout({
  titleBar,
  sidebar,
  canvas,
  inspector,
  panel,
  statusBar,
}: WorkspaceLayoutProps) {
  const { layout, isLoading, setLayout, updateRegion, setFocusedRegion } = useLayoutStore()

  // Initialize layout on mount
  useEffect(() => {
    if (!layout) {
      setLayout(createDefaultLayout("default"))
    }
  }, [layout, setLayout])

  if (isLoading || !layout) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading workspace...</div>
      </div>
    )
  }

  const { regions } = layout
  const containerWidth = typeof window !== "undefined" ? window.innerWidth : 1280

  // Compute derived canvas size
  const sidebarWidth = regions.sidebar.collapsed
    ? REGION_CONSTRAINTS.sidebar.railSize
    : regions.sidebar.size
  const inspectorWidth = regions.inspector.collapsed ? 0 : regions.inspector.size
  const splitterCount = (regions.sidebar.visible ? 1 : 0) + (regions.inspector.visible ? 1 : 0) + (regions.panel.visible ? 1 : 0)
  const splitterTotal = splitterCount * layoutTokens.splitter.size

  const canvasWidth = Math.max(
    REGION_CONSTRAINTS.canvas.minSize,
    containerWidth - sidebarWidth - inspectorWidth - splitterTotal,
  )

  const handleRegionClick = (id: RegionId) => {
    setFocusedRegion(id)
  }

  const handleSplitterDrag = (regionId: SizableRegionId, delta: number) => {
    const region = regions[regionId]
    const constraints = REGION_CONSTRAINTS[regionId]
    const axis = constraints.axis
    const deltaValue = axis === "width" ? delta : delta
    const newSize = Math.max(constraints.minSize, Math.min(constraints.maxSize, region.size + deltaValue))
    updateRegion(regionId, { size: newSize })
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      {/* Title Bar */}
      <div
        className="flex shrink-0 items-center border-b"
        style={{ height: layoutTokens.titleBar.height }}
        onClick={() => handleRegionClick("titleBar")}
      >
        {titleBar ?? <DefaultTitleBar />}
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {regions.sidebar.visible && !regions.sidebar.collapsed && (
          <>
            <div
              className="shrink-0 overflow-y-auto border-r"
              style={{ width: regions.sidebar.size }}
              onClick={() => handleRegionClick("sidebar")}
            >
              {sidebar ?? <DefaultSidebar />}
            </div>
            <Splitter
              direction="horizontal"
              onDrag={(delta) => handleSplitterDrag("sidebar", delta)}
            />
          </>
        )}

        {/* Rail (collapsed sidebar) */}
        {regions.sidebar.visible && regions.sidebar.collapsed && (
          <div
            className="flex shrink-0 flex-col items-center border-r py-2"
            style={{ width: REGION_CONSTRAINTS.sidebar.railSize }}
          >
            <button
              className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent"
              onClick={() => useLayoutStore.getState().expandRegion("sidebar")}
              title="Expand sidebar"
            >
              <span className="text-xs">▶</span>
            </button>
          </div>
        )}

        {/* Canvas */}
        <div
          className="flex flex-1 flex-col overflow-hidden"
          style={{ width: canvasWidth }}
          onClick={() => handleRegionClick("canvas")}
        >
          {/* Tab strip */}
          <div className="flex h-8 shrink-0 items-center gap-1 border-b px-2">
            {layout.canvasTabs.tabs.map((tab) => (
              <button
                key={tab.tabId}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  tab.tabId === layout.canvasTabs.activeTabId
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50"
                }`}
                onClick={() => useLayoutStore.getState().setActiveTab(tab.tabId)}
              >
                {tab.title}
                {!tab.pinned && (
                  <span
                    className="ml-1 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation()
                      useLayoutStore.getState().removeTab(tab.tabId)
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {canvas}
          </div>
        </div>

        {/* Inspector */}
        {regions.inspector.visible && !regions.inspector.collapsed && (
          <>
            <Splitter
              direction="horizontal"
              onDrag={(delta) => handleSplitterDrag("inspector", -delta)}
            />
            <div
              className="shrink-0 overflow-y-auto border-l"
              style={{ width: regions.inspector.size }}
              onClick={() => handleRegionClick("inspector")}
            >
              {inspector ?? <DefaultInspector />}
            </div>
          </>
        )}

        {/* Panel (bottom) */}
        {regions.panel.visible && !regions.panel.collapsed && (
          <div className="absolute bottom-6 left-0 right-0 border-t" style={{ height: regions.panel.size }}>
            <Splitter
              direction="vertical"
              onDrag={(delta) => handleSplitterDrag("panel", -delta)}
            />
            <div
              className="h-full overflow-y-auto"
              onClick={() => handleRegionClick("panel")}
            >
              {panel ?? <DefaultPanel />}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div
        className="flex shrink-0 items-center border-t px-3"
        style={{ height: layoutTokens.statusBar.height }}
        onClick={() => handleRegionClick("statusBar")}
      >
        {statusBar ?? <DefaultStatusBar />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Default Region Content
// ---------------------------------------------------------------------------

function DefaultTitleBar() {
  return (
    <div className="flex h-full items-center justify-between px-4">
      <span className="text-sm font-semibold">Eulinx</span>
      <span className="text-xs text-muted-foreground">Workspace</span>
    </div>
  )
}

function DefaultSidebar() {
  return <div className="p-3 text-sm text-muted-foreground">Sidebar</div>
}

function DefaultInspector() {
  return <div className="p-3 text-sm text-muted-foreground">Inspector</div>
}

function DefaultPanel() {
  return <div className="p-3 text-sm text-muted-foreground">Panel</div>
}

function DefaultStatusBar() {
  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span>0 workers</span>
      <span>0 sessions</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Splitter
// ---------------------------------------------------------------------------

function Splitter({
  direction,
  onDrag,
}: {
  readonly direction: "horizontal" | "vertical"
  readonly onDrag: (delta: number) => void
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    const startPos = direction === "horizontal" ? e.clientX : e.clientY

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === "horizontal" ? e.clientX : e.clientY
      onDrag(currentPos - startPos)
    }

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      className={`shrink-0 cursor-col-resize bg-border/50 hover:bg-border transition-colors ${
        direction === "horizontal" ? "w-1" : "h-1"
      }`}
      onMouseDown={handleMouseDown}
    />
  )
}

// ---------------------------------------------------------------------------
// Default Layout Factory
// ---------------------------------------------------------------------------

function createDefaultLayout(workspaceId: string) {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    workspaceId,
    regions: {
      titleBar: { id: "titleBar" as const, visible: true, collapsed: false, size: 36, restoreSize: 36 },
      sidebar: { id: "sidebar" as const, visible: true, collapsed: false, size: 240, restoreSize: 240 },
      canvas: { id: "canvas" as const, visible: true, collapsed: false, size: 0, restoreSize: 0 },
      inspector: { id: "inspector" as const, visible: true, collapsed: false, size: 320, restoreSize: 320 },
      panel: { id: "panel" as const, visible: true, collapsed: false, size: 220, restoreSize: 220 },
      statusBar: { id: "statusBar" as const, visible: true, collapsed: false, size: 24, restoreSize: 24 },
    },
    canvasTabs: {
      tabs: [{ tabId: "graph", kind: "graph" as const, title: "Graph", subjectId: null, pinned: true }],
      activeTabId: "graph",
      mruOrder: ["graph"],
    },
    focus: { focusedRegion: "canvas" as const, previousRegion: null, focusVisible: false },
    lastWindowSize: { width: 1280, height: 720 },
    updatedAt: now,
  }
}
