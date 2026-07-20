import { useCallback, useEffect, useState } from "react"
import {
  ChevronDown,
  Globe,
  Map as MapIcon,
  PanelLeft,
  PanelRight,
  Play,
  Redo2,
  RotateCw,
  Search,
  Squircle,
  TerminalSquare,
  Undo2,
} from "lucide-react"
import { isTauri } from "@tauri-apps/api/core"
import { invoke } from "@tauri-apps/api/core"
import { ToolbarButton, ToolbarSep } from "./primitives"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { useRunGraph } from "./orchestrator-run"
import { ShellPicker } from "./terminal/shell-picker"

export function TopBar() {
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    setOverlay,
    addNode,
  } = useWorkspace()

  const { graph } = useProjects()
  const { running, lastResult, run, reset } = useRunGraph()
  const [noGraphMessage, setNoGraphMessage] = useState(false)

  // Auto-reset to idle after a completed/errored run
  useEffect(() => {
    if (lastResult && !running) {
      const timer = setTimeout(() => reset(), 5000)
      return () => clearTimeout(timer)
    }
  }, [lastResult, running, reset])

  const handleRun = useCallback(() => {
    if (!graph) {
      setNoGraphMessage(true)
      setTimeout(() => setNoGraphMessage(false), 2000)
      return
    }
    void run(graph)
  }, [graph, run])

  const handleWindowClose = useCallback(() => {
    if (isTauri()) { void invoke("plugin:window|close") }
  }, [])
  const handleWindowMinimize = useCallback(() => {
    if (isTauri()) { void invoke("plugin:window|minimize") }
  }, [])
  const handleWindowMaximize = useCallback(() => {
    if (isTauri()) { void invoke("plugin:window|toggle_maximize") }
  }, [])

  return (
    <div
      className="flex h-full items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-3"
      style={{ WebkitAppRegion: "drag" }}
    >
      {/* Window controls (macOS-style traffic dots) */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          type="button"
          aria-label="Close"
          onClick={handleWindowClose}
          className="wsx-win-btn wsx-win-close"
        />
        <button
          type="button"
          aria-label="Minimize"
          onClick={handleWindowMinimize}
          className="wsx-win-btn wsx-win-minimize"
        />
        <button
          type="button"
          aria-label="Maximize"
          onClick={handleWindowMaximize}
          className="wsx-win-btn wsx-win-maximize"
        />
      </div>

      {/* Left group: logo, workspace selector, breadcrumb */}
      <div className="flex shrink-0 items-center gap-2" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          type="button"
          aria-label="Eulinx"
          className="flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-2 py-1.5 text-[13px] font-semibold tracking-[-0.01em] text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Squircle className="h-[18px] w-[18px] text-[color:var(--Eulinx-color-accent)]" strokeWidth={2.4} />
          Eulinx
        </button>

        <ToolbarButton tip="Toggle left sidebar" onClick={toggleLeftSidebar}>
          <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>

        <button
          type="button"
          aria-label="Select workspace"
          className="flex items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] px-2 py-1.5 text-[12px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Squircle className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
          Personal
          <ChevronDown className="h-3 w-3 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-1.5 text-[12px] text-[color:var(--Eulinx-color-text-muted)]">
          <span>Eulinx</span>
          <span className="text-[color:var(--Eulinx-color-border-strong)]">/</span>
          <span className="text-[color:var(--Eulinx-color-text)]">Node Graph</span>
        </div>
      </div>

      <ToolbarSep />

      {/* Context-aware toolbar slot (populated when a node is selected) */}
      <div id="wsx-ctx-toolbar" className="hidden items-center gap-1" style={{ WebkitAppRegion: "no-drag" }} />

      {/* Center: search trigger */}
      <div className="flex flex-1 justify-center" style={{ WebkitAppRegion: "drag" }}>
        <button
          type="button"
          aria-label="Search or run a command"
          onClick={() => setOverlay("cmd")}
          className="flex h-[30px] w-full max-w-[420px] items-center gap-2 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-background)] px-2.5 text-[12px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:border-[color:var(--Eulinx-color-border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={{ WebkitAppRegion: "no-drag" }}
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="flex-1 text-left">Search or run a command…</span>
          <kbd className="rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right group: add nodes, undo/redo, run, sync, profile */}
      <div className="flex shrink-0 items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
        <ToolbarButton tip="New terminal" onClick={() => addNode("terminal")}>
          <TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>
        <ShellPicker onPick={(shell) => addNode("terminal", shell)} />
        <ToolbarButton tip="New browser" onClick={() => addNode("browser")}>
          <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton tip="New map" onClick={() => addNode("map")}>
          <MapIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>

        <ToolbarSep />

        <ToolbarButton tip="Undo">
          <Undo2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton tip="Redo">
          <Redo2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>

        <ToolbarSep />

        <button
          type="button"
          aria-label={running ? "Running…" : "Run"}
          disabled={running}
          onClick={handleRun}
          className="flex h-[30px] items-center gap-1.5 rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-accent)] px-3 text-[12px] font-medium text-white transition-colors enabled:hover:bg-[color:var(--Eulinx-color-accent)]/90 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {running ? (
            <RotateCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          ) : (
            <Play className="h-3.5 w-3.5 fill-current" strokeWidth={0} />
          )}
          {running ? "Running…" : noGraphMessage ? "No graph" : "Run"}
        </button>
        <ToolbarButton tip="Sync">
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>
        <ToolbarButton tip="Toggle right sidebar" onClick={toggleRightSidebar}>
          <PanelRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </ToolbarButton>

        <button
          type="button"
          aria-label="Profile"
          title="Profile"
          className="ml-1 flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] text-[11px] font-semibold text-[color:var(--Eulinx-color-text)] transition-colors hover:border-[color:var(--Eulinx-color-border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          MB
        </button>
      </div>
    </div>
  )
}
