import { Component, type ReactNode, useState } from "react"
import {
  Activity,
  FolderOpen,
  GitBranch,
  Info,
  PanelRight,
  Plus,
  Search,
  Settings,
  TerminalSquare,
  Upload,
} from "lucide-react"
import { ThemeProvider } from "@/ui/tokens/theme-provider"
import { MotionProvider } from "@/ui/animations"
import { LiveRegionAnnouncer } from "@/a11y/live-region"
import { FocusRingProvider } from "@/a11y/focus-ring"
import { KeymapProvider } from "@/ui/keyboard/use-keyboard"
import { ResponsiveProvider } from "@/ui/responsive/responsive-provider"
import { WorkspaceLayout, CanvasSurface } from "@/ui/layout/workspace-layout"
import { PanelProvider, PanelHost } from "@/ui/panels"
import { SidebarProvider, Sidebar, type SidebarData } from "@/ui/sidebar"
import { NodeGraphProvider } from "@/ui/node-graph"
import { TerminalProvider } from "@/ui/terminal"
import { TerminalCardsProvider, createMockSource } from "@/ui/terminal-cards"
import { WelcomeScreen } from "@/ui/surface/welcome-screen"
import { CanvasView } from "@/ui/surface/canvas-view"
import type { TerminalCardSource } from "@/ui/terminal-cards/subscription"

const EMPTY_SIDEBAR_DATA: SidebarData = {
  workspaces: [],
  activeWorkspaceId: null,
  activeProjectId: null,
  rootNodes: [],
  loadChildren: async () => [],
  workers: [],
  workflows: [],
  sessions: [],
}

const DEMO_SOURCE: TerminalCardSource = createMockSource()

class Boundary extends Component<
  { children: ReactNode; label: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 8, color: "red", background: "#111", fontSize: 12, whiteSpace: "pre-wrap" as const }}>
          <b>{this.props.label}:</b> {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  const [hasProject, setHasProject] = useState(false)

  return (
    <Boundary label="ThemeProvider">
      <ThemeProvider>
        <MotionProvider>
          <LiveRegionAnnouncer>
            <FocusRingProvider>
              <KeymapProvider>
                <ResponsiveProvider>
                  <Boundary label="TerminalProvider">
                    <TerminalProvider>
                      <Boundary label="NodeGraphProvider">
                        <NodeGraphProvider>
                          <Boundary label="TerminalCardsProvider">
                            <TerminalCardsProvider source={DEMO_SOURCE} workerIds={[]}>
                              <Boundary label="PanelProvider">
                                <PanelProvider workspaceId="default">
                                  <Boundary label="SidebarProvider">
                                    <SidebarProvider data={EMPTY_SIDEBAR_DATA}>
                                      <Boundary label="WorkspaceLayout">
                                        <WorkspaceLayout
                                          mode={hasProject ? "workspace" : "welcome"}
                                          sidebar={
                                            hasProject ? (
                                              <Sidebar
                                                onNavigate={() => {}}
                                                onSwitchWorkspace={() => {}}
                                                onOpenPalette={() => {}}
                                              />
                                            ) : (
                                              <StartSidebar
                                                onOpenFolder={() => setHasProject(true)}
                                                onCreateProject={() => setHasProject(true)}
                                                onImportProject={() => setHasProject(true)}
                                              />
                                            )
                                          }
                                          inspector={
                                            hasProject ? <div className="flex h-full flex-col bg-[color:var(--Eulinx-color-surface)]">
                                              <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
                                                <PanelRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                                                <h3 className="text-sm font-semibold text-foreground">Inspector</h3>
                                              </div>
                                              <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 text-sm text-muted-foreground">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground">
                                                  <Info className="h-5 w-5" aria-hidden />
                                                </div>
                                                <div className="space-y-1">
                                                  <p className="font-medium text-foreground">Nothing selected</p>
                                                  <p className="leading-5">Select a node, worker, or workflow to view its details.</p>
                                                </div>
                                              </div>
                                            </div> : undefined
                                          }
                                          panel={
                                            hasProject ? <PanelHost
                                              emptyState={
                                                <div className="flex h-full w-full items-center justify-center gap-8 px-6 text-xs text-muted-foreground">
                                                  <span className="inline-flex items-center gap-2">
                                                    <TerminalSquare className="h-4 w-4" aria-hidden />
                                                    Terminal
                                                  </span>
                                                  <span className="inline-flex items-center gap-2">
                                                    <Activity className="h-4 w-4" aria-hidden />
                                                    Logs
                                                  </span>
                                                  <span className="inline-flex items-center gap-2">
                                                    <GitBranch className="h-4 w-4" aria-hidden />
                                                    Runs
                                                  </span>
                                                </div>
                                              }
                                            /> : undefined
                                          }
                                        >
                                          <CanvasSurface>
                                            {hasProject ? (
                                              <CanvasView hasNodes={false} onAddNode={() => {}}>
                                                <div />
                                              </CanvasView>
                                            ) : (
                                              <WelcomeScreen
                                                onOpenFolder={() => setHasProject(true)}
                                                onCreateProject={() => setHasProject(true)}
                                                onImportProject={() => setHasProject(true)}
                                                onOpenRecent={() => setHasProject(true)}
                                              />
                                            )}
                                          </CanvasSurface>
                                        </WorkspaceLayout>
                                      </Boundary>
                                    </SidebarProvider>
                                  </Boundary>
                                </PanelProvider>
                              </Boundary>
                            </TerminalCardsProvider>
                          </Boundary>
                        </NodeGraphProvider>
                      </Boundary>
                    </TerminalProvider>
                  </Boundary>
                </ResponsiveProvider>
              </KeymapProvider>
            </FocusRingProvider>
          </LiveRegionAnnouncer>
        </MotionProvider>
      </ThemeProvider>
    </Boundary>
  )
}

