import React, { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import "./workspace.css"
import { cn } from "@/utils/cn"
import { useWorkspace } from "./use-workspace"
import { ProjectsProvider, useProjects } from "./use-projects"
import { GlobalProviders, ProjectDataProviders } from "./merged-providers"
import { TopBar } from "./top-bar"
import { Toolbar } from "./workspace-toolbar"
import { LeftSidebar } from "./left-sidebar"
import { Canvas } from "./canvas"
import { BottomPanel } from "./bottom-panel"
import { RightSidebar } from "./right-sidebar"
const KnowledgeWorkspace = React.lazy(() =>
  import("./knowledge-workspace").then((m) => ({ default: m.KnowledgeWorkspace })),
)
import { StatusBar } from "./status-bar"
import { Overlays } from "./overlays"
const Dashboard = React.lazy(() => import("./surfaces/dashboard"))
const Settings = React.lazy(() => import("./surfaces/settings"))
const MemoryBrowser = React.lazy(() => import("./surfaces/memory-browser"))
const WorkerExplorer = React.lazy(() => import("./surfaces/worker-explorer"))
const SessionViewer = React.lazy(() => import("./surfaces/session-viewer"))
const RuntimeMonitor = React.lazy(() => import("./surfaces/runtime-monitor"))
const CostDashboard = React.lazy(() => import("./surfaces/cost-dashboard"))
const Metrics = React.lazy(() => import("./surfaces/metrics"))
const PromptInspector = React.lazy(() => import("./surfaces/prompt-inspector"))
const PluginManager = React.lazy(() => import("./surfaces/plugin-manager"))
const TaskBoard = React.lazy(() => import("./surfaces/task-board"))
const TemplateGallery = React.lazy(() => import("./surfaces/template-gallery"))

const UnifiedSearch = React.lazy(() => import("./canvas-views/panels/unified-search"))
const WorkspaceDashboard = React.lazy(() => import("./canvas-views/panels/workspace-dashboard"))
const MemoryGraph = React.lazy(() => import("./canvas-views/panels/memory-graph"))
const KnowledgeGraph = React.lazy(() => import("./canvas-views/panels/knowledge-graph"))
const CausalTrace = React.lazy(() => import("./canvas-views/panels/causal-trace"))
const SessionTimeline = React.lazy(() => import("./canvas-views/panels/session-timeline"))
const VectorExplorer = React.lazy(() => import("./canvas-views/panels/vector-explorer"))
const QueryPlayground = React.lazy(() => import("./canvas-views/panels/query-playground"))

import { useCommand } from "./keyboard/use-keyboard"
import { EventBridge } from "./event-bridge"
import { StateBridge } from "./state-bridge"
import { useLayout, type RegionId } from "./layout-state"
import { PaneDivider } from "./pane-divider"

import { saveLayout, loadLayout } from "./layout-persistence"

export type SurfaceKey =
  | "dashboard"
  | "settings"
  | "memory"
  | "workers"
  | "sessions"
  | "runtime"
  | "cost"
  | "metrics"
  | "prompts"
  | "plugins"
  | "tasks"
  | "templates"
  | "helix-search"
  | "helix-dashboard"
  | "helix-memory-graph"
  | "helix-knowledge-graph"
  | "helix-causal-trace"
  | "helix-session-timeline"
  | "helix-vector-explorer"
  | "helix-query-playground"
  | "knowledge"

const SURFACES: Record<SurfaceKey, React.LazyExoticComponent<React.ComponentType>> = {
  dashboard: Dashboard,
  settings: Settings,
  memory: MemoryBrowser,
  workers: WorkerExplorer,
  sessions: SessionViewer,
  runtime: RuntimeMonitor,
  cost: CostDashboard,
  metrics: Metrics,
  prompts: PromptInspector,
  plugins: PluginManager,
  tasks: TaskBoard,
  templates: TemplateGallery,
  "helix-search": UnifiedSearch,
  "helix-dashboard": WorkspaceDashboard,
  "helix-memory-graph": MemoryGraph,
  "helix-knowledge-graph": KnowledgeGraph,
  "helix-causal-trace": CausalTrace,
  "helix-session-timeline": SessionTimeline,
  "helix-vector-explorer": VectorExplorer,
  "helix-query-playground": QueryPlayground,
  knowledge: KnowledgeWorkspace,
}

const DIVIDER_WIDTH = 1

function WorkspaceShell() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    bottomPanelOpen,
    setBottomPanelOpen,
    setOverlay,
    selectedId,
    removeNode,
    toggleLeftSidebar,
    toggleRightSidebar,
    addNode,
    autoLayout,
  } = useWorkspace()

  const {
    layout,
    focusedRegion,
    setRegionDelta,
    bulkSetLayout,
    setFocusedRegion,
  } = useLayout()

  const workspaceIdRef = useRef("default")
  const loadedRef = useRef(false)

  const [surface, setSurface] = useState<SurfaceKey | null>(null)

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    const saved = loadLayout(workspaceIdRef.current)
    if (saved && saved.schema === 1) {
      bulkSetLayout(saved)
    }
  }, [bulkSetLayout])

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!loadedRef.current) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveLayout(workspaceIdRef.current, layout)
    }, 300)
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [layout])

  useCommand("palette.open", () => setOverlay("cmd"))
  useCommand("app.showHelp", () => setOverlay("shortcuts"))
  useCommand("app.openSettings", () => setOverlay("settings"))
  useCommand("view.toggleLeftSidebar", () => toggleLeftSidebar())
  useCommand("view.toggleRightSidebar", () => toggleRightSidebar())
  useCommand("view.toggleBottomPanel", () => setBottomPanelOpen(!bottomPanelOpen))
  useCommand("node.delete", () => {
    if (selectedId) removeNode(selectedId)
  })
  useCommand("surface.dashboard", () => setSurface("dashboard"))
  useCommand("surface.memory", () => setSurface("memory"))
  useCommand("surface.workers", () => setSurface("workers"))
  useCommand("surface.sessions", () => setSurface("sessions"))
  useCommand("surface.runtime", () => setSurface("runtime"))
  useCommand("surface.cost", () => setSurface("cost"))
  useCommand("surface.metrics", () => setSurface("metrics"))
  useCommand("surface.prompts", () => setSurface("prompts"))
  useCommand("surface.plugins", () => setSurface("plugins"))
  useCommand("surface.tasks", () => setSurface("tasks"))
  useCommand("surface.templates", () => setSurface("templates"))
  useCommand("surface.helix-search", () => setSurface("helix-search"))
  useCommand("surface.helix-dashboard", () => setSurface("helix-dashboard"))
  useCommand("surface.helix-memory-graph", () => setSurface("helix-memory-graph"))
  useCommand("surface.helix-knowledge-graph", () => setSurface("helix-knowledge-graph"))
  useCommand("surface.helix-causal-trace", () => setSurface("helix-causal-trace"))
  useCommand("surface.helix-session-timeline", () => setSurface("helix-session-timeline"))
  useCommand("surface.helix-vector-explorer", () => setSurface("helix-vector-explorer"))
  useCommand("surface.helix-query-playground", () => setSurface("helix-query-playground"))
  useCommand("surface.knowledge", () => setSurface("knowledge"))

  // Navigation — focus cycling
  const REGION_ORDER: RegionId[] = ["sidebar", "canvas", "inspector", "panel"]
  useCommand("app.focusNext", () => {
    const idx = Math.max(0, REGION_ORDER.indexOf(focusedRegion))
    const next = REGION_ORDER[(idx + 1) % REGION_ORDER.length]
    if (!next) return
    setFocusedRegion(next)
    const el = document.querySelector(`[data-region="${next}"]`)
    if (el instanceof HTMLElement) el.focus()
  })
  useCommand("app.focusPrevious", () => {
    const idx = Math.max(0, REGION_ORDER.indexOf(focusedRegion))
    const prev = REGION_ORDER[(idx - 1 + REGION_ORDER.length) % REGION_ORDER.length]
    if (!prev) return
    setFocusedRegion(prev)
    const el = document.querySelector(`[data-region="${prev}"]`)
    if (el instanceof HTMLElement) el.focus()
  })

  // Navigation — close surface
  useCommand("app.closeTab", () => {
    if (surface) setSurface(null)
  })

  // Graph — add nodes
  useCommand("node.addTerminal", () => addNode("terminal"))
  useCommand("node.addBrowser", () => addNode("browser"))
  useCommand("node.addWorker", () => addNode("worker"))
  useCommand("terminal.new", () => addNode("terminal"))
  useCommand("workers.spawn", () => addNode("worker"))

  // Graph — layout
  useCommand("graph.autoLayout", () => autoLayout())
  useCommand("graph.zoomToFit", () => {
    window.dispatchEvent(new CustomEvent("eulinx:graph-fit-view"))
  })

  // Workflow
  useCommand("workflow.run", () => {
    window.dispatchEvent(new CustomEvent("eulinx:workflow-run"))
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && surface) {
        e.preventDefault()
        setSurface(null)
      }
      if (e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) {
        const map: Record<string, RegionId> = {
          "1": "sidebar",
          "2": "canvas",
          "3": "inspector",
          "4": "panel",
        }
        const region = map[e.key]
        if (region) {
          e.preventDefault()
          setFocusedRegion(region)
          const el = document.querySelector(`[data-region="${region}"]`)
          if (el instanceof HTMLElement) el.focus()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [surface, setFocusedRegion])

  const sidebarRegion = layout.regions.sidebar
  const inspectorRegion = layout.regions.inspector
  const panelRegion = layout.regions.panel
  const statusBarRegion = layout.regions.statusBar

  const sidebarVisible = leftSidebarOpen && !sidebarRegion.collapsed
  const inspectorVisible = rightSidebarOpen && !inspectorRegion.collapsed
  const panelVisible = bottomPanelOpen && !panelRegion.collapsed

  const sidebarSize = sidebarVisible ? sidebarRegion.size : 0
  const inspectorSize = inspectorVisible ? inspectorRegion.size : 0
  const panelSize = panelVisible ? panelRegion.size : 0

  const handleSidebarResize = useCallback(
    (delta: number) => {
      setRegionDelta("sidebar", delta)
    },
    [setRegionDelta],
  )

  const handleInspectorResize = useCallback(
    (delta: number) => {
      setRegionDelta("inspector", -delta)
    },
    [setRegionDelta],
  )

  const handlePanelResize = useCallback(
    (delta: number) => {
      setRegionDelta("panel", -delta)
    },
    [setRegionDelta],
  )

  const handleFocusRegion = useCallback(
    (region: RegionId) => () => {
      setFocusedRegion(region)
    },
    [setFocusedRegion],
  )

  const ActiveSurface = surface ? SURFACES[surface] : null

  const cols = [
    sidebarVisible ? `${sidebarSize}px` : "0px",
    sidebarVisible ? `${DIVIDER_WIDTH}px` : "0px",
    "1fr",
    inspectorVisible ? `${DIVIDER_WIDTH}px` : "0px",
    inspectorVisible ? `${inspectorSize}px` : "0px",
  ].join(" ")

  return (
    <div
      className="wsx"
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        gridTemplateRows: [
          "var(--wsx-topbar-h)",
          "38px",
          "1fr",
          `${statusBarRegion.size}px`,
        ].join(" "),
        gridTemplateAreas: [
          `"topbar topbar topbar topbar topbar"`,
          `"left div-l toolbar div-r right"`,
          `"left div-l center div-r right"`,
          `"status status status status status"`,
        ].join(" "),
        height: "100vh",
      }}
    >
      <div
        style={{ gridArea: "topbar" }}
        data-region="titleBar"
        tabIndex={-1}
        onFocus={handleFocusRegion("titleBar")}
        className={focusedRegion === "titleBar" ? "wsx-focused" : ""}
      >
        <TopBar />
      </div>

      <div
        style={{ gridArea: "toolbar" }}
        data-region="toolbar"
        tabIndex={-1}
      >
        <Toolbar />
      </div>

      <div
        style={{
          gridArea: "left",
          overflow: "hidden",
        }}
        data-region="sidebar"
        tabIndex={-1}
        onFocus={handleFocusRegion("sidebar")}
        className={focusedRegion === "sidebar" ? "wsx-focused" : ""}
      >
        {sidebarVisible && (
          <LeftSidebar
            activeSurface={surface}
            onOpenSurface={(key) => setSurface(key)}
          />
        )}
      </div>

      {sidebarVisible && (
        <div style={{ gridArea: "div-l", height: "100%" }}>
          <PaneDivider direction="vertical" onResize={handleSidebarResize} />
        </div>
      )}

      <div
        style={{ gridArea: "center", overflow: "hidden" }}
        className="flex flex-col"
      >
        {ActiveSurface ? (
          <div
            className={cn(
              "relative flex h-full flex-col overflow-hidden bg-[color:var(--Eulinx-color-background)]",
              focusedRegion === "canvas" && "wsx-focused",
            )}
            data-region="canvas"
            tabIndex={-1}
            onFocus={handleFocusRegion("canvas")}
          >
            <div className="absolute left-3 top-3 z-[1]">
              <button
                type="button"
                aria-label="Back to canvas"
                onClick={() => setSurface(null)}
                className="flex items-center gap-1.5 rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] px-2.5 py-1.5 text-[13px] font-medium text-[color:var(--Eulinx-color-text)] shadow-[var(--Eulinx-elev-sm)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--Eulinx-color-accent)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
                Back
              </button>
            </div>
            <div className="flex-1 overflow-auto pl-[90px]">
              <React.Suspense fallback={null}>
                <ActiveSurface />
              </React.Suspense>
            </div>
          </div>
        ) : (
          <>
            <div
              className={cn(
                "flex flex-1 flex-col overflow-hidden",
                focusedRegion === "canvas" && "wsx-focused",
              )}
              data-region="canvas"
              tabIndex={-1}
              onFocus={handleFocusRegion("canvas")}
            >
              <Canvas />
            </div>
            {panelVisible && (
              <>
                <PaneDivider direction="horizontal" onResize={handlePanelResize} />
                <div
                  style={{ height: panelSize, flexShrink: 0 }}
                  data-region="panel"
                  tabIndex={-1}
                  onFocus={handleFocusRegion("panel")}
                  className={focusedRegion === "panel" ? "wsx-focused" : ""}
                >
                  <BottomPanel />
                </div>
              </>
            )}
          </>
        )}
      </div>

      {inspectorVisible && (
        <div style={{ gridArea: "div-r", height: "100%" }}>
          <PaneDivider direction="vertical" onResize={handleInspectorResize} />
        </div>
      )}

      <div
        style={{ gridArea: "right", overflow: "hidden" }}
        data-region="inspector"
        tabIndex={-1}
        onFocus={handleFocusRegion("inspector")}
        className={focusedRegion === "inspector" ? "wsx-focused" : ""}
      >
        {inspectorVisible && <RightSidebar />}
      </div>

      <div
        style={{ gridArea: "status" }}
        data-region="statusBar"
        tabIndex={-1}
        onFocus={handleFocusRegion("statusBar")}
      >
        <StatusBar />
      </div>

      <Overlays />
      <EventBridge />
      <StateBridge />
    </div>
  )
}

/**
 * Wraps project-scoped providers with a key={activeProjectId} so they
 * fully remount (and reset their state) when the user switches projects.
 */
function ProjectScope({ children }: { children: React.ReactNode }) {
  const { activeProjectId } = useProjects()
  return <div key={activeProjectId}>{children}</div>
}

export function WorkspaceApp() {
  return (
    <ProjectsProvider>
      <GlobalProviders>
        <ProjectScope>
          <ProjectDataProviders>
            <WorkspaceShell />
          </ProjectDataProviders>
        </ProjectScope>
      </GlobalProviders>
    </ProjectsProvider>
  )
}
