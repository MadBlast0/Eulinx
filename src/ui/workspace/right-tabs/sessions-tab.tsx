import { useState } from "react"
import { ChevronRight, Search } from "lucide-react"
import { cn } from "@/utils/cn"

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
      <div className="mx-4 mb-2 mt-3 flex overflow-hidden rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)]">
        {(["workspace", "project", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "flex-1 p-2 text-center text-xs capitalize transition-colors",
              filter === f
                ? "bg-[color:var(--wsx-bg-elevated)] text-[color:var(--wsx-text)]"
                : "text-[color:var(--wsx-text-muted)]",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="mx-4 mb-2 flex items-center gap-2 rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-3 py-2 text-xs text-[color:var(--wsx-text-muted)]">
        <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
        <input type="text" placeholder="Search sessions" className="w-full" />
      </div>

      <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-[color:var(--wsx-text-sec)]">
        <span className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" strokeWidth={1.5} />
          Coding/Cutsy
        </span>
        <span className="rounded-[var(--wsx-r-sm)] bg-[color:var(--wsx-bg-elevated)] px-1.5 py-px text-[10px] font-medium text-[color:var(--wsx-text-muted)]">
          20
        </span>
      </div>

      {SESSIONS.map((session, i) => (
        <button
          key={i}
          type="button"
          className="w-full border-b border-[color:var(--wsx-border)] px-4 py-3 text-left transition-colors hover:bg-[color:var(--wsx-bg-hover)]"
        >
          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-[color:var(--wsx-text)]">
            {session.name}
          </div>
          <div className="mt-0.5 line-clamp-2 text-[11px] text-[color:var(--wsx-text-muted)]">
            {session.preview}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-[color:var(--wsx-text-muted)]">
            {session.badge && (
              <span className="rounded-[3px] bg-[color:var(--wsx-bg-elevated)] px-1 text-[10px]">
                {session.badge}
              </span>
            )}
            {session.meta.map((m, mi) => (
              <span key={mi}>{m}</span>
            ))}
          </div>
        </button>
      ))}
    </div>
  )
}
