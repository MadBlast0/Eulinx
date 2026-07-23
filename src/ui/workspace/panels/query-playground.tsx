import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Play, Download, Trash2, AlertTriangle, ChevronRight, Copy, Check } from "lucide-react"
import { AppIcon } from "../app-icon"
import { cn } from "@/utils/cn"
import { Button, ScrollArea, Textarea } from "@/components/ui"
import { getConfig } from "@/core/config"
import { HelixDBClient } from "@/integrations/helixdb/helixdb-client"
import type { HelixDBQueryEnvelope, HelixDBResponse } from "@/integrations/helixdb/helixdb-types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QueryHistoryEntry {
  readonly id: string
  readonly query: string
  readonly timestamp: number
  readonly durationMs: number
  readonly resultCount: number
  readonly error: string | null
}

interface QueryTemplate {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly query: string
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const TEMPLATES: readonly QueryTemplate[] = [
  {
    id: "all-memories",
    label: "All memories",
    description: "Fetch first 10 Memory nodes",
    query: 'nWithLabel("Memory").limit(10)',
  },
  {
    id: "event-timeline",
    label: "Event timeline",
    description: "Most recent events, descending by time",
    query: 'nWithLabel("Event").orderByDesc("emittedAt").limit(20)',
  },
  {
    id: "session-events",
    label: "Session events",
    description: "Events linked to a session",
    query: 'n(sessionId).out("HAS_EVENT")',
  },
  {
    id: "workspace-stats",
    label: "Workspace stats",
    description: "Count of nodes per label",
    query: [
      "nWithLabel(\"Memory\").count()",
      "nWithLabel(\"Knowledge\").count()",
      "nWithLabel(\"Event\").count()",
      "nWithLabel(\"Session\").count()",
    ].join("\n"),
  },
  {
    id: "search-knowledge",
    label: "Search knowledge",
    description: "Full-text search over Knowledge nodes",
    query: 'textSearchNodes("Knowledge", "chunkText", "query terms")',
  },
]

const MAX_HISTORY = 20

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createClient(): HelixDBClient {
  const config = getConfig()
  return new HelixDBClient(config.helixdb)
}

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

// ---------------------------------------------------------------------------
// JSON tree renderer
// ---------------------------------------------------------------------------

function JsonValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null) {
    return <span className="text-[color:var(--Eulinx-color-text-muted)] italic">null</span>
  }
  if (value === undefined) {
    return <span className="text-[color:var(--Eulinx-color-text-muted)] italic">undefined</span>
  }
  if (typeof value === "boolean") {
    return <span className="text-emerald-500">{String(value)}</span>
  }
  if (typeof value === "number") {
    return <span className="text-sky-500">{value}</span>
  }
  if (typeof value === "string") {
    const truncated = value.length > 120 ? value.slice(0, 120) + "…" : value
    return (
      <span className="text-amber-500">
        &quot;{truncated}&quot;
      </span>
    )
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-[color:var(--Eulinx-color-text-muted)]">[]</span>
    return (
      <span>
        <span className="text-[color:var(--Eulinx-color-text-muted)]">[</span>
        {value.map((item, i) => (
          <span key={i}>
            {i > 0 && <span className="text-[color:var(--Eulinx-color-text-muted)]">, </span>}
            <JsonValue value={item} depth={depth + 1} />
          </span>
        ))}
        <span className="text-[color:var(--Eulinx-color-text-muted)]">]</span>
      </span>
    )
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-[color:var(--Eulinx-color-text-muted)]">{"{}"}</span>
    const indent = "  ".repeat(depth + 1)
    const closingIndent = "  ".repeat(depth)
    return (
      <span>
        <span className="text-[color:var(--Eulinx-color-text-muted)]">{"{\n"}</span>
        {entries.map(([k, v], i) => (
          <span key={k}>
            {i > 0 && <span className="text-[color:var(--Eulinx-color-text-muted)]">{"\n"}</span>}
            <span className={indent}>
              <span className="text-purple-400">&quot;{k}&quot;</span>
              <span className="text-[color:var(--Eulinx-color-text-muted)]">: </span>
              <JsonValue value={v} depth={depth + 1} />
              {i < entries.length - 1 && <span className="text-[color:var(--Eulinx-color-text-muted)]">,</span>}
            </span>
          </span>
        ))}
        <span className="text-[color:var(--Eulinx-color-text-muted)]">
          {"\n" + closingIndent + "}"}
        </span>
      </span>
    )
  }
  return <span>{String(value)}</span>
}

