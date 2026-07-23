import { useCallback, useRef, useState } from "react"
import { useProjects } from "./use-projects"
import { useWorkspace } from "./use-workspace"
import { ContextMenu } from "./context-menu"
import { NodeContextMenu } from "./node-context-menu"
import { getCanvasViewMeta } from "./canvas-views/registry"
import { ProjectOverview } from "./canvas-views/project-overview"

export function Canvas() {
  const { activeView, activeProject } = useProjects()
  const { openContextMenu, contextMenu } = useWorkspace()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [constraint, setConstraint] = useState<DOMRect | null>(null)

  const updateConstraint = useCallback(() => {
    if (canvasRef.current) {
      setConstraint(canvasRef.current.getBoundingClientRect())
    }
  }, [])

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
  const isNodeGraph = activeView.kind === "node-graph"

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[color:var(--Eulinx-color-background)]">
      {isNodeGraph ? (
        <div
          ref={canvasRef}
          className="relative flex-1 overflow-hidden"
          onContextMenu={(e) => {
            // Skip if right-click was on a node (handled by ReactFlow's onNodeContextMenu)
            const target = e.target as HTMLElement
            if (target.closest(".react-flow__node")) return
            // Only handle empty-canvas right-click
            e.preventDefault()
            updateConstraint()
            openContextMenu({ x: e.clientX, y: e.clientY })
          }}
        >
          {meta.render()}
          {/* Empty canvas context menu */}
          <ContextMenu constraint={constraint} />
          {/* Node-specific context menu */}
          {contextMenu?.nodeId && <NodeContextMenu constraint={constraint} />}
        </div>
      ) : (
        <div className={`min-h-0 flex-1${activeView.kind === "terminal" ? " p-3" : ""}`}>
          {meta.render()}
        </div>
      )}
    </div>
  )
}
