import { useProjects } from "./use-projects"
import { useWorkspace } from "./use-workspace"
import { ContextMenu } from "./context-menu"
import { getCanvasViewMeta } from "./canvas-views/registry"
import { ProjectOverview } from "./canvas-views/project-overview"

export function Canvas() {
  const { activeView, activeProject } = useProjects()
  const { openContextMenu } = useWorkspace()

  if (!activeView) {
    if (!activeProject) {
      return (
        <div className="flex flex-1 flex-col bg-[color:var(--Eulinx-color-background)]">
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">
              No project selected
            </p>
            <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
              Select or create a project from the sidebar.
            </p>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-1 flex-col bg-[color:var(--Eulinx-color-background)]">
        <ProjectOverview />
      </div>
    )
  }

  const meta = getCanvasViewMeta(activeView.kind)

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[color:var(--Eulinx-color-background)]">
      {activeView.kind === "node-graph" ? (
        <div
          className="relative flex-1 overflow-hidden"
          onContextMenu={(e) => {
            e.preventDefault()
            openContextMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          {meta.render()}
          <ContextMenu />
        </div>
      ) : (
        <div className={`min-h-0 flex-1${activeView.kind === "terminal" ? " p-3" : ""}`}>
          {meta.render()}
        </div>
      )}
    </div>
  )
}
