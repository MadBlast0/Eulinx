import { Component, type ReactNode } from "react"
import { ThemeProvider } from "@/ui/tokens/theme-provider"
import { WorkspaceLayout, CanvasSurface } from "@/ui/layout/workspace-layout"
import { PanelProvider } from "@/ui/panels"
import { SidebarProvider, type SidebarData } from "@/ui/sidebar"
import { NodeGraphProvider } from "@/ui/node-graph"
import { TerminalProvider } from "@/ui/terminal"
import { TerminalCardsProvider, createMockSource } from "@/ui/terminal-cards"
import { Dashboard } from "@/ui/surface/dashboard"
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
          <b>{this.label}:</b> {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <Boundary label="ThemeProvider">
      <ThemeProvider>
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
                              <WorkspaceLayout>
                                <CanvasSurface>
                                  <Dashboard />
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
      </ThemeProvider>
    </Boundary>
  )
}

export default App
