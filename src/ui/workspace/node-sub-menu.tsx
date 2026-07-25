import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"
import { AppIcon } from "./app-icon"
import { useMenuKeyboard } from "./use-menu-keyboard"
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

/** Flat list of all node kinds for keyboard indexing */
interface FlatNodeItem { kind: EulinxNodeKind; label: string; icon: string }
const ALL_NODE_ITEMS: FlatNodeItem[] = NODE_SECTIONS.flatMap((s) => s.items as readonly FlatNodeItem[])

// ---------------------------------------------------------------------------
// Smart positioning hook
// ---------------------------------------------------------------------------

type Direction = "right" | "left" | "down" | "up"

/**
 * @param triggerRef  ref to the element that anchors the sub-dropdown
 * @param open        whether the sub-dropdown is open
 * @param constraint  optional bounding rect to constrain within (e.g. canvas viewport)
 */
function useSmartPosition(
  triggerRef: React.RefObject<HTMLElement | null>,
  open: boolean,
  constraint?: DOMRect | null,
) {
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

    // Use constraint rect (canvas viewport) if provided, else fall back to window
    const bounds = constraint ?? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }

    const space = {
      right: bounds.right - r.right,
      left: r.left - bounds.left,
      down: bounds.bottom - r.bottom,
      up: r.top - bounds.top,
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

    // Clamp within the constraint bounds
    x = Math.max(bounds.left, Math.min(x, bounds.right - SUB_W))
    y = Math.max(bounds.top, Math.min(y, bounds.bottom - SUB_H))

    setPos({ x, y, dir })
  }, [open, triggerRef, constraint])

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
  /** Optional bounding rect to constrain the sub-dropdown within */
  constraint?: DOMRect | null
}

export function NodeSubMenu({ open, onOpen, onClose, onPick, children, constraint }: NodeSubMenuProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const { subRef, pos } = useSmartPosition(triggerRef, open, constraint)
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

  const handleSubExecute = useCallback(
    (index: number) => {
      const item = ALL_NODE_ITEMS[index]
      if (item) {
        onPick(item.kind)
        onClose()
      }
    },
    [onPick, onClose],
  )

  const { menuRef: subMenuRef, activeIndex, registerItem: registerSubItem, setHoverIndex: setSubHoverIndex, handleKeyDown: handleSubKeyDown } =
    useMenuKeyboard({
      open,
      itemCount: ALL_NODE_ITEMS.length,
      onClose,
      onExecute: handleSubExecute,
    })

  // Merge the two refs (smart-position subRef + keyboard menuRef) into one callback ref
  const mergedRef = useCallback(
    (el: HTMLDivElement | null) => {
      ;(subRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      ;(subMenuRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    },
    [subRef, subMenuRef],
  )

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
          ref={mergedRef}
          role="menu"
          aria-label="Node types"
          className="fixed z-[calc(var(--Eulinx-z-dropdown)+1)] min-w-[180px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
          style={{ left: pos.x, top: pos.y }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleSubKeyDown}
        >
          {NODE_SECTIONS.map((section, si) => {
            // Compute global index offset for items in this section
            let globalOffset = 0
            for (let i = 0; i < si; i++) {
              const sec = NODE_SECTIONS[i]
              if (sec) globalOffset += sec.items.length
            }
            return (
              <div key={section.label} role="group" aria-label={section.label}>
                {si > 0 && <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" role="separator" />}
                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]" role="presentation">
                  {section.label}
                </div>
                {section.items.map((opt, ii) => {
                  const globalIndex = globalOffset + ii
                  return (
                    <button
                      key={opt.kind}
                      ref={(el) => registerSubItem(globalIndex, el)}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      data-active={activeIndex === globalIndex || undefined}
                      className={`flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] outline-none ${
                        activeIndex === globalIndex ? "bg-[color:var(--Eulinx-color-hover)]" : ""
                      }`}
                      onMouseEnter={() => setSubHoverIndex(globalIndex)}
                      onClick={() => { onPick(opt.kind); onClose() }}
                    >
                      <AppIcon name={opt.icon} className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            )
          })}
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
  constraint?: DOMRect | null
  /** Index within the parent menu for keyboard navigation */
  index?: number
  /** Whether this item is the active (highlighted) one */
  isActive?: boolean
  /** Register this trigger's button element for keyboard focus */
  registerItem?: (index: number, el: HTMLElement | null) => void
  /** Called on hover to sync keyboard selection */
  onHover?: () => void
}

export function ContextMenuTrigger({
  open,
  onOpen,
  onClose,
  onPick,
  icon,
  label,
  shortcut,
  constraint,
  index,
  isActive,
  registerItem,
  onHover,
}: ContextMenuTriggerProps) {
  return (
    <NodeSubMenu open={open} onOpen={onOpen} onClose={onClose} onPick={onPick} constraint={constraint}>
      <button
        ref={index !== undefined && registerItem ? (el) => registerItem(index, el) : undefined}
        type="button"
        role="menuitem"
        tabIndex={-1}
        data-active={isActive || undefined}
        className={`flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] outline-none ${
          isActive ? "bg-[color:var(--Eulinx-color-hover)]" : ""
        }`}
        onMouseEnter={onHover}
        onClick={onOpen}
      >
        <span className="text-[color:var(--Eulinx-color-text-muted)]">{icon}</span>
        {label}
        {shortcut && <kbd className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">{shortcut}</kbd>}
        <ChevronRight className="ml-auto h-3 w-3 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2} />
      </button>
    </NodeSubMenu>
  )
}
