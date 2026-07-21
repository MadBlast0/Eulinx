import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { Input, ScrollArea } from "@/components/ui"
import { PanelScaffold } from "../../panels/panel-scaffold"
import { StateBadge } from "../../primitives"
import { type Tone } from "../../state"
import { cn } from "@/utils/cn"
import { useMemory } from "../../memory-store"

interface GraphNode {
  readonly id: string
  readonly label: string
  readonly kind: "fact" | "note" | "doc" | "concept"
  readonly connections: number
}

export default function MemoryGraph() {
  const { entries } = useMemory()
  const [query, setQuery] = useState("")

  const nodes: readonly GraphNode[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.id,
        label: e.title,
        kind: e.kind,
        connections: e.tags.length,
      })),
    [entries],
  )

  const filtered = nodes.filter(
    (n) => n.label.toLowerCase().includes(query.toLowerCase()),
  )

  const KIND_TONE: Record<GraphNode["kind"], Tone> = {
    fact: "accent",
    note: "info",
    doc: "success",
    concept: "warning",
  }

  return (
    <PanelScaffold title="Memory Graph" onRefresh={() => {}}>
      <div className="flex h-full flex-col">
        <div className="border-b border-[color:var(--Eulinx-color-border)] p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter memory nodes..."
              aria-label="Filter memory graph"
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {filtered.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                No memory nodes found.
              </div>
            ) : (
              filtered.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-3 py-1.5 text-left transition-colors",
                    "hover:bg-[color:var(--Eulinx-color-hover)]",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  )}
                >
                  <StateBadge tone={KIND_TONE[n.kind]}>{n.kind}</StateBadge>
                  <span className="flex-1 truncate text-xs text-[color:var(--Eulinx-color-text)]">
                    {n.label}
                  </span>
                  <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                    {n.connections} links
                  </span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </PanelScaffold>
  )
}
