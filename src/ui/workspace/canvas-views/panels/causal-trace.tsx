import { useState } from "react"
import { GitBranch, Search } from "lucide-react"
import { Input, ScrollArea } from "@/components/ui"
import { PanelScaffold } from "../../panels/panel-scaffold"
import { cn } from "@/utils/cn"

interface TraceEntry {
  readonly id: string
  readonly cause: string
  readonly effect: string
  readonly confidence: number
  readonly timestamp: string
}

export default function CausalTrace() {
  const [query, setQuery] = useState("")
  const [traces] = useState<readonly TraceEntry[]>([])

  const filtered = traces.filter(
    (t) =>
      t.cause.toLowerCase().includes(query.toLowerCase()) ||
      t.effect.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <PanelScaffold title="Causal Trace" onRefresh={() => {}}>
      <div className="flex h-full flex-col">
        <div className="border-b border-[color:var(--Eulinx-color-border)] p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--Eulinx-color-text-muted)]" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search causal traces..."
              aria-label="Search causal traces"
              className="h-7 pl-7 text-xs"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-1 p-2">
            {filtered.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                No causal traces found.
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--Eulinx-radius-sm)] px-3 py-1.5 text-left transition-colors",
                    "hover:bg-[color:var(--Eulinx-color-hover)]",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  )}
                >
                  <GitBranch className="h-3.5 w-3.5 shrink-0 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={1.5} />
                  <span className="flex-1 truncate text-xs text-[color:var(--Eulinx-color-text)]">
                    {t.cause} → {t.effect}
                  </span>
                  <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                    {(t.confidence * 100).toFixed(0)}%
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
