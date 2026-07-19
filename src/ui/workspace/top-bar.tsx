import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Globe,
  Keyboard,
  LayoutGrid,
  Map as MapIcon,
  Maximize2,
  Minus,
  PanelLeft,
  PanelRight,
  Search,
  Settings,
  Share2,
  Squircle,
  TerminalSquare,
  X,
  ZoomIn,
} from "lucide-react"
import { ToolbarButton, ToolbarSep } from "./primitives"
import { useWorkspace } from "./use-workspace"

export function TopBar() {
  const {
    toggleLeftSidebar,
    toggleRightSidebar,
    setOverlay,
    addNode,
  } = useWorkspace()

  return (
    <div
      className="flex items-center gap-0 border-b border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-panel)] px-2"
      style={{ WebkitAppRegion: "drag" }}
    >
      <ToolbarButton tip="Eulinx">
        <Squircle className="h-4 w-4" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarSep />
      <ToolbarButton tip="Toggle left sidebar" onClick={toggleLeftSidebar}>
        <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="Toggle right sidebar" onClick={toggleRightSidebar}>
        <PanelRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarSep />
      <ToolbarButton tip="Back">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="Forward">
        <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>

      <ToolbarSep />

      <span
        className="whitespace-nowrap px-2 text-[11px] text-[color:var(--wsx-text-muted)]"
        style={{ WebkitAppRegion: "no-drag" }}
      >
        Project 1
      </span>
      <ToolbarSep />
      <ToolbarButton tip="Canvas view" active>
        <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="Terminal view">
        <TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="Node graph">
        <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton tip="New terminal" onClick={() => addNode("terminal")}>
        <TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="New browser" onClick={() => addNode("browser")}>
        <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="New worker">
        <Squircle className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="New map" onClick={() => addNode("map")}>
        <MapIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>

      <ToolbarSep />
      <ToolbarButton tip="Zoom to fit">
        <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="Minimap">
        <MapIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>

      <div className="flex-1" style={{ WebkitAppRegion: "drag" }} />

      <ToolbarButton tip="Search (Ctrl+K)" onClick={() => setOverlay("cmd")}>
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>

      <ToolbarSep />

      <ToolbarButton tip="Keyboard shortcuts" onClick={() => setOverlay("shortcuts")}>
        <Keyboard className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="Notifications">
        <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton tip="Settings" onClick={() => setOverlay("settings")}>
        <Settings className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>

      <ToolbarSep />

      <div className="flex items-center" style={{ WebkitAppRegion: "no-drag" }}>
        <WindowButton label="Minimize">
          <Minus className="h-3 w-3" strokeWidth={1.5} />
        </WindowButton>
        <WindowButton label="Maximize">
          <Maximize2 className="h-3 w-3" strokeWidth={1.5} />
        </WindowButton>
        <WindowButton label="Close" close>
          <X className="h-3 w-3" strokeWidth={1.5} />
        </WindowButton>
      </div>
    </div>
  )
}

function WindowButton({
  label,
  close = false,
  children,
}: {
  label: string
  close?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      className={
        close
          ? "flex h-[var(--wsx-topbar-h)] w-9 items-center justify-center text-[color:var(--wsx-text-muted)] transition-colors hover:bg-[color:var(--wsx-red)] hover:text-white"
          : "flex h-[var(--wsx-topbar-h)] w-9 items-center justify-center text-[color:var(--wsx-text-muted)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
      }
    >
      {children}
    </button>
  )
}
