import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronRight, ChevronUp } from "lucide-react"
import { AppIcon } from "./app-icon"
import { useMenuKeyboard } from "./use-menu-keyboard"
import type { EulinxNodeKind } from "./node-graph/node-types"

// ---------------------------------------------------------------------------
// Shared node sections data
// ---------------------------------------------------------------------------

export const NODE_SECTIONS = [
  {
    label: "Pipeline",
    items: [
      { kind: "input" as const, label: "Input", icon: "run" },
      { kind: "output" as const, label: "Output", icon: "panel" },
      { kind: "worker" as const, label: "Worker", icon: "aiAgent" },
      { kind: "builder" as const, label: "Builder", icon: "graph" },
      { kind: "verifier" as const, label: "Verifier", icon: "conditions" },
      { kind: "merge" as const, label: "Merge", icon: "merge" },
    ],
  },
  {
    label: "Control",
    items: [
      { kind: "orchestrator" as const, label: "Orchestrator", icon: "scheduler" },
      { kind: "condition" as const, label: "Condition", icon: "route" },
      { kind: "loop" as const, label: "Loop", icon: "loops" },
    ],
  },
  {
    label: "Data & IO",
    items: [
      { kind: "artifact" as const, label: "Artifact", icon: "artifacts" },
      { kind: "memory" as const, label: "Memory", icon: "memory" },
      { kind: "tool" as const, label: "Tool", icon: "tool" },
      { kind: "mcp" as const, label: "MCP", icon: "cloud" },
      { kind: "http_request" as const, label: "HTTP Request", icon: "cloud" },
    ],
  },
  {
    label: "Logic",
    items: [
      { kind: "switch" as const, label: "Switch", icon: "split" },
      { kind: "filter" as const, label: "Filter", icon: "conditions" },
      { kind: "set" as const, label: "Set", icon: "variables" },
      { kind: "code" as const, label: "Code", icon: "terminal" },
      { kind: "threshold" as const, label: "Threshold", icon: "diagnostics" },
    ],
  },
  {
    label: "Triggers",
    items: [
      { kind: "webhook_trigger" as const, label: "Webhook", icon: "api" },
      { kind: "schedule_trigger" as const, label: "Schedule", icon: "scheduler" },
    ],
  },
  {
    label: "Timing & Gate",
    items: [
      { kind: "delay" as const, label: "Delay", icon: "scheduler" },
      { kind: "human_approval" as const, label: "Human Approval", icon: "aiAgent" },
    ],
  },
  {
    label: "Legacy",
    items: [
      { kind: "terminal" as const, label: "Terminal", icon: "terminal" },
      { kind: "browser" as const, label: "Browser", icon: "api" },
      { kind: "agent" as const, label: "Agent", icon: "aiAgent" },
      { kind: "session" as const, label: "Session", icon: "network" },
      { kind: "file" as const, label: "File", icon: "file" },
    ],
  },
] as const

// ---------------------------------------------------------------------------
// NodeSubMenu — two-level: categories → node items on hover
// ---------------------------------------------------------------------------

interface NodeSubMenuProps {
  open: boolean
  onOpen: () => void
  onClose: () => void
  onPick: (kind: EulinxNodeKind) => void
  children: ReactNode
  constraint?: DOMRect | null
}

