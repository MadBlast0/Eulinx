import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { AppIcon } from "./app-icon"
import type { EulinxNodeKind } from "./node-graph/node-types"

// ---------------------------------------------------------------------------
// Shared node sections data
// ---------------------------------------------------------------------------

export const NODE_SECTIONS = [
  {
    label: "Core",
    items: [
      { kind: "terminal" as const, label: "Terminal", icon: "terminal" },
      { kind: "browser" as const, label: "Browser", icon: "browser" },
      { kind: "worker" as const, label: "Worker", icon: "graph" },
      { kind: "agent" as const, label: "Agent", icon: "aiAgent" },
      { kind: "session" as const, label: "Session", icon: "network" },
    ],
  },
  {
    label: "Control",
    items: [
      { kind: "map" as const, label: "Map", icon: "map" },
      { kind: "router" as const, label: "Router", icon: "split" },
      { kind: "merge" as const, label: "Merge", icon: "merge" },
      { kind: "prompt" as const, label: "Prompt", icon: "prompt" },
    ],
  },
  {
    label: "Data",
    items: [
      { kind: "memory" as const, label: "Memory", icon: "harddrive" },
      { kind: "file" as const, label: "File", icon: "file" },
      { kind: "tool" as const, label: "Tool", icon: "tool" },
      { kind: "note" as const, label: "Note", icon: "note" },
    ],
  },
  {
    label: "Observability",
    items: [
      { kind: "event" as const, label: "Event", icon: "event" },
      { kind: "metric" as const, label: "Metric", icon: "diagnostics" },
      { kind: "log" as const, label: "Log", icon: "logs" },
    ],
  },
] as const

// ---------------------------------------------------------------------------
// Smart positioning hook
// ---------------------------------------------------------------------------

type Direction = "right" | "left" | "down" | "up"

function useSmartPosition(triggerRef: React.RefObject<HTMLElement | null>, open: boolean) {
  const [pos, setPos] = useState<{ x: number; y: number; dir: Direction }>({ x: 0, y: 0, dir: "right" })
  const subRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    if (!trigger) return

    const r = trigger.getBoundingClientRect()
    const SUB_W = 200
    const SUB_H = 340
    const GAP = 4

    const space = {
      right: window.innerWidth - r.right,
      left: r.left,
      down: window.innerHeight - r.bottom,
      up: r.top,
    }

    let dir: Direction
    if (space.right >= SUB_W + GAP) dir = "right"
    else if (space.left >= SUB_W + GAP) dir = "left"
    else if (space.down >= SUB_H + GAP) dir = "down"
    else dir = "up"

    let x: number, y: number
    switch (dir) {
      case "right":
        x = r.right + GAP
        y = r.top
        break
      case "left":
        x = r.left - SUB_W - GAP
        y = r.top
        break
      case "down":
        x = r.left
        y = r.bottom + GAP
        break
      case "up":
        x = r.left
        y = r.top - SUB_H - GAP
        break
    }

    // Clamp to viewport
    x = Math.max(0, Math.min(x, window.innerWidth - SUB_W))
    y = Math.max(0, Math.min(y, window.innerHeight - SUB_H))

    setPos({ x, y, dir })
  }, [open, triggerRef])

  return { subRef, pos }
}

// ---------------------------------------------------------------------------
// NodeSubMenu — shared between context menu and toolbar
// ---------------------------------------------------------------------------

interface NodeSubMenuProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onPick: (kind: EulinxNodeKind) => void
  children: ReactNode
}

export function NodeSubMenu({ open, onOpen, onClose, onPick, children }: NodeSubMenuProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const { subRef, pos } = useSmartPosition(triggerRef, open)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(onClose, 150)
  }, [onClose])

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current)
  }, [])

  useEffect(() => {
    return () => clearTimeout(closeTimer.current)
  }, [])

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => { cancelClose(); onOpen() }}
      onMouseLeave={scheduleClose}
    >
      {/* Trigger item */}
      <div onClick={onOpen}>{children}</div>

      {/* Sub-dropdown */}
      {open && (
        <div
          ref={subRef}
          className="fixed z-[calc(var(--Eulinx-z-dropdown)+1)] min-w-[180px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
          style={{ left: pos.x, top: pos.y }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
        >
          {NODE_SECTIONS.map((section, si) => (
            <div key={section.label}>
              {si > 0 && <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" />}
              <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                {section.label}
              </div>
              {section.items.map((opt) => (
                <button
                  key={opt.kind}
                  type="button"
                  onClick={() => { onPick(opt.kind); onClose() }}
                  className="flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)]"
                >
                  <AppIcon name={opt.icon} className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2} />
                  {opt.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Context menu trigger wrapper — wraps any item to show the sub-dropdown
// ---------------------------------------------------------------------------

interface ContextMenuTriggerProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onPick: (kind: EulinxNodeKind) => void
  icon: ReactNode
  label: string
  shortcut?: string
}

export function ContextMenuTrigger({ open, onOpen, onClose, onPick, icon, label, shortcut }: ContextMenuTriggerProps) {
  return (
    <NodeSubMenu open={open} onOpen={onOpen} onClose={onClose} onPick={onPick}>
      <button
        type="button"
        className="flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)]"
      >
        <span className="text-[color:var(--Eulinx-color-text-muted)]">{icon}</span>
        {label}
        {shortcut && <kbd className="ml-auto text-[10px] text-[color:var(--Eulinx-color-text-muted)]">{shortcut}</kbd>}
        <ChevronRight className="ml-auto h-3 w-3 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2} />
      </button>
    </NodeSubMenu>
  )
}
