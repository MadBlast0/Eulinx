import { Component, type ReactNode } from "react"
import { ThemeProvider } from "@/ui/tokens/theme-provider"
import { WorkspaceApp } from "@/ui/workspace"

class Boundary extends Component<
  { children: ReactNode; label: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(e: Error) {
    return { error: e }
  }
  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="m-2 rounded-md border border-[color:hsl(var(--destructive))] bg-[color:hsl(var(--destructive)/0.12)] p-3 text-sm text-[color:hsl(var(--foreground))]"
        >
          <div className="font-semibold text-[color:hsl(var(--destructive))]">
            {this.props.label} failed to render
          </div>
          <pre className="mt-1 overflow-auto whitespace-pre-wrap text-xs text-[color:hsl(var(--muted-foreground))]">
            {this.state.error.message}
          </pre>
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
        <Boundary label="WorkspaceApp">
          <WorkspaceApp />
        </Boundary>
      </ThemeProvider>
    </Boundary>
  )
}

export default App
