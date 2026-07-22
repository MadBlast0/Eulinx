import { useCallback } from "react"
import {
  ChevronDown,
  Copy,
  Minus,
  PanelLeft,
  PanelRight,
  Search,
  X,
} from "lucide-react"
import { ToolbarButton } from "./primitives"
import { AppIcon } from "./app-icon"
import { useWorkspace } from "./use-workspace"
import { useProjects } from "./use-projects"
import { windowService } from "@/api/services"

export function TopBar() {
  const { toggleLeftSidebar, toggleRightSidebar, setOverlay } = useWorkspace()
  const { activeProject, activeView } = useProjects()

  const handleWindowMinimize = useCallback(() => {
    windowService.minimize()
  }, [])
  const handleWindowMaximize = useCallback(() => {
    windowService.toggleMaximize()
  }, [])
  const handleWindowClose = useCallback(() => {
    windowService.close()
  }, [])

  return (
    <div
      className="flex h-full items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-3"
      style={{ WebkitAppRegion: "drag" }}
    >
      {/* Left group: app icon, sidebar toggle, breadcrumb */}
      <div className="flex shrink-0 items-center gap-2" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          type="button"
          aria-label="Eulinx"
          className="flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-2 py-1.5 text-[13px] font-semibold tracking-[-0.01em] text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <AppIcon className="h-[18px] w-[18px]" />
          Eulinx
        </button>

        <div className="mx-1 h-5 w-px bg-[color:var(--Eulinx-color-border)]" />

        <ToolbarButton tip="Toggle left sidebar" onClick={toggleLeftSidebar}>
          <PanelLeft className="h-4 w-4" strokeWidth={1.5} />
        </ToolbarButton>

        <button
          type="button"
          aria-label="Select workspace"
          className="flex items-center gap-1 rounded-[var(--Eulinx-radius-sm)] px-2 py-1.5 text-[12px] font-medium text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <AppIcon className="h-3.5 w-3.5" />
          Personal
          <ChevronDown className="h-3 w-3 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-1.5 text-[12px] text-[color:var(--Eulinx-color-text-muted)]">
          <span>Eulinx</span>
          <span className="text-[color:var(--Eulinx-color-border-strong)]">/</span>
          <span className="text-[color:var(--Eulinx-color-text)]">
            {activeView?.name ?? activeProject?.name ?? "Eulinx"}
          </span>
        </div>
      </div>

      {/* Center: global search / command palette */}
      <div className="flex flex-1 justify-center" style={{ WebkitAppRegion: "no-drag" }}>
        <button
          type="button"
          aria-label="Search or run a command"
          onClick={() => setOverlay("cmd")}
          className="flex h-[30px] w-full max-w-[420px] items-center gap-2 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-background)] px-2.5 text-[12px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:border-[color:var(--Eulinx-color-border-strong)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span className="flex-1 text-left">Search or run a command…</span>
          <kbd className="rounded-[var(--Eulinx-radius-xs)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right group: sidebar toggle, window controls */}
      <div className="flex shrink-0 items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
        <ToolbarButton tip="Toggle right sidebar" onClick={toggleRightSidebar}>
          <PanelRight className="h-4 w-4" strokeWidth={1.5} />
        </ToolbarButton>

        {/* Window controls */}
        <div className="ml-1 flex items-center">
          <button
            type="button"
            aria-label="Minimize"
            onClick={handleWindowMinimize}
            className="flex h-7 w-[46px] items-center justify-center rounded-none text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none"
          >
            <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Maximize"
            onClick={handleWindowMaximize}
            className="flex h-7 w-[46px] items-center justify-center rounded-none text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none"
          >
            <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={handleWindowClose}
            className="flex h-7 w-[46px] items-center justify-center rounded-none text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-error)] hover:text-white focus-visible:outline-none"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
