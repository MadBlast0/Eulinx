import { ThemeProvider } from "@/ui/tokens/theme-provider"
import { WorkspaceLayout } from "@/ui/layout/workspace-layout"
import { Dashboard } from "@/ui/surface/dashboard"
import { Logs } from "@/ui/surface/logs"

function App() {
  return (
    <ThemeProvider>
      <WorkspaceLayout
        canvas={<Dashboard />}
        panel={<Logs />}
      />
    </ThemeProvider>
  )
}

export default App
