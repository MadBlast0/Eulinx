import { useState } from "react"
import { Search } from "lucide-react"
import { Input, ScrollArea } from "@/components/ui"
import { PanelScaffold } from "../../panels/panel-scaffold"
import { StateBadge } from "../../primitives"
import { cn } from "@/utils/cn"

interface KnowledgeNode {
  readonly id: string
  readonly title: string
  readonly source: string
  readonly relationships: number
}

export default function KnowledgeGraph() {
  const [query, setQuery] = useState("")
  const [nodes] = useState<readonly KnowledgeNode[]>([])

  const filtered = nodes.filter(
    (n) =>
      n.title.toLowerCase().includes(query.toLowerCase()) ||
      n.source.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <PanelScaffold title="Knowledge Graph" onRefresh={() => {}}>
      <div className="flex h-full flex-col">
        <div className="border-b border-[color:var(--Eulinx-color-border)] p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search knowledge graph..."
              aria-label="Search knowledge graph"
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {filtered.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                No knowledge nodes found.
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
                  <StateBadge tone="info">knowledge</StateBadge>
                  <span className="flex-1 truncate text-xs text-[color:var(--Eulinx-color-text)]">
                    {n.title}
                  </span>
                  <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                    {n.relationships} relations
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
