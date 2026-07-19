import { useProjects } from "./use-projects"
import { useWorkspace } from "./use-workspace"
import { NodeGraph } from "./node-graph"
import { ContextMenu } from "./context-menu"
import { TerminalView } from "./terminal"
import { ArtifactsView } from "./canvas-views/artifacts-view"
import { getCanvasViewMeta } from "./canvas-views/registry"

function CanvasHeader({ title }: { title: string }) {
  return (
    <div className="flex h-9 shrink-0 items-center border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-4 text-xs font-medium uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
      {title}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      <p className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">
        No view selected
      </p>
      <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
        Add one from the sidebar to get started.
      </p>
    </div>
  )
}

export function Canvas() {
  const { activeView } = useProjects()
  const { openContextMenu } = useWorkspace()

  if (!activeView) {
    return (
      <div className="flex flex-1 flex-col bg-[color:var(--Eulinx-color-background)]">
        <EmptyState />
      </div>
    )
  }

  const meta = getCanvasViewMeta(activeView.kind)

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[color:var(--Eulinx-color-background)]">
      <CanvasHeader title={meta.label} />
      {activeView.kind === "node-graph" && (
        <div
          className="relative flex-1 overflow-hidden"
          onContextMenu={(e) => {
            e.preventDefault()
            openContextMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          <NodeGraph />
          <ContextMenu />
        </div>
      )}
      {activeView.kind === "artifacts" && (
        <div className="min-h-0 flex-1">
          <ArtifactsView />
        </div>
      )}
      {activeView.kind === "terminal" && (
        <div className="min-h-0 flex-1 p-3">
          <TerminalView ptyId="canvas-terminal" className="h-full" />
        </div>
      )}
    </div>
  )
}
