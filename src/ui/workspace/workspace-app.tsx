import { useCallback, useEffect, useRef, useState, type ComponentType } from "react"
import { ArrowLeft } from "lucide-react"
import "./workspace.css"
import { cn } from "@/utils/cn"
import { WorkspaceProvider, useWorkspace } from "./use-workspace"
import { ProjectsProvider } from "./use-projects"
import { MemoryProvider } from "./memory-store"
import { RuntimeProvider } from "./runtime-store"
import { SessionsProvider } from "./sessions-store"
import { PromptsProvider } from "./prompts-store"
import { SettingsProvider } from "./settings-store"
import { WorkersProvider } from "./workers-store"
import { TasksProvider } from "./tasks-store"
import { TemplatesProvider } from "./templates-store"
import { CostProvider } from "./cost-store"
import { TopBar } from "./top-bar"
import { LeftSidebar } from "./left-sidebar"
import { Canvas } from "./canvas"
import { BottomPanel } from "./bottom-panel"
import { RightSidebar } from "./right-sidebar"
import { StatusBar } from "./status-bar"
import { Overlays } from "./overlays"
import {
  Dashboard,
  Settings,
  MemoryBrowser,
  WorkerExplorer,
  SessionViewer,
  RuntimeMonitor,
  CostDashboard,
  Metrics,
  PromptInspector,
  PluginManager,
} from "./surfaces"
import { ToolbarButton } from "./primitives"
import { KeymapProvider, useCommand } from "./keyboard/use-keyboard"
import { PluginsProvider } from "./plugins-store"
import { EventBridge } from "./event-bridge"
import { StateBridge } from "./state-bridge"
import { LayoutProvider, useLayout, type RegionId } from "./layout-state"
import { PaneDivider } from "./pane-divider"
import { CanvasTabStrip } from "./canvas-tab-strip"
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

const SURFACES: Record<SurfaceKey, ComponentType> = {
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
}

const DIVIDER_WIDTH = 5

function WorkspaceShell() {
  const {
    leftSidebarOpen,
    rightSidebarOpen,
    setOverlay,
    selectedId,
    removeNode,
    toggleLeftSidebar,
    toggleRightSidebar,
  } = useWorkspace()

  const {
    layout,
    focusedRegion,
    setRegionSize,
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
  const titleBarRegion = layout.regions.titleBar

  const sidebarVisible = leftSidebarOpen && !sidebarRegion.collapsed
  const inspectorVisible = rightSidebarOpen && !inspectorRegion.collapsed
  const panelVisible = !panelRegion.collapsed

  const sidebarSize = sidebarVisible ? sidebarRegion.size : 0
  const inspectorSize = inspectorVisible ? inspectorRegion.size : 0
  const panelSize = panelVisible ? panelRegion.size : 0

  const handleSidebarResize = useCallback(
    (delta: number) => {
      setRegionSize("sidebar", sidebarRegion.size + delta)
    },
    [setRegionSize, sidebarRegion.size],
  )

  const handleInspectorResize = useCallback(
    (delta: number) => {
      setRegionSize("inspector", inspectorRegion.size - delta)
    },
    [setRegionSize, inspectorRegion.size],
  )

  const handlePanelResize = useCallback(
    (delta: number) => {
      setRegionSize("panel", panelRegion.size + delta)
    },
    [setRegionSize, panelRegion.size],
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
          `${titleBarRegion.size}px`,
          "1fr",
          `${statusBarRegion.size}px`,
        ].join(" "),
        gridTemplateAreas: [
          `"topbar topbar topbar topbar topbar"`,
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
        <div style={{ gridArea: "div-l" }}>
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
              <ToolbarButton
                tip="Back to canvas"
                aria-label="Back to canvas"
                title="Back to canvas"
                onClick={() => setSurface(null)}
              >
                <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
              </ToolbarButton>
            </div>
            <ActiveSurface />
          </div>
        ) : (
          <>
            <CanvasTabStrip />
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
        <div style={{ gridArea: "div-r" }}>
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

export function WorkspaceApp() {
  return (
    <ProjectsProvider>
      <MemoryProvider>
        <RuntimeProvider>
          <SessionsProvider>
            <PromptsProvider>
              <WorkspaceProvider>
                <SettingsProvider>
                  <WorkersProvider>
                    <TasksProvider>
                      <TemplatesProvider>
                        <CostProvider>
                          <PluginsProvider>
                          <KeymapProvider>
                            <LayoutProvider>
                              <WorkspaceShell />
                            </LayoutProvider>
                          </KeymapProvider>
                          </PluginsProvider>
                        </CostProvider>
                      </TemplatesProvider>
                    </TasksProvider>
                  </WorkersProvider>
                </SettingsProvider>
              </WorkspaceProvider>
            </PromptsProvider>
          </SessionsProvider>
        </RuntimeProvider>
      </MemoryProvider>
    </ProjectsProvider>
  )
}
