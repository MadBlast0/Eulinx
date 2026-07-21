import { useState } from "react"
import { Play } from "lucide-react"
import { Button, Textarea, ScrollArea } from "@/components/ui"
import { PanelScaffold } from "../../panels/panel-scaffold"

interface QueryResult {
  readonly id: string
  readonly data: string
}

export default function QueryPlayground() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<readonly QueryResult[]>([])
  const [executing, setExecuting] = useState(false)

  const handleExecute = () => {
    if (!query.trim()) return
    setExecuting(true)
    // Placeholder: query execution via HelixDB bridge
    setTimeout(() => {
      setExecuting(false)
      setResults([])
    }, 100)
  }

  return (
    <PanelScaffold title="Query Playground" onRefresh={handleExecute}>
      <div className="flex h-full flex-col">
        <div className="border-b border-[color:var(--Eulinx-color-border)] p-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a HelixDB query..."
            aria-label="Query input"
            className="min-h-[80px] font-mono text-xs"
          />
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              onClick={handleExecute}
              disabled={executing || !query.trim()}
              className="h-7 gap-1.5 text-xs"
            >
              <Play className="h-3 w-3" strokeWidth={1.5} />
              {executing ? "Running..." : "Execute"}
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2">
            {results.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-[color:var(--Eulinx-color-text-muted)]">
                {executing ? "Executing query..." : "Results will appear here."}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {results.map((r) => (
                  <pre
                    key={r.id}
                    className="overflow-x-auto whitespace-pre-wrap rounded-[var(--Eulinx-radius-sm)] bg-[color:var(--Eulinx-color-surface)] p-2 font-mono text-[11px] text-[color:var(--Eulinx-color-text)]"
                  >
                    {r.data}
                  </pre>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </PanelScaffold>
  )
}
