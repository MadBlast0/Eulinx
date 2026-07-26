import { useCallback, useEffect, useMemo } from "react"
import { AppIcon } from "./app-icon"
import { useWorkspace } from "./use-workspace"
import { useMenuKeyboard } from "./use-menu-keyboard"
import type { EulinxNodeKind } from "./node-graph/node-types"

// ---------------------------------------------------------------------------
// Per-node-kind specific menu items
// ---------------------------------------------------------------------------

interface NodeMenuItem {
  label: string
  icon: string
  shortcut?: string
  action: "rename" | "duplicate" | "delete" | "custom"
  customKey?: string
}

function getNodeMenuItems(kind: string): NodeMenuItem[] {
  const specific: NodeMenuItem[] = []

  switch (kind as EulinxNodeKind) {
    case "terminal":
      specific.push(
        { label: "Change Shell", icon: "terminal", action: "custom", customKey: "changeShell" },
        { label: "Expand", icon: "panel", shortcut: "E", action: "custom", customKey: "expand" },
      )
      break
    case "browser":
      specific.push(
        { label: "Open URL", icon: "api", action: "custom", customKey: "openUrl" },
        { label: "Change URL", icon: "api", action: "custom", customKey: "changeUrl" },
      )
      break
    case "worker":
      specific.push(
        { label: "View Status", icon: "graph", action: "custom", customKey: "viewStatus" },
        { label: "View Logs", icon: "logs", action: "custom", customKey: "viewLogs" },
      )
      break
    case "agent":
      specific.push(
        { label: "View Status", icon: "aiAgent", action: "custom", customKey: "viewStatus" },
        { label: "Configure", icon: "settings", action: "custom", customKey: "configure" },
      )
      break
    case "session":
      specific.push(
        { label: "View Session", icon: "network", action: "custom", customKey: "viewSession" },
      )
      break
    case "prompt":
      specific.push(
        { label: "Edit Prompt", icon: "prompt", action: "custom", customKey: "editPrompt" },
      )
      break
    case "memory":
      specific.push(
        { label: "Browse Memory", icon: "harddrive", action: "custom", customKey: "browseMemory" },
      )
      break
    case "file":
      specific.push(
        { label: "Open File", icon: "file", action: "custom", customKey: "openFile" },
      )
      break
    case "tool":
      specific.push(
        { label: "Configure", icon: "tool", action: "custom", customKey: "configure" },
      )
      break
    case "note":
      specific.push(
        { label: "Edit Note", icon: "note", action: "custom", customKey: "editNote" },
      )
      break
    case "event":
      specific.push(
        { label: "View Events", icon: "event", action: "custom", customKey: "viewEvents" },
      )
      break
    case "metric":
      specific.push(
        { label: "View Metrics", icon: "diagnostics", action: "custom", customKey: "viewMetrics" },
      )
      break
    case "log":
      specific.push(
        { label: "View Logs", icon: "logs", action: "custom", customKey: "viewLogs" },
      )
      break
    case "map":
      specific.push(
        { label: "Fit to View", icon: "map", action: "custom", customKey: "fitView" },
      )
      break
    case "router":
    case "merge":
      break
  }

  return specific
}

// ---------------------------------------------------------------------------
// Common actions (always shown at bottom)
// ---------------------------------------------------------------------------

const COMMON_ITEMS: NodeMenuItem[] = [
  { label: "Rename", icon: "variables", shortcut: "F2", action: "rename" },
  { label: "Duplicate", icon: "graph", shortcut: "Ctrl+D", action: "duplicate" },
  { label: "Delete", icon: "event", shortcut: "Del", action: "delete" },
]

// ---------------------------------------------------------------------------
// NodeContextMenu component
// ---------------------------------------------------------------------------

interface NodeContextMenuProps {
  constraint?: DOMRect | null
  restoreFocusRef?: React.RefObject<HTMLElement | null>
}

