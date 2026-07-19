import { useEffect, useState } from "react"
import { Boxes } from "lucide-react"
import { useProjects } from "./use-projects"

function StatusItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-full cursor-default items-center gap-1.5 px-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]">
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
  const clock = useClock()

  const nodeCount = graph?.nodes.length ?? 0
  const viewCount = activeProject?.views.length ?? 0

  return (
    <div
      className="z-20 flex items-center border-t border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] text-[11px] text-[color:var(--Eulinx-color-text-muted)]"
      style={{ height: "var(--wsx-statusbar-h)" }}
    >
      <StatusItem>
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--Eulinx-color-success)]" />
        Local
      </StatusItem>
      <StatusItem>{activeProject?.name ?? "No project"}</StatusItem>
      <StatusItem>
        Views: {viewCount}
      </StatusItem>
      <StatusItem>
        <Boxes className="h-3 w-3" strokeWidth={1.5} />
        {nodeCount} nodes
      </StatusItem>
      <span className="flex-1" />
      <StatusItem>Projects: {projects.length}</StatusItem>
      <StatusItem>Nodes: {nodeCount}</StatusItem>
      <StatusItem>{clock}</StatusItem>
    </div>
  )
}