function JsonTree({ data }: { data: unknown }) {
  return (
    <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
      <JsonValue value={data} />
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Results table
// ---------------------------------------------------------------------------

function ResultsTable({ rows }: { rows: readonly Record<string, unknown>[] }) {
  const columns = useMemo(() => {
    if (rows.length === 0) return []
    const keys = new Set<string>()
    for (const row of rows) {
      for (const k of Object.keys(row)) keys.add(k)
    }
    return Array.from(keys)
  }, [rows])

  if (columns.length === 0) {
    return <div className="p-4 text-xs text-[color:var(--Eulinx-color-text-muted)]">No results</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs">
        <thead>
          <tr className="border-b border-[color:var(--Eulinx-color-border)]">
            {columns.map((col) => (
              <th
                key={col}
                className="whitespace-nowrap px-3 py-2 text-left font-medium text-[color:var(--Eulinx-color-text-muted)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-b border-[color:var(--Eulinx-color-border)] last:border-0 hover:bg-[color:var(--Eulinx-color-hover)]"
            >
              {columns.map((col) => (
                <td
                  key={col}
                  className="max-w-[300px] truncate whitespace-nowrap px-3 py-2 text-[color:var(--Eulinx-color-text)]"
                >
                  {renderCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "object") {
    const str = JSON.stringify(value)
    return str.length > 80 ? str.slice(0, 80) + "…" : str
  }
  return String(value)
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface QueryPlaygroundProps {
  readonly workspaceId: string
}

export function QueryPlayground({ workspaceId }: QueryPlaygroundProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<HelixDBResponse | null>(null)
  const [history, setHistory] = useState<readonly QueryHistoryEntry[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"tree" | "table">("tree")
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const clientRef = useRef<HelixDBClient | null>(null)

  useEffect(() => {
    clientRef.current = createClient()
    return () => {
      clientRef.current?.cancel()
    }
  }, [])

  const runQuery = useCallback(async () => {
    const q = query.trim()
    if (!q || running) return
    if (!clientRef.current) {
      setError("HelixDB client not initialized")
      return
    }

    setRunning(true)
    setError(null)
    setResults(null)
    const start = performance.now()

    try {
      const envelope: HelixDBQueryEnvelope = { query: q }
      const response = await clientRef.current.query(envelope)
      const durationMs = Math.round(performance.now() - start)

      if (!response.ok) {
        const errorMsg = response.error.message
        setError(errorMsg)
        setHistory((prev) => [
          { id: generateId(), query: q, timestamp: Date.now(), durationMs, resultCount: 0, error: errorMsg },
          ...prev,
        ].slice(0, MAX_HISTORY))
      } else {
        setResults(response.value)
        setHistory((prev) => [
          {
            id: generateId(),
            query: q,
            timestamp: Date.now(),
            durationMs,
            resultCount: response.value.results.length,
            error: null,
          },
          ...prev,
        ].slice(0, MAX_HISTORY))
      }
    } catch (err: unknown) {
      const durationMs = Math.round(performance.now() - start)
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      setHistory((prev) => [
        { id: generateId(), query: q, timestamp: Date.now(), durationMs, resultCount: 0, error: msg },
        ...prev,
      ].slice(0, MAX_HISTORY))
    } finally {
      setRunning(false)
    }
  }, [query, running])

  const exportResults = useCallback(() => {
    if (!results) return
    const json = JSON.stringify(results, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `helixdb-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [results])

  const copyResults = useCallback(() => {
    if (!results) return
    navigator.clipboard.writeText(JSON.stringify(results, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [results])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        runQuery()
      }
    },
    [runQuery],
  )

  const loadTemplate = useCallback((template: QueryTemplate) => {
    setQuery(template.query)
    setError(null)
    setResults(null)
  }, [])

  const loadHistoryEntry = useCallback((entry: QueryHistoryEntry) => {
    setQuery(entry.query)
    setError(null)
    setResults(null)
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  const resultCount = results?.results.length ?? 0

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <AppIcon name="artifacts" className="h-4 w-4 text-[color:var(--Eulinx-color-text-muted)]" strokeWidth={2.25} />
          <span className="text-sm font-medium text-[color:var(--Eulinx-color-text)]">
            HelixDB Query Playground
          </span>
          <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
            {workspaceId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {results && (
            <>
              <Button variant="ghost" size="sm" onClick={copyResults} className="h-7 gap-1 text-xs">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button variant="ghost" size="sm" onClick={exportResults} className="h-7 gap-1 text-xs">
                <Download className="h-3 w-3" />
                Export JSON
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar: templates + history */}
        <div
          className={cn(
            "flex flex-col border-r border-[color:var(--Eulinx-color-border)] transition-all",
            showHistory ? "w-64" : "w-10",
          )}
        >
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex h-8 items-center gap-1.5 border-b border-[color:var(--Eulinx-color-border)] px-2 text-xs text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]"
          >
            <ChevronRight
              className={cn("h-3 w-3 transition-transform", showHistory && "rotate-90")}
              strokeWidth={2.25}
            />
            {showHistory && "Templates & History"}
          </button>

          {showHistory && (
            <ScrollArea className="flex-1">
              {/* Templates */}
              <div className="p-2">
                <div className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                  Templates
                </div>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadTemplate(t)}
                    className="flex w-full flex-col rounded-[var(--Eulinx-radius-sm)] px-2 py-1.5 text-left hover:bg-[color:var(--Eulinx-color-hover)]"
                  >
                    <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">
                      {t.label}
                    </span>
                    <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                      {t.description}
                    </span>
                  </button>
                ))}
              </div>

              {/* History */}
              <div className="border-t border-[color:var(--Eulinx-color-border)] p-2">
                <div className="mb-1 flex items-center justify-between px-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                    History ({history.length})
                  </span>
                  {history.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="text-[color:var(--Eulinx-color-text-muted)] hover:text-[color:var(--Eulinx-color-text)]"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2.25} />
                    </button>
                  )}
                </div>
                {history.length === 0 ? (
                  <div className="px-2 py-3 text-center text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                    No queries yet
                  </div>
                ) : (
                  history.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => loadHistoryEntry(entry)}
                      className="flex w-full flex-col rounded-[var(--Eulinx-radius-sm)] px-2 py-1.5 text-left hover:bg-[color:var(--Eulinx-color-hover)]"
                    >
                      <span className="flex items-center gap-1.5 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                        <AppIcon name="scheduler" className="h-2.5 w-2.5" strokeWidth={2.25} />
                        {formatTimestamp(entry.timestamp)}
                        <span className="text-[color:var(--Eulinx-color-text-secondary)]">
                          {formatDuration(entry.durationMs)}
                        </span>
                        {entry.error && (
                          <span className="text-red-500">error</span>
                        )}
                        {!entry.error && (
                          <span className="text-[color:var(--Eulinx-color-text-secondary)]">
                            {entry.resultCount} rows
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 truncate font-mono text-[10px] text-[color:var(--Eulinx-color-text)]">
                        {entry.query.length > 40 ? entry.query.slice(0, 40) + "…" : entry.query}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Main content */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Query editor */}
          <div className="flex flex-col border-b border-[color:var(--Eulinx-color-border)]">
            <div className="flex items-center gap-2 border-b border-[color:var(--Eulinx-color-border)] px-3 py-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[color:var(--Eulinx-color-text-muted)]">
                Query Editor
              </span>
              <span className="text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
                Ctrl+Enter to run
              </span>
            </div>
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your HelixQL query here..."
              aria-label="HelixQL query editor"
              className="min-h-[120px] resize-y border-0 rounded-none bg-[color:var(--Eulinx-color-surface-sunken)] font-mono text-xs text-[color:var(--Eulinx-color-text)] focus-visible:ring-0"
              spellCheck={false}
            />
            <div className="flex items-center gap-2 border-t border-[color:var(--Eulinx-color-border)] px-3 py-2">
              <Button
                size="sm"
                onClick={runQuery}
                disabled={!query.trim() || running}
                className="h-7 gap-1 text-xs"
              >
                <Play className="h-3 w-3" strokeWidth={2.25} />
                {running ? "Running..." : "Run Query"}
              </Button>
              {resultCount > 0 && (
                <span className="text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                  {resultCount} result{resultCount !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>

          {/* Results area */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {error && (
              <div className="flex items-start gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" strokeWidth={2.25} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-red-500">Query Error</div>
                  <div className="mt-0.5 break-words font-mono text-[11px] text-red-400">
                    {error}
                  </div>
                </div>
              </div>
            )}

            {!error && results && (
              <div className="flex items-center justify-between border-b border-[color:var(--Eulinx-color-border)] px-4 py-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("tree")}
                    className={cn(
                      "rounded-[var(--Eulinx-radius-sm)] px-2 py-0.5 text-[11px] transition-colors",
                      viewMode === "tree"
                        ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                        : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]",
                    )}
                  >
                    JSON Tree
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "rounded-[var(--Eulinx-radius-sm)] px-2 py-0.5 text-[11px] transition-colors",
                      viewMode === "table"
                        ? "bg-[color:var(--Eulinx-color-selected)] text-[color:var(--Eulinx-color-text)]"
                        : "text-[color:var(--Eulinx-color-text-muted)] hover:bg-[color:var(--Eulinx-color-hover)]",
                    )}
                  >
                    Table
                  </button>
                </div>
              </div>
            )}

            <ScrollArea className="flex-1">
              {!error && results && viewMode === "tree" && (
                <JsonTree data={results.results} />
              )}
              {!error && results && viewMode === "table" && (
                <ResultsTable rows={results.results} />
              )}
              {!error && !results && !running && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <AppIcon name="artifacts" className="mb-3 h-8 w-8 text-[color:var(--Eulinx-color-text-muted)] opacity-40" strokeWidth={2.25} />
                  <div className="text-sm text-[color:var(--Eulinx-color-text-muted)]">
                    Write a HelixQL query and press Run
                  </div>
                  <div className="mt-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">
                    or select a template from the sidebar
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QueryPlayground
