import type { ReactNode } from "react"
import { X } from "lucide-react"
import { cn } from "@/utils/cn"
import { ToolbarButton, ToolbarSep } from "../primitives"

interface PanelScaffoldProps {
  readonly title: string
  readonly onClose?: () => void
  readonly onRefresh?: () => void
  readonly actions?: ReactNode
  readonly tabs?: ReactNode
  readonly children: ReactNode
  readonly className?: string
}

/** Shared panel header shell: title, toolbar actions (close/refresh), optional tabs. */
export function PanelScaffold({
  title,
  onClose,
  onRefresh,
  actions,
  tabs,
  children,
  className,
}: PanelScaffoldProps) {
  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div
        className="flex h-8 shrink-0 items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3"
        style={{ background: "var(--Eulinx-color-toolbar)" }}
      >
        <span
          className="truncate text-xs font-medium"
          style={{ color: "var(--Eulinx-color-text)" }}
        >
          {title}
        </span>
        {tabs ? <div className="ml-2 flex items-center gap-1">{tabs}</div> : null}
        <div className="flex-1" />
        {actions}
        {actions ? <ToolbarSep /> : null}
        {onRefresh ? (
          <ToolbarButton tip="Refresh" size={24} aria-label="Refresh panel" onClick={onRefresh}>
            <RefreshIcon />
          </ToolbarButton>
        ) : null}
        {onClose ? (
          <ToolbarButton tip="Close" size={24} aria-label="Close panel" onClick={onClose}>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  )
}

export default PanelScaffold
