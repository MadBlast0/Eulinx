import { useState } from "react"
import { Search } from "lucide-react"
import { Input, ScrollArea } from "@/components/ui"
import { PanelScaffold } from "../../panels/panel-scaffold"
import { StateBadge } from "../../primitives"
import { type Tone } from "../../state"
import { cn } from "@/utils/cn"

interface SearchResult {
  readonly id: string
  readonly kind: "memory" | "knowledge" | "session" | "vector"
  readonly title: string
  readonly snippet: string
  readonly score: number
}

const KIND_TONE: Record<SearchResult["kind"], Tone> = {
  memory: "info",
  knowledge: "accent",
  session: "success",
  vector: "warning",
}

export default function UnifiedSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<readonly SearchResult[]>([])

  const handleSearch = (value: string) => {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      return
    }
    // Placeholder: results populated by HelixDB bridge
    setResults([])
  }

  return (
    <PanelScaffold title="Unified Search" onRefresh={() => handleSearch(query)}>
      <div className="flex h-full flex-col">
        <div className="border-b border-[color:var(--Eulinx-color-border)] p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search memory, knowledge, sessions, vectors..."
              aria-label="Unified search"
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {results.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                {query ? "No results found." : "Type to search across all data stores."}
              </div>
            ) : (
              results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={cn(
                    "flex flex-col gap-1 rounded-[var(--Eulinx-radius-sm)] px-3 py-2 text-left transition-colors",
                    "hover:bg-[color:var(--Eulinx-color-hover)]",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StateBadge tone={KIND_TONE[r.kind]}>{r.kind}</StateBadge>
                    <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">
                      {r.title}
                    </span>
                    <span className="ml-auto text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <span className="text-[11px] text-[color:var(--Eulinx-color-text-secondary)] line-clamp-2">
                    {r.snippet}
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