export function NodeContextMenu({ constraint, restoreFocusRef }: NodeContextMenuProps) {
  const { contextMenu, closeContextMenu, removeNode } = useWorkspace()

  const { nodeId, nodeKind } = contextMenu ?? {}
  const specificItems = useMemo(
    () => getNodeMenuItems(nodeKind ?? "unknown"),
    [nodeKind],
  )
  const allItems = useMemo(
    () => [...specificItems, ...COMMON_ITEMS],
    [specificItems],
  )
  const itemCount = allItems.length

  const handleExecute = useCallback(
    (index: number) => {
      const item = allItems[index]
      if (!item || !nodeId) return
      executeItem(item, nodeId, removeNode)
      closeContextMenu()
    },
    [allItems, nodeId, removeNode, closeContextMenu],
  )

  const { menuRef, activeIndex, registerItem, setHoverIndex, handleKeyDown } =
    useMenuKeyboard({
      open: !!contextMenu?.nodeId,
      itemCount,
      onClose: closeContextMenu,
      onExecute: handleExecute,
      restoreFocusRef,
    })

  // Outside click — close on any document click
  useEffect(() => {
    if (!contextMenu?.nodeId) return
    const onClick = () => closeContextMenu()
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [contextMenu, closeContextMenu])

  if (!contextMenu?.nodeId) return null

  const { x, y, nodeId: nid, nodeKind: kind, nodeLabel } = contextMenu

  // Clamp position within constraint
  const menuW = 200
  const menuH = itemCount > 5 ? 280 : 140
  let px = x
  let py = y
  if (constraint) {
    px = Math.max(constraint.left, Math.min(x, constraint.right - menuW))
    py = Math.max(constraint.top, Math.min(y, constraint.bottom - menuH))
  }

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`${nodeLabel ?? "Node"} actions`}
      className="fixed z-[var(--Eulinx-z-dropdown)] min-w-[200px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
      style={{ left: px, top: py }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      {/* Node header */}
      <div className="flex items-center gap-2 px-3 py-1.5" role="presentation">
        <AppIcon
          name={kind === "terminal" ? "terminal" : "variables"}
          className="h-3.5 w-3.5 text-[color:var(--Eulinx-color-text-muted)]"
          strokeWidth={2}
        />
        <span className="text-[11px] font-medium text-[color:var(--Eulinx-color-text-muted)] truncate">
          {nodeLabel}
        </span>
      </div>
      <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" role="separator" />

      {/* All items */}
      {allItems.map((item, i) => (
        <MenuItem
          key={item.label}
          item={item}
          index={i}
          isActive={activeIndex === i}
          danger={item.action === "delete"}
          registerItem={registerItem}
          onHover={() => setHoverIndex(i)}
          onClick={() => {
            if (nid) executeItem(item, nid, removeNode)
            closeContextMenu()
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Menu item — shared between node and canvas context menus
// ---------------------------------------------------------------------------

interface MenuItemProps {
  item: NodeMenuItem
  index: number
  isActive: boolean
  danger?: boolean
  registerItem: (index: number, el: HTMLElement | null) => void
  onHover: () => void
  onClick: () => void
}

export function MenuItem({
  item,
  index,
  isActive,
  danger,
  registerItem,
  onHover,
  onClick,
}: MenuItemProps) {
  return (
    <button
      ref={(el) => registerItem(index, el)}
      type="button"
      role="menuitem"
      tabIndex={-1}
      aria-disabled={false}
      data-active={isActive || undefined}
      className={`flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] outline-none ${
        isActive ? "bg-[color:var(--Eulinx-color-hover)]" : ""
      } ${
        danger
          ? "text-[color:var(--Eulinx-color-error)]"
          : "text-[color:var(--Eulinx-color-text)]"
      }`}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <span className="text-[color:var(--Eulinx-color-text-muted)]">
        <AppIcon name={item.icon} className="h-3.5 w-3.5" strokeWidth={2} />
      </span>
      {item.label}
      {item.shortcut && (
        <kbd className="ml-auto text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
          {item.shortcut}
        </kbd>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Shared action executor
// ---------------------------------------------------------------------------

function executeItem(
  item: NodeMenuItem,
  nodeId: string,
  removeNode: (id: string) => void,
) {
  switch (item.action) {
    case "delete":
      removeNode(nodeId)
      break
    case "rename":
      window.dispatchEvent(
        new CustomEvent("eulinx:node-rename", { detail: { nodeId } }),
      )
      break
    case "duplicate":
      window.dispatchEvent(
        new CustomEvent("eulinx:node-duplicate", { detail: { nodeId } }),
      )
      break
    case "custom":
      window.dispatchEvent(
        new CustomEvent("eulinx:node-action", {
          detail: { nodeId, action: item.customKey },
        }),
      )
      break
  }
}
