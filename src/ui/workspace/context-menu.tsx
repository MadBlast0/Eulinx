import { useCallback, useEffect, useState } from "react"
import { AppIcon } from "./app-icon"
import { useWorkspace } from "./use-workspace"
import { useMenuKeyboard } from "./use-menu-keyboard"
import { ContextMenuTrigger } from "./node-sub-menu"

interface ContextMenuProps {
  /** Bounding rect of the parent container (e.g. canvas viewport) to constrain sub-dropdowns */
  constraint?: DOMRect | null
  restoreFocusRef?: React.RefObject<HTMLElement | null>
}

export function ContextMenu({ constraint, restoreFocusRef }: ContextMenuProps) {
  const { contextMenu, closeContextMenu, addNode, autoLayout } = useWorkspace()
  const [addNodeOpen, setAddNodeOpen] = useState(false)

  // Canvas context menu has 3 items: Add Terminal, Add Node (with sub-menu), Auto-layout
  const itemCount = 3

  const handleExecute = useCallback(
    (index: number) => {
      switch (index) {
        case 0:
          addNode("terminal")
          break
        case 1:
          // Add Node — toggle sub-menu open
          setAddNodeOpen((v) => !v)
          return // don't close parent menu
        case 2:
          autoLayout()
          break
      }
      closeContextMenu()
    },
    [addNode, autoLayout, closeContextMenu],
  )

  const { menuRef, activeIndex, registerItem, setHoverIndex, handleKeyDown } =
    useMenuKeyboard({
      open: !!contextMenu && !contextMenu.nodeId,
      itemCount,
      onClose: closeContextMenu,
      onExecute: handleExecute,
      restoreFocusRef,
    })

  // Outside click — close on any document click
  useEffect(() => {
    if (!contextMenu) return
    const onClick = () => closeContextMenu()
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [contextMenu, closeContextMenu])

  // Reset sub-menu state when context menu closes
  useEffect(() => {
    if (!contextMenu) setAddNodeOpen(false)
  }, [contextMenu])

  if (!contextMenu || contextMenu.nodeId) return null

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Canvas actions"
      className="fixed z-[var(--Eulinx-z-dropdown)] min-w-[200px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
    >
      <CanvasMenuItem
        item={{
          icon: <AppIcon name="terminal" className="h-3.5 w-3.5" strokeWidth={2} />,
          label: "Add Terminal",
          shortcut: "T",
        }}
        index={0}
        isActive={activeIndex === 0}
        registerItem={registerItem}
        onHover={() => setHoverIndex(0)}
        onClick={() => {
          addNode("terminal")
          closeContextMenu()
        }}
      />

      {/* Add Node with sub-dropdown */}
      <ContextMenuTrigger
        open={addNodeOpen}
        onOpen={() => setAddNodeOpen(true)}
        onClose={() => setAddNodeOpen(false)}
        onPick={(kind) => { addNode(kind); closeContextMenu() }}
        icon={<AppIcon name="variables" className="h-3.5 w-3.5" strokeWidth={2} />}
        label="Add Node"
        shortcut="N"
        constraint={constraint}
        index={1}
        isActive={activeIndex === 1}
        registerItem={registerItem}
        onHover={() => setHoverIndex(1)}
      />

      <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" role="separator" />

      <CanvasMenuItem
        item={{
          icon: <AppIcon name="conditions" className="h-3.5 w-3.5" strokeWidth={2} />,
          label: "Auto-layout",
          shortcut: "Shift+A",
        }}
        index={2}
        isActive={activeIndex === 2}
        registerItem={registerItem}
        onHover={() => setHoverIndex(2)}
        onClick={() => {
          autoLayout()
          closeContextMenu()
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Canvas menu item (same shape as node-context-menu but with ReactNode icon)
// ---------------------------------------------------------------------------

interface CanvasMenuItemData {
  icon: React.ReactNode
  label: string
  shortcut: string
}

interface CanvasMenuItemProps {
  item: CanvasMenuItemData
  index: number
  isActive: boolean
  registerItem: (index: number, el: HTMLElement | null) => void
  onHover: () => void
  onClick: () => void
}

function CanvasMenuItem({
  item,
  index,
  isActive,
  registerItem,
  onHover,
  onClick,
}: CanvasMenuItemProps) {
  return (
    <button
      ref={(el) => registerItem(index, el)}
      type="button"
      role="menuitem"
      tabIndex={-1}
      data-active={isActive || undefined}
      className={`flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)] outline-none ${
        isActive ? "bg-[color:var(--Eulinx-color-hover)]" : ""
      }`}
      onMouseEnter={onHover}
      onClick={onClick}
    >
      <span className="text-[color:var(--Eulinx-color-text-muted)]">{item.icon}</span>
      {item.label}
      <kbd className="ml-auto text-[10px] text-[color:var(--Eulinx-color-text-muted)]">{item.shortcut}</kbd>
    </button>
  )
}
