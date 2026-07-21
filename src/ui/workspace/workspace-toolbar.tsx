import { useCallback, useState } from "react"
import {
  Boxes,
  Globe,
  Map as MapIcon,
  Play,
  Plus,
  Redo2,
  RotateCw,
  TerminalSquare,
  Undo2,
} from "lucide-react"
import { ToolbarButton, ToolbarSep } from "./primitives"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { useRunGraph } from "./orchestrator-run"
import { ShellPicker } from "./terminal/shell-picker"

const ADD_NODE_OPTIONS = [
  { kind: "terminal" as const, label: "Terminal", icon: TerminalSquare },
  { kind: "browser" as const, label: "Browser", icon: Globe },
  { kind: "worker" as const, label: "Worker", icon: Boxes },
  { kind: "map" as const, label: "Map", icon: MapIcon },
]

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
      {/* Run button */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label={running ? "Running…" : "Run"}
          disabled={running}
          onClick={handleRun}
          style={{
            border: "1px solid color-mix(in srgb, var(--Eulinx-color-accent) 78%, white 22%)",
            background: "linear-gradient(180deg, color-mix(in srgb, var(--Eulinx-color-accent) 92%, white 8%), var(--Eulinx-color-accent))",
            boxShadow: "0 8px 24px rgba(255, 56, 92, 0.18)",
          }}
          className="flex h-[30px] items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] px-3 text-[12px] font-medium text-white transition-colors enabled:hover:brightness-110 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {running ? (
            <RotateCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
          )}
          <span className="hidden sm:inline">{running ? "Running…" : "Run"}</span>
        </button>

        <ToolbarSep />

        {/* Merged terminal button: icon + shell picker */}
        <div className="flex">
          <ToolbarButton tip="New terminal" onClick={() => addNode("terminal")}>
            <TerminalSquare className="h-4 w-4" strokeWidth={1.5} />
          </ToolbarButton>
          <ShellPicker onPick={(shell) => addNode("terminal", shell)} />
        </div>
      </div>

      {/* Center: spacer */}
      <div className="flex-1" />

      {/* Right: graph actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        <ToolbarButton tip="Auto-layout" onClick={autoLayout}>
          <RotateCw className="h-4 w-4" strokeWidth={1.5} />
        </ToolbarButton>

        <ToolbarButton tip="Undo" onClick={undo} disabled={!canUndo}>
          <Undo2 className="h-4 w-4" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton tip="Redo" onClick={redo} disabled={!canRedo}>
          <Redo2 className="h-4 w-4" strokeWidth={1.5} />
        </ToolbarButton>

        <ToolbarSep />

        {/* Add node dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-label="Add node"
            onClick={() => setAddOpen((v) => !v)}
            className="flex h-[30px] items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-hover)] px-3 text-[12px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors hover:border-[color:var(--Eulinx-color-border-strong)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span>Add</span>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          {addOpen && (
            <>
              <div className="fixed inset-0 z-[var(--Eulinx-z-dropdown)]" onClick={() => setAddOpen(false)} />
              <div className="absolute right-0 top-full z-[var(--Eulinx-z-dropdown)] mt-1 min-w-[160px] animate-[ctx-in_120ms_ease] rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1.5 shadow-[var(--Eulinx-elev-lg)]">
                {ADD_NODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.kind}
                    type="button"
                    onClick={() => {
                      setAddOpen(false)
                      addNode(opt.kind)
                    }}
                    className="flex h-[30px] w-full items-center gap-2.5 rounded-[var(--Eulinx-radius-sm)] px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
                  >
                    <opt.icon className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
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