export function NodeSubMenu({ open, onOpen, onClose, onPick, children, constraint }: NodeSubMenuProps) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const scheduleClose = useCallback(() => {
    closeTimer.current = setTimeout(onClose, 200)
  }, [onClose])

  const cancelClose = useCallback(() => {
    clearTimeout(closeTimer.current)
  }, [])

  useEffect(() => () => clearTimeout(closeTimer.current), [])

  // Compute main dropdown position (below the trigger, left-aligned)
  const [mainPos, setMainPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!open) { setMainPos(null); return }
    const trigger = triggerRef.current
    if (!trigger) return

    const r = trigger.getBoundingClientRect()
    const MAIN_W = 170
    const GAP = 4
    const bounds = constraint ?? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }

    let x = r.left
    let y = r.bottom + GAP
    x = Math.max(bounds.left, Math.min(x, bounds.right - MAIN_W))
    y = Math.max(bounds.top, Math.min(y, bounds.bottom - 400))

    setMainPos({ x, y })
  }, [open, constraint])

  // Compute sub-dropdown position (to the LEFT of the main dropdown, aligned to hovered category)
  const [subPos, setSubPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (hoveredCategory === null || !mainPos) { setSubPos(null); return }

    const menuEl = menuRef.current
    if (!menuEl) return

    const categoryEls = menuEl.querySelectorAll<HTMLElement>("[data-cat]")
    const catEl = categoryEls[hoveredCategory]
    if (!catEl) return

    const catR = catEl.getBoundingClientRect()
    const SUB_W = 180
    const MAIN_W = 170
    const bounds = constraint ?? { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }

    // Sub-dropdown right edge overlaps main dropdown left border by 1px — no gap
    let x = mainPos.x - SUB_W + 1
    let y = catR.top

    // If no space on left, show on the right side (touching main dropdown right edge)
    if (x < bounds.left) {
      x = mainPos.x + MAIN_W - 1
    }

    const section = NODE_SECTIONS[hoveredCategory]
    const subH = section ? section.items.length * 32 + 36 : 200
    y = Math.max(bounds.top, Math.min(y, bounds.bottom - subH))

    setSubPos({ x, y })
  }, [hoveredCategory, mainPos, constraint])

  const handleMenuEnter = useCallback(() => cancelClose(), [cancelClose])
  const handleMenuLeave = useCallback(() => scheduleClose(), [scheduleClose])

  const handleCategoryEnter = useCallback((index: number) => {
    cancelClose()
    setHoveredCategory(index)
  }, [cancelClose])

  const handleCategoryLeave = useCallback(() => {
    // Don't close category immediately — the mouse might be moving to the sub-dropdown
    // The sub-dropdown's onMouseEnter will call cancelClose
  }, [])

  const handleSubEnter = useCallback(() => cancelClose(), [cancelClose])
  const handleSubLeave = useCallback(() => {
    setHoveredCategory(null)
    scheduleClose()
  }, [scheduleClose])

  // Keyboard navigation for the sub-dropdown items
  const currentCategoryItems = hoveredCategory !== null ? NODE_SECTIONS[hoveredCategory]?.items ?? [] : []

  const handleSubExecute = useCallback(
    (index: number) => {
      const item = currentCategoryItems[index]
      if (item) {
        onPick(item.kind)
        onClose()
      }
    },
    [currentCategoryItems, onPick, onClose],
  )

  const { menuRef: subMenuRef, activeIndex, registerItem: registerSubItem, setHoverIndex: setSubHoverIndex, handleKeyDown: handleSubKeyDown } =
    useMenuKeyboard({
      open: open && hoveredCategory !== null,
      itemCount: currentCategoryItems.length,
      onClose,
      onExecute: handleSubExecute,
    })

  // Merge refs for the sub-dropdown (smart-position + keyboard focus)
  const mergedSubRef = useCallback(
    (el: HTMLDivElement | null) => {
      ;(subMenuRef as React.MutableRefObject<HTMLDivElement | null>).current = el
    },
    [subMenuRef],
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

      {/* Both dropdowns live inside one container for unified mouse handling */}
      {open && mainPos && (
        <div
          ref={menuRef}
          onMouseEnter={handleMenuEnter}
          onMouseLeave={handleMenuLeave}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Main dropdown — categories */}
          <div
            role="menu"
            aria-label="Node types"
            className="fixed z-[calc(var(--Eulinx-z-dropdown)+1)] min-w-[170px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
            style={{ left: mainPos.x, top: mainPos.y }}
          >
            {NODE_SECTIONS.map((section, si) => (
              <div
                key={section.label}
                data-cat={si}
                onMouseEnter={() => handleCategoryEnter(si)}
                onMouseLeave={handleCategoryLeave}
              >
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  className={`flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[12px] transition-colors duration-100 outline-none ${
                    hoveredCategory === si
                      ? "bg-[color:var(--Eulinx-color-hover)] text-[color:var(--Eulinx-color-text)]"
                      : "text-[color:var(--Eulinx-color-text-secondary)]"
                  }`}
                >
                  <ChevronUp
                    className={`h-3 w-3 shrink-0 text-[color:var(--Eulinx-color-text-muted)] transition-transform duration-150 ${
                      hoveredCategory === si ? "-rotate-90" : ""
                    }`}
                    strokeWidth={2}
                  />
                  <span className="flex-1 text-left">{section.label}</span>
                  <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">{section.items.length}</span>
                </button>
              </div>
            ))}
          </div>

          {/* Sub-dropdown — nodes in the hovered category */}
          {hoveredCategory !== null && subPos && (
            <div
              ref={mergedSubRef}
              role="menu"
              aria-label={NODE_SECTIONS[hoveredCategory]?.label}
              className="fixed z-[calc(var(--Eulinx-z-dropdown)+2)] min-w-[170px] animate-[ctx-in_80ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
              style={{ left: subPos.x, top: subPos.y }}
              onMouseEnter={handleSubEnter}
              onMouseLeave={handleSubLeave}
              onKeyDown={handleSubKeyDown}
            >
              <div className="px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]" role="presentation">
                {NODE_SECTIONS[hoveredCategory]?.label}
              </div>
              <div className="my-0.5 h-px bg-[color:var(--Eulinx-color-border)]" role="separator" />
              {NODE_SECTIONS[hoveredCategory]?.items.map((opt, ii) => (
                <button
                  key={opt.kind}
                  ref={(el) => registerSubItem(ii, el)}
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  data-active={activeIndex === ii || undefined}
                  className={`flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[12px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] outline-none ${
                    activeIndex === ii ? "bg-[color:var(--Eulinx-color-hover)]" : ""
                  }`}
                  onMouseEnter={() => setSubHoverIndex(ii)}
                  onClick={() => { onPick(opt.kind); onClose() }}
                >
                  <AppIcon name={opt.icon} className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Context menu trigger wrapper
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
