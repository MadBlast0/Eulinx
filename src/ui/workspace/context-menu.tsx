import { useEffect } from "react"
import { Globe, LayoutGrid, Squircle, TerminalSquare } from "lucide-react"
import { useWorkspace } from "./use-workspace"
import { ShellPicker } from "./terminal/shell-picker"

export function ContextMenu() {
  const { contextMenu, closeContextMenu, addNode, autoLayout } = useWorkspace()

  useEffect(() => {
    if (!contextMenu) return
    const onClick = () => closeContextMenu()
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [contextMenu, closeContextMenu])

  if (!contextMenu) return null

  return (
    <div
      className="fixed z-[var(--Eulinx-z-dropdown)] min-w-[180px] animate-[ctx-in_120ms_ease] rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface-elevated)] p-1.5 shadow-[var(--Eulinx-elev-lg)]"
      style={{ left: contextMenu.x, top: contextMenu.y }}
      onClick={(e) => e.stopPropagation()}
    >
       <div className="flex items-center">
         <Item icon={<TerminalSquare className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Add Terminal" shortcut="T" onClick={() => addNode("terminal")} />
         <ShellPicker align="right" onPick={(shell) => addNode("terminal", shell)} />
       </div>
      <Item icon={<Globe className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Add Browser" shortcut="B" onClick={() => addNode("browser")} />
      <Item icon={<Squircle className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Add Worker" shortcut="W" onClick={() => addNode("worker")} />
      <div className="my-1 h-px bg-[color:var(--Eulinx-color-border)]" />
      <Item icon={<LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />} label="Auto-layout" shortcut="Shift+A" onClick={autoLayout} />
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
      className="flex h-[30px] w-full items-center gap-2.5 rounded-[var(--Eulinx-radius-sm)] px-3 text-[12.5px] text-[color:var(--Eulinx-color-text)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)]"
    >
      <span className="text-[color:var(--Eulinx-color-text-muted)]">{icon}</span>
      {label}
      <kbd className="ml-auto text-[10px] text-[color:var(--Eulinx-color-text-muted)]">{shortcut}</kbd>
    </button>
  )
}
