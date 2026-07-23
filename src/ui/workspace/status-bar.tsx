import { useEffect, useState } from "react"
import { AppIcon } from "./app-icon"
import { Button } from "@/components/ui/button"
import { useProjects } from "./use-projects"
import { useWorkspace } from "./use-workspace"

function StatusItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-full cursor-default items-center gap-1.5 px-2 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground">
      {children}
    </span>
  )
}

function useClock(): string {
  const [now, setNow] = useState<string>(() => formatClock())
  useEffect(() => {
    const id = setInterval(() => setNow(formatClock()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

function formatClock(): string {
  const d = new Date()
  const hh = d.getHours().toString().padStart(2, "0")
  const mm = d.getMinutes().toString().padStart(2, "0")
  return `${hh}:${mm}`
}

export function StatusBar() {
  const { activeProject, graph, projects } = useProjects()
  const { bottomPanelOpen, setBottomPanelOpen } = useWorkspace()
  const clock = useClock()

  const nodeCount = graph?.nodes.length ?? 0
  const viewCount = activeProject?.views.length ?? 0

  return (
    <div
      className="z-20 flex items-center border-t border-border bg-toolbar text-xs text-muted-foreground"
      style={{ height: "var(--wsx-statusbar-h)" }}
    >
      <StatusItem>
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Local
      </StatusItem>
      <StatusItem>{activeProject?.name ?? "No project"}</StatusItem>
      <StatusItem>
        Views: {viewCount}
      </StatusItem>
      <StatusItem>
        <AppIcon name="artifacts" className="h-3 w-3" strokeWidth={2.25} />
        {nodeCount} nodes
      </StatusItem>
      <span className="flex-1" />
      <StatusItem>Projects: {projects.length}</StatusItem>
      <StatusItem>Nodes: {nodeCount}</StatusItem>
      <StatusItem>{clock}</StatusItem>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setBottomPanelOpen(!bottomPanelOpen)}
        className={`h-full gap-1.5 border-l border-border px-2 text-xs ${
          bottomPanelOpen
            ? "text-primary"
            : "text-muted-foreground"
        }`}
        aria-label={bottomPanelOpen ? "Hide bottom panel" : "Show bottom panel"}
      >
        <AppIcon name="panel" className="h-3 w-3" strokeWidth={2.25} />
        Panel
      </Button>
    </div>
  )
}
