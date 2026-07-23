import { useCallback, useEffect, useRef, useState } from "react"
import { Maximize2, Minimize2, Minus, PanelLeft, PanelRight, X } from "lucide-react"
import { ToolbarButton } from "./primitives"
import { AppIcon } from "./app-icon"
import { useWorkspace } from "./use-workspace"
import { windowService } from "@/api/services"

export function TopBar() {
  const { toggleLeftSidebar, toggleRightSidebar, setOverlay } = useWorkspace()
  const dragRef = useRef<HTMLDivElement>(null)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let active = true
    void windowService
      .isMaximized()
      .then((value) => {
        if (active) setIsMaximized(value)
      })
      .catch(console.error)
    return () => {
      active = false
    }
  }, [])

  const handleDrag = useCallback(() => {
    void windowService.drag().catch(console.error)
  }, [])

  const handleWindowMinimize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    void windowService.minimize().catch(console.error)
  }, [])
  const handleWindowMaximize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    void windowService
      .toggleMaximize()
      .then(() => windowService.isMaximized())
      .then((value) => setIsMaximized(value))
      .catch(console.error)
  }, [])
  const handleWindowClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    void windowService.close().catch(console.error)
  }, [])

  return (
    <div className="flex h-full items-center gap-1.5 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-2">
      {/* Left group: app icon, sidebar toggle */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Eulinx"
          className="flex items-center gap-1.5 rounded-[var(--Eulinx-radius-xs)] px-1.5 py-0.5 text-[11px] font-semibold tracking-[-0.01em] text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <AppIcon className="h-3.5 w-3.5" name="aiAgent" strokeWidth={2.25} />
          Eulinx
        </button>

        <div className="mx-0.5 h-3 w-px bg-[color:var(--Eulinx-color-border)]" />

        <ToolbarButton tip="Toggle left sidebar" onClick={toggleLeftSidebar}>
          <PanelLeft className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>
      </div>

      {/* Center: draggable area + search */}
      <div
        ref={dragRef}
        className="flex flex-1 items-center justify-center"
        onPointerDown={handleDrag}
        style={{ cursor: "default" }}
      >
        <div
          className="pointer-events-auto flex h-6 w-full max-w-[320px] items-center gap-1.5 border-b border-[color:var(--Eulinx-color-border)] pl-1 pr-0.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:border-[color:var(--Eulinx-color-border-strong)]"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setOverlay("cmd")}
        >
          <AppIcon className="h-3 w-3" name="search" strokeWidth={2} />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="shrink-0 rounded-[2px] bg-[color:var(--Eulinx-color-surface)] px-1 py-px text-[8px] font-medium text-[color:var(--Eulinx-color-text-muted)]/60">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right group: sidebar toggle, divider, window controls */}
      <div className="flex shrink-0 items-center gap-0.5">
        <ToolbarButton tip="Toggle right sidebar" onClick={toggleRightSidebar}>
          <PanelRight className="h-3 w-3" strokeWidth={1.5} />
        </ToolbarButton>

        <div className="mx-0.5 h-3 w-px bg-[color:var(--Eulinx-color-border)]" />

        {/* Window controls */}
        <div className="flex items-center">
          <button
            type="button"
            aria-label="Minimize"
            onClick={handleWindowMinimize}
            className="flex h-5 w-7 items-center justify-center rounded-none text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none"
          >
            <Minus className="h-2.5 w-2.5" strokeWidth={2} />
          </button>
          <button
            type="button"
            aria-label={isMaximized ? "Restore" : "Maximize"}
            onClick={handleWindowMaximize}
            className="flex h-5 w-7 items-center justify-center rounded-none text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none"
          >
            {isMaximized ? (
              <Minimize2 className="h-2.5 w-2.5" strokeWidth={2} />
            ) : (
              <Maximize2 className="h-2.5 w-2.5" strokeWidth={2} />
            )}
          </button>
          <button
            type="button"
            aria-label="Close"
            onClick={handleWindowClose}
            className="flex h-5 w-7 items-center justify-center rounded-none text-[color:var(--Eulinx-color-text-muted)] transition-colors hover:bg-[color:var(--Eulinx-color-error)] hover:text-white focus-visible:outline-none"
          >
            <X className="h-2.5 w-2.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
