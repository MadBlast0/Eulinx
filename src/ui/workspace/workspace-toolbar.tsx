import { useCallback, useState } from "react"
import { Play, Plus, RotateCw } from "lucide-react"
import { AppIcon } from "./app-icon"
import { ToolbarButton, ToolbarSep } from "./primitives"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { useRunGraph } from "./orchestrator-run"
import { NodeSubMenu } from "./node-sub-menu"

export function Toolbar() {
  const { addNode, autoLayout, undo, redo, canUndo, canRedo } = useWorkspace()
  const { graph } = useProjects()
  const { running, run } = useRunGraph()
  const [addOpen, setAddOpen] = useState(false)

  const handleRun = useCallback(() => {
    if (!graph) return
    void run(graph)
  }, [graph, run])

  return (
    <div className="flex h-full items-center gap-1 px-3">
      {/* ── Left: Run + Terminal ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={running ? "Running…" : "Run"}
          disabled={running}
          onClick={handleRun}
          style={{
            background: "var(--accent)",
            color: "var(--accent-foreground)",
            boxShadow: "0 1px 4px rgba(0, 0, 0, 0.10)",
          }}
          className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[12px] font-medium border border-transparent transition-all duration-150 enabled:hover:brightness-90 enabled:hover:shadow-md disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {running ? (
            <RotateCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" strokeWidth={2} />
          )}
          <span className="hidden sm:inline">{running ? "Running…" : "Run"}</span>
        </button>

        <ToolbarSep />
      </div>

      {/* ── Center: spacer ── */}
      <div className="flex-1" />

      {/* ── Right: graph actions ── */}
      <div className="flex shrink-0 items-center gap-0.5">
        {/* Terminal button */}
        <ToolbarButton tip="New terminal" onClick={() => addNode("terminal")}>
          <AppIcon name="terminal" className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>

        <ToolbarButton tip="Auto-layout" onClick={autoLayout}>
          <AppIcon name="conditions" className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>

        <ToolbarButton tip="Undo" onClick={undo} disabled={!canUndo}>
          <AppIcon name="undo" size={16} strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton tip="Redo" onClick={redo} disabled={!canRedo}>
          <AppIcon name="redo" size={16} strokeWidth={2} />
        </ToolbarButton>

        <ToolbarSep />

        {/* Add node — shared sub-menu */}
        <NodeSubMenu
          open={addOpen}
          onOpen={() => setAddOpen(true)}
          onClose={() => setAddOpen(false)}
          onPick={(kind) => addNode(kind)}
        >
          <button
            type="button"
            aria-label="Add node"
            className="flex h-7 items-center gap-1 rounded-md bg-[color:var(--Eulinx-color-toolbar)] px-2.5 text-[12px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors duration-150 hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            <span>Add</span>
          </button>
        </NodeSubMenu>
      </div>
    </div>
  )
}


