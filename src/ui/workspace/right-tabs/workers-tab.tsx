type WorkerStatus = "running" | "idle" | "error"

interface Worker {
  readonly name: string
  readonly status: WorkerStatus
  readonly desc: string
  readonly progress?: number
  readonly meta: readonly string[]
}

const WORKERS: readonly Worker[] = [
  {
    name: "Build Agent",
    status: "running",
    desc: "Compiling TypeScript and bundling assets",
    progress: 72,
    meta: ["72%", "·", "2m elapsed"],
  },
  {
    name: "Test Runner",
    status: "idle",
    desc: "Vitest — 42 tests, all passing",
    meta: ["5m ago", "·", "42/42 passed"],
  },
  {
    name: "Deploy Preview",
    status: "error",
    desc: "Build succeeded but deploy timed out",
    meta: ["12m ago", "·", "retry"],
  },
]

const DOT_STYLE: Record<WorkerStatus, React.CSSProperties> = {
  running: { background: "var(--wsx-green)", boxShadow: "0 0 6px rgba(74,222,128,.4)" },
  idle: { background: "var(--wsx-text-muted)" },
  error: { background: "var(--wsx-red)" },
}

export function WorkersTab() {
  return (
    <div className="flex-1 overflow-y-auto pt-2">
      {WORKERS.map((worker) => (
        <div
          key={worker.name}
          className="mx-4 my-2 rounded-[var(--wsx-r-md)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] p-3 transition-colors hover:border-[color:var(--wsx-border-strong)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={DOT_STYLE[worker.status]} />
            <span className="flex-1 text-xs font-medium text-[color:var(--wsx-text)]">
              {worker.name}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[color:var(--wsx-text-muted)]">
              {worker.status}
            </span>
          </div>
          <div className="mb-2 text-[11px] text-[color:var(--wsx-text-muted)]">{worker.desc}</div>
          {worker.progress !== undefined && (
            <div className="h-[3px] overflow-hidden rounded-[2px] bg-[color:var(--wsx-bg-elevated)]">
              <div
                className="h-full rounded-[2px]"
                style={{ width: `${worker.progress}%`, background: "var(--wsx-accent)" }}
              />
            </div>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-[color:var(--wsx-text-muted)]">
            {worker.meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
