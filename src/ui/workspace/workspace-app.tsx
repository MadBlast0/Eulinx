import { useEffect, useState, type ComponentType } from "react"
import { ArrowLeft } from "lucide-react"
import "./workspace.css"
import { WorkspaceProvider, useWorkspace } from "./use-workspace"
import { ProjectsProvider } from "./use-projects"
import { MemoryProvider } from "./memory-store"
import { RuntimeProvider } from "./runtime-store"
import { SessionsProvider } from "./sessions-store"
import { PromptsProvider } from "./prompts-store"
import { SettingsProvider } from "./settings-store"
import { WorkersProvider } from "./workers-store"
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
} from "./surfaces"
import { ToolbarButton } from "./primitives"
import { KeymapProvider, useCommand } from "./keyboard/use-keyboard"

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
}

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

  const [surface, setSurface] = useState<SurfaceKey | null>(null)

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && surface) {
        e.preventDefault()
        setSurface(null)
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [surface])

  const cols = [
    leftSidebarOpen ? "var(--wsx-left-w)" : "0px",
    "1fr",
    rightSidebarOpen ? "var(--wsx-right-w)" : "0px",
  ].join(" ")

  const ActiveSurface = surface ? SURFACES[surface] : null

  return (
    <div
      className="wsx grid"
      style={{
        gridTemplateColumns: cols,
        gridTemplateRows: "var(--wsx-topbar-h) 1fr var(--wsx-statusbar-h)",
        gridTemplateAreas: `"topbar topbar topbar" "left center right" "status status status"`,
        height: "100vh",
      }}
    >
      <div style={{ gridArea: "topbar" }}>
        <TopBar />
      </div>

      <div style={{ gridArea: "left", overflow: "hidden" }}>
        {leftSidebarOpen && (
          <LeftSidebar
            activeSurface={surface}
            onOpenSurface={(key) => setSurface(key)}
          />
        )}
      </div>

      <div
        style={{ gridArea: "center" }}
        className="flex flex-col overflow-hidden"
      >
        {ActiveSurface ? (
          <div className="relative flex h-full flex-col overflow-hidden bg-[color:var(--Eulinx-color-background)]">
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
            <Canvas />
            <BottomPanel />
          </>
        )}
      </div>

      <div style={{ gridArea: "right", overflow: "hidden" }}>
        {rightSidebarOpen && <RightSidebar />}
      </div>

      <div style={{ gridArea: "status" }}>
        <StatusBar />
      </div>

      <Overlays />
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
                    <CostProvider>
                      <KeymapProvider>
                        <WorkspaceShell />
                      </KeymapProvider>
                    </CostProvider>
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