export default App

function StartSidebar({
  onOpenFolder,
  onCreateProject,
  onImportProject,
}: {
  onOpenFolder: () => void
  onCreateProject: () => void
  onImportProject: () => void
}) {
  return (
    <nav className="flex h-full min-h-0 flex-col bg-[color:var(--Eulinx-color-sidebar-bg)]">
      <div className="border-b border-border px-4 py-4">
        <div className="text-sm font-semibold text-foreground">Eulinx</div>
        <div className="mt-1 text-xs leading-5 text-muted-foreground">Start a workspace to build and run AI workflows.</div>
      </div>

      <div className="border-b border-border p-3">
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-md border border-border px-3 text-left text-sm text-muted-foreground"
        >
          <Search className="h-4 w-4" aria-hidden />
          Search
          <kbd className="ml-auto rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Ctrl K</kbd>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3">
        <StartAction icon={<FolderOpen className="h-4 w-4" />} label="Open Folder" onClick={onOpenFolder} primary />
        <StartAction icon={<Plus className="h-4 w-4" />} label="New Project" onClick={onCreateProject} />
        <StartAction icon={<Upload className="h-4 w-4" />} label="Import Project" onClick={onImportProject} />

        <div className="mt-5 px-1 text-xs font-semibold text-muted-foreground">Recent</div>
        <button type="button" onClick={onOpenFolder} className="rounded-md px-2 py-2 text-left hover:bg-[color:var(--Eulinx-color-hover)]">
          <div className="truncate text-sm text-foreground">Eulinx Core</div>
          <div className="truncate text-xs text-muted-foreground">~/Projects/eulinx-core</div>
        </button>
        <button type="button" onClick={onOpenFolder} className="rounded-md px-2 py-2 text-left hover:bg-[color:var(--Eulinx-color-hover)]">
          <div className="truncate text-sm text-foreground">API Gateway</div>
          <div className="truncate text-xs text-muted-foreground">~/Projects/api-gateway</div>
        </button>
      </div>

      <div className="border-t border-border p-3">
        <button type="button" className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-muted-foreground hover:bg-[color:var(--Eulinx-color-hover)]">
          <Settings className="h-4 w-4" aria-hidden />
          Settings
        </button>
      </div>
    </nav>
  )
}

function StartAction({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
      style={{
        background: primary ? "var(--Eulinx-color-accent)" : "transparent",
        color: primary ? "var(--Eulinx-color-surface)" : "var(--Eulinx-color-text)",
      }}
    >
      {icon}
      {label}
    </button>
  )
}
