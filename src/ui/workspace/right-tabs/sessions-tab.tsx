import { useState } from "react"
import { ChevronRight, Search } from "lucide-react"
import { cn } from "@/utils/cn"
import { ListRow, StateBadge } from "../primitives"

type Filter = "workspace" | "project" | "all"

interface Session {
  readonly name: string
  readonly preview: string
  readonly meta: readonly string[]
  readonly badge?: string
}

const SESSIONS: readonly Session[] = [
  {
    name: "Cutsy",
    preview: "Agent: You've hit your session limit",
    badge: "synthetic",
    meta: ["564 msgs", "·", "41m ago"],
  },
  {
    name: "Cutsy",
    preview: "Agent: Root cause: Effect Controls committed...",
    meta: ["claude-opus-4-8", "2251 msgs", "·", "2h ago"],
  },
  {
    name: "Untitled session",
    preview: "You: [Request interrupted by user]",
    meta: ["claude-opus-4-8", "497 msgs", "·", "1d ago"],
  },
]

export function SessionsTab() {
  const [filter, setFilter] = useState<Filter>("all")

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-4 mb-2 mt-3 flex overflow-hidden rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)]">
        {(["workspace", "project", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 p-2 text-center text-xs capitalize transition-colors",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              filter === f
                ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mx-4 mb-2 flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 text-xs text-[color:var(--Eulinx-color-text-muted)] transition-colors focus-within:border-[color:var(--Eulinx-color-ring)]">
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search sessions"
          aria-label="Search sessions"
          className="w-full bg-transparent text-[color:var(--Eulinx-color-text)] placeholder:text-[color:var(--Eulinx-color-text-muted)] focus-visible:outline-none"
        />
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-[color:var(--Eulinx-color-text-secondary)]">
        <span className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
          Coding/Cutsy
        </span>
        <span className="rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface-raised)] px-1.5 py-px text-[10px] font-medium text-[color:var(--Eulinx-color-text-muted)]">
          20
        </span>
      </div>

      {SESSIONS.map((session, i) => (
        <ListRow
          key={i}
          role="button"
          tabIndex={0}
          className="flex-col items-stretch border-b border-[color:var(--Eulinx-color-border)] px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-[color:var(--Eulinx-color-text)]">
            {session.name}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
            {session.preview}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
            {session.badge && (
              <StateBadge tone="neutral" className="text-[10px]">
                {session.badge}
              </StateBadge>
            )}
            {session.meta.map((m, mi) => (
              <span key={mi}>{m}</span>
            ))}
          </div>
        </ListRow>
      ))}
    </div>
  )
}
