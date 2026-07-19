/**
 * TerminalView — toolbar (copy / clear / search / zoom / close).
 *
 * Token-styled chrome above the xterm grid. Each control is a real button
 * (separate from the tab chip, TerminalView-Part03 §Tab Strip) and is fully
 * keyboard operable. Icons come from the Eulinx registry via <Icon>; we map to
 * the closest existing icon keys (see README "missing icon keys").
 */

import { type ReactNode } from "react"
import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { FOCUS_RING_STYLE } from "@/a11y/focus-ring"
import type { PtyStatus } from "./pty"

export interface TerminalToolbarProps {
  readonly title: string
  readonly status: PtyStatus
  readonly onCopy: () => void
  readonly onClear: () => void
  readonly onSearch: () => void
  readonly onZoomIn: () => void
  readonly onZoomOut: () => void
  readonly onClose?: () => void
}

const STATUS_COLOR: Record<PtyStatus, string> = {
  spawning: "var(--Eulinx-color-text-muted)",
  running: "var(--Eulinx-color-success)",
  exited: "var(--Eulinx-color-error)",
  killing: "var(--Eulinx-color-warning)",
  detached: "var(--Eulinx-color-text-muted)",
}

export function TerminalToolbar({
  title,
  status,
  onCopy,
  onClear,
  onSearch,
  onZoomIn,
  onZoomOut,
  onClose,
}: TerminalToolbarProps): ReactNode {
  return (
    <div
      className="flex shrink-0 items-center gap-2 px-2 py-1"
      style={{
        background: token("--Eulinx-color-panel-header-bg"),
        borderBottom: `var(--Eulinx-border-thin) solid ${token("--Eulinx-color-border")}`,
      }}
      role="toolbar"
      aria-label="Terminal controls"
    >
      <span
        aria-hidden
        style={{
          width: token("--Eulinx-space-2"),
          height: token("--Eulinx-space-2"),
          borderRadius: token("--Eulinx-radius-full"),
          background: STATUS_COLOR[status],
        }}
      />
      <span
        className="truncate text-role-label"
        style={{ color: token("--Eulinx-color-text") }}
        title={title}
      >
        {title}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <ToolbarButton label="Zoom out" icon="nav.collapse" onClick={onZoomOut} />
        <ToolbarButton label="Zoom in" icon="nav.expand" onClick={onZoomIn} />
        <ToolbarButton label="Find in terminal" icon="domain.search" onClick={onSearch} />
        <ToolbarButton label="Copy selection" icon="action.copy" onClick={onCopy} />
        <ToolbarButton label="Clear terminal" icon="action.delete" onClick={onClear} />
        {onClose && <ToolbarButton label="Close terminal" icon="nav.close" onClick={onClose} />}
      </div>
    </div>
  )
}

function ToolbarButton({
  label,
  icon,
  onClick,
}: {
  label: string
  icon: string
  onClick: () => void
}): ReactNode {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{ ...FOCUS_RING_STYLE }}
      className="flex h-7 w-7 items-center justify-center rounded hover:bg-[color:var(--Eulinx-color-surface-2)]"
    >
      <Icon name={icon} size="sm" aria-hidden />
    </button>
  )
}
