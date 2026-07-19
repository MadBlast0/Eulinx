/**
 * P18-UI-LOGS — Logs Surface
 *
 * Real-time log viewer for runtime events.
 * From RuntimeManager-Part01 §Diagnostics.
 *
 * Shows demo log entries with level filtering.
 */

import { useState, useCallback, useMemo } from "react"

type LogLevel = "info" | "warn" | "error"

interface LogEntry {
  readonly id: number
  readonly timestamp: string
  readonly level: LogLevel
  readonly source: string
  readonly message: string
}

const DEMO_LOGS: LogEntry[] = [
  { id: 1, timestamp: "03:45:01", level: "info", source: "system", message: "Application started" },
  { id: 2, timestamp: "03:45:02", level: "info", source: "worker-coder", message: "Worker w-1 initialized (role: coder)" },
  { id: 3, timestamp: "03:45:03", level: "info", source: "worker-reviewer", message: "Worker w-2 initialized (role: reviewer)" },
  { id: 4, timestamp: "03:45:04", level: "warn", source: "worker-researcher", message: "Worker w-3 health check failed — retrying" },
  { id: 5, timestamp: "03:45:05", level: "info", source: "session", message: "Session s-1 created (kind: chat)" },
  { id: 6, timestamp: "03:45:10", level: "info", source: "worker-coder", message: "Processing task: refactor auth module" },
  { id: 7, timestamp: "03:45:15", level: "error", source: "worker-researcher", message: "API rate limit exceeded — backing off 30s" },
  { id: 8, timestamp: "03:45:20", level: "info", source: "workflow", message: "Run r-1 started (workflow: deploy)" },
  { id: 9, timestamp: "03:45:25", level: "info", source: "worker-coder", message: "Artifact a-1 produced (file: auth.ts)" },
  { id: 10, timestamp: "03:45:30", level: "warn", source: "system", message: "Memory usage at 78% — consider cleanup" },
  { id: 11, timestamp: "03:45:35", level: "info", source: "worker-reviewer", message: "Artifact a-2 verified (diff: 1800 bytes)" },
  { id: 12, timestamp: "03:45:40", level: "info", source: "workflow", message: "Run r-2 completed successfully" },
]

const LEVEL_COLORS: Record<LogLevel, string> = {
  info: "text-green-600",
  warn: "text-yellow-600",
  error: "text-red-600",
}

const LEVEL_BG: Record<LogLevel, string> = {
  info: "bg-green-100 text-green-800",
  warn: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
}

export function Logs() {
  const [activeLevels, setActiveLevels] = useState<Set<LogLevel>>(new Set(["info", "warn", "error"]))
  const [logs] = useState<LogEntry[]>(DEMO_LOGS)

  const toggleLevel = useCallback((level: LogLevel) => {
    setActiveLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }, [])

  const filteredLogs = useMemo(
    () => logs.filter((l) => activeLevels.has(l.level)),
    [logs, activeLevels],
  )

  const handleExport = useCallback(() => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.source}] ${l.message}`).join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "eulinx-logs.txt"
    a.click()
    URL.revokeObjectURL(url)
  }, [filteredLogs])

  return (
    <div className="flex h-full flex-col gap-3 p-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Logs</h2>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded bg-muted px-3 py-1 text-xs hover:bg-muted/80"
            onClick={() => setActiveLevels(new Set(["info", "warn", "error"]))}
          >
            Reset
          </button>
          <button
            type="button"
            className="rounded bg-muted px-3 py-1 text-xs hover:bg-muted/80"
            onClick={handleExport}
          >
            Export
          </button>
        </div>
      </div>

      <div className="flex gap-2 text-xs">
        {(["info", "warn", "error"] as const).map((level) => (
          <button
            key={level}
            type="button"
            className={`rounded px-2 py-1 transition-opacity ${activeLevels.has(level) ? LEVEL_BG[level] : "bg-muted text-muted-foreground opacity-50"}`}
            onClick={() => toggleLevel(level)}
          >
            {level.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-muted-foreground">No logs match the selected filters.</div>
        ) : (
          filteredLogs.map((entry) => (
            <div key={entry.id} className="flex gap-2 py-0.5 leading-5">
              <span className="shrink-0 text-muted-foreground">{entry.timestamp}</span>
              <span className={`shrink-0 font-semibold ${LEVEL_COLORS[entry.level]}`}>{entry.level.toUpperCase().padEnd(5)}</span>
              <span className="shrink-0 text-muted-foreground">[{entry.source}]</span>
              <span>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
