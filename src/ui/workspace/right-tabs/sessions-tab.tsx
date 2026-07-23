import { useState } from "react"
import { Search } from "lucide-react"
import { ListRow, StateBadge } from "../primitives"
import {
  EmptyState,
  SearchField,
  SegmentedControl,
  SectionHeader,
} from "../right-sidebar"

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
  const [query, setQuery] = useState("")

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Filter + search ── */}
      <div className="flex flex-col gap-2 px-3 pt-2 pb-2">
        <SegmentedControl
          value={filter}
          options={[
            { value: "workspace", label: "Workspace" },
            { value: "project", label: "Project" },
            { value: "all", label: "All" },
          ]}
          onChange={setFilter}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Search sessions" />
      </div>

      {/* ── Session list ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Folder header */}
        <SectionHeader label="Coding / Cutsy" count={20} />

        {SESSIONS.length === 0 ? (
          <EmptyState
            icon={<Search className="h-5 w-5" strokeWidth={1.5} />}
            title="No sessions found"
            description="Sessions will appear here once created."
          />
        ) : (
          SESSIONS.map((session, i) => (
            <SessionRow key={i} session={session} />
          ))
        )}
      </div>
    </div>
  )
}

function SessionRow({ session }: { session: Session }) {
  return (
    <ListRow
      role="button"
      tabIndex={0}
      className="mx-1.5 flex-col items-stretch !gap-0.5 px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--Eulinx-color-ring)]"
    >
      {/* Title */}
      <span className="truncate text-xs font-medium text-[color:var(--Eulinx-color-text)]">
        {session.name}
      </span>

      {/* Preview */}
      <span className="truncate text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
        {session.preview}
      </span>

      {/* Metadata */}
      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
        {session.badge && (
          <StateBadge tone="neutral" className="text-[10px]">{session.badge}</StateBadge>
        )}
        {session.meta.map((m, mi) => (
          <span key={mi}>{m}</span>
        ))}
      </span>
    </ListRow>
  )
}
