import { Copy, Trash2, Plus, Search } from "lucide-react"
import { ToolbarButton, ToolbarSep } from "../primitives"
import { cn } from "@/utils/cn"

export interface TerminalToolbarProps {
  readonly onCopy?: () => void
  readonly onClear?: () => void
  readonly onNew?: () => void
  readonly onToggleSearch?: () => void
  readonly searchOpen?: boolean
  readonly className?: string
}

export function TerminalToolbar({
  onCopy,
  onClear,
  onNew,
  onToggleSearch,
  searchOpen = false,
  className,
}: TerminalToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 border-b border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-toolbar)] px-2 py-1",
        className,
      )}
    >
      <ToolbarButton
        tip="Copy output"
        aria-label="Copy terminal output"
        onClick={onCopy}
      >
        <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton
        tip="Clear terminal"
        aria-label="Clear terminal"
        onClick={onClear}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarButton
        tip="Search output"
        aria-label="Search terminal output"
        aria-pressed={searchOpen}
        active={searchOpen}
        onClick={onToggleSearch}
      >
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
      <ToolbarSep />
      <ToolbarButton
        tip="New terminal"
        aria-label="New terminal"
        onClick={onNew}
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
      </ToolbarButton>
    </div>
  )
}
