import { useEffect, useState } from "react"
import { AppIcon } from "./app-icon"
import { useWorkspace } from "./use-workspace"
import { ShellPicker } from "./terminal/shell-picker"
import { ContextMenuTrigger } from "./node-sub-menu"

interface ContextMenuProps {
  /** Bounding rect of the parent container (e.g. canvas viewport) to constrain sub-dropdowns */
  constraint?: DOMRect | null
}

export function ContextMenu({ constraint }: ContextMenuProps) {
  const { contextMenu, closeContextMenu, addNode, autoLayout } = useWorkspace()
  const [addNodeOpen, setAddNodeOpen] = useState(false)

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
      className="fixed z-[var(--Eulinx-z-dropdown)] min-w-[200px] animate-[ctx-in_120ms_ease] rounded-lg border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1 shadow-lg"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Terminal with shell picker */}
      <div className="flex items-center">
        <Item
          icon={<AppIcon name="terminal" className="h-3.5 w-3.5" strokeWidth={2} />}
          label="Add Terminal"
          shortcut="T"
          onClick={() => addNode("terminal")}
        />
        <ShellPicker align="right" onPick={(shell) => addNode("terminal", shell)} />
      </div>
      {/* Add Node with sub-dropdown */}
      <ContextMenuTrigger
        open={addNodeOpen}
        onOpen={() => setAddNodeOpen(true)}
        onClose={() => setAddNodeOpen(false)}
        onPick={(kind) => addNode(kind)}
        icon={<AppIcon name="variables" className="h-3.5 w-3.5" strokeWidth={2} />}
        label="Add Node"
        shortcut="N"
        constraint={constraint}
      />
      <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" />
      <Item
        icon={<AppIcon name="conditions" className="h-3.5 w-3.5" strokeWidth={2} />}
        label="Auto-layout"
        shortcut="Shift+A"
        onClick={autoLayout}
      />
    </div>
  )
}

function Item({
  icon,
  label,
  shortcut,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  shortcut: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-full items-center gap-2.5 rounded-md px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors duration-100 hover:bg-[color:var(--Eulinx-color-hover)]"
    >
      <span className="text-[color:var(--Eulinx-color-text-muted)]">{icon}</span>
      {label}
      <kbd className="ml-auto text-[10px] text-[color:var(--Eulinx-color-text-muted)]">{shortcut}</kbd>
    </button>
  )
}
