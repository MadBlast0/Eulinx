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

function App() {
  return (
    <ThemeProvider>
      <TerminalProvider>
        <NodeGraphProvider>
          <TerminalCardsProvider source={DEMO_SOURCE} workerIds={[]}>
            <PanelProvider workspaceId="default">
              <SidebarProvider data={EMPTY_SIDEBAR_DATA}>
                <WorkspaceLayout>
                  <CanvasSurface>
                    <Dashboard />
                  </CanvasSurface>
                </WorkspaceLayout>
              </SidebarProvider>
            </PanelProvider>
          </TerminalCardsProvider>
        </NodeGraphProvider>
      </TerminalProvider>
    </ThemeProvider>
  )
}

export default App
