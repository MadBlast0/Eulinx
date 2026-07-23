import { useCallback, useState } from "react"
import { Play, Plus, RotateCw } from "lucide-react"
import { AppIcon } from "./app-icon"
import { ToolbarButton, ToolbarSep } from "./primitives"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { useRunGraph } from "./orchestrator-run"

const ADD_NODE_OPTIONS = [
  { kind: "terminal" as const, label: "Terminal", icon: "terminal" },
  { kind: "browser" as const, label: "Browser", icon: "browser" },
  { kind: "worker" as const, label: "Worker", icon: "graph" },
  { kind: "map" as const, label: "Map", icon: "map" },
] as const

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

        {/* Add node dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="Add node"
            onClick={() => setAddOpen((v) => !v)}
            className="flex h-7 items-center gap-1.5 rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-hover)] px-2.5 text-[12px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors duration-150 hover:border-[color:var(--Eulinx-color-border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-[var(--Eulinx-z-dropdown)]" onClick={() => setAddOpen(false)} />
              <div className="absolute right-0 top-full z-[var(--Eulinx-z-dropdown)] mt-1 min-w-[160px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg">
                {ADD_NODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => {
                      setAddOpen(false)
                      addNode(opt.kind)
                    }}
                    className="flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)]"
                  >
                    <AppIcon name={opt.icon} className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
