import { useMemo, useState } from "react"
import { Search, Star, Clock, FileText, Brain, Tag } from "lucide-react"
import { cn } from "@/utils/cn"
import { Input } from "@/components/ui"
import { ListRow, PanelSurface, StateBadge, Dot } from "../primitives"
import { type Tone } from "../state"

type Severity = "critical" | "important" | "reference" | "archived"

interface MemoryEntry {
  readonly id: string
  readonly title: string
  readonly kind: "fact" | "note" | "doc" | "concept"
  readonly severity: Severity
  readonly tags: readonly string[]
  readonly updated: string
}

const ENTRIES: readonly MemoryEntry[] = [
  { id: "m1", title: "Project architecture overview", kind: "doc", severity: "critical", tags: ["eulinx", "design"], updated: "2h" },
  { id: "m2", title: "Token system constraints", kind: "fact", severity: "important", tags: ["tokens", "lint"], updated: "5h" },
  { id: "m3", title: "Meeting notes — Q3 planning", kind: "note", severity: "reference", tags: ["planning"], updated: "1d" },
  { id: "m4", title: "Worker scheduling model", kind: "concept", severity: "important", tags: ["workers"], updated: "2d" },
  { id: "m5", title: "Deprecated API surface", kind: "fact", severity: "archived", tags: ["legacy"], updated: "12d" },
  { id: "m6", title: "Cost optimization ideas", kind: "note", severity: "reference", tags: ["cost"], updated: "14d" },
]

const SEVERITY_TONE: Record<Severity, Tone> = {
  critical: "error",
  important: "warning",
  reference: "info",
  archived: "neutral",
}

const KIND_ICON: Record<MemoryEntry["kind"], React.ReactNode> = {
  fact: <Star className="h-3.5 w-3.5" strokeWidth={1.5} />,
  note: <FileText className="h-3.5 w-3.5" strokeWidth={1.5} />,
  doc: <Brain className="h-3.5 w-3.5" strokeWidth={1.5} />,
  concept: <Tag className="h-3.5 w-3.5" strokeWidth={1.5} />,
}

const FILTERS: readonly { readonly id: Severity | "all"; readonly label: string }[] = [
  { id: "all", label: "All" },
  { id: "critical", label: "Critical" },
  { id: "important", label: "Important" },
  { id: "reference", label: "Reference" },
  { id: "archived", label: "Archived" },
]

export default function MemoryBrowser() {
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<Severity | "all">("all")

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ENTRIES.filter((e) => {
      if (filter !== "all" && e.severity !== filter) return false
      if (!q) return true
      return (
        e.title.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [query, filter])

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-[color:var(--Eulinx-color-text)]">Memory</h1>
          <p className="text-xs text-[color:var(--Eulinx-color-text-muted)]">
            {results.length} of {ENTRIES.length} entries
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search memory…"
            aria-label="Search memory"
            className="bg-[color:var(--Eulinx-color-surface-sunken)] pl-8"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-[color:var(--Eulinx-color-border)] px-6 py-2">
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={active}
              className={cn(
                "rounded-[var(--Eulinx-radius-sm)] px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                active
                  ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                  : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)]",
              )}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <PanelSurface className="divide-y divide-[color:var(--Eulinx-color-border)]">
          {results.map((entry) => (
            <ListRow key={entry.id} className="justify-between px-4 py-3">
              <span className="flex items-center gap-3">
                <span className="text-[color:var(--Eulinx-color-text-muted)]">{KIND_ICON[entry.kind]}</span>
                <span className="flex flex-col">
                  <span className="text-[color:var(--Eulinx-color-text)]">{entry.title}</span>
                  <span className="flex items-center gap-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                    {entry.tags.map((t) => (
                      <span key={t} className="rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)] px-1.5 py-0.5">
                        {t}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1 font-mono text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  <Clock className="h-3 w-3" strokeWidth={1.5} />
                  {entry.updated}
                </span>
                <StateBadge tone={SEVERITY_TONE[entry.severity]}>
                  <Dot tone={SEVERITY_TONE[entry.severity]} />
                  {entry.severity}
                </StateBadge>
              </span>
            </ListRow>
          ))}
          {results.length === 0 && (
            <div className="px-4 py-10 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
              No memory entries match your search.
            </div>
          )}
        </PanelSurface>
      </div>
    </div>
  )
}
