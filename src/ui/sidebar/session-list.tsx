/**
 * Eulinx Sidebar — Session history list (newest first).
 *
 * Each row shows the session title, worker/artifact counts, and an open/closed
 * pill (icon + label + color token, never color alone).
 */

import { Icon } from "@/ui/icons"
import { token } from "@/ui/tokens"
import { StatePill } from "./state-pill"
import type { SessionSummary, SidebarNavigate } from "./sidebar-data"

export interface SessionListProps {
  readonly sessions: readonly SessionSummary[]
  readonly onNavigate: SidebarNavigate
  readonly selection: string | null
}

export function SessionList({
  sessions,
  onNavigate,
  selection,
}: SessionListProps): React.ReactElement {
  if (sessions.length === 0) {
    return (
      <div className="px-2 py-1 text-role-caption" style={{ color: token("--Eulinx-color-text-muted") }}>
        No sessions
      </div>
    )
  }
  return (
    <ul role="list" aria-label="Session history" className="flex flex-col">
      {sessions.map((s) => {
        const open = s.endedAt === null
        const selected = selection === s.sessionId
        return (
          <li key={s.sessionId}>
            <button
              type="button"
              aria-selected={selected}
              onClick={() => onNavigate({ kind: "session", id: s.sessionId })}
              className="flex w-full items-center gap-2 px-2 py-1 text-left"
              style={{
                color: selected ? token("--Eulinx-color-accent") : token("--Eulinx-color-text-primary"),
                background: selected ? token("--Eulinx-color-elevated-2") : "transparent",
                outline: "none",
              }}
            >
              <Icon name="domain.session" size="xs" aria-hidden />
              <span className="truncate text-role-caption" title={s.title}>
                {s.title}
              </span>
              <span style={{ marginLeft: "auto" }}>
                <StatePill
                  icon={open ? "status.success" : "status.info"}
                  label={open ? "Open" : "Closed"}
                  colorToken={open ? "--Eulinx-color-state-working" : "--Eulinx-color-text-muted"}
                />
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
