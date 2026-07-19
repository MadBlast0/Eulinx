import { Dot } from "../primitives"
import type { Tone } from "../state"

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

const STATUS_TONE: Record<WorkerStatus, Tone> = {
  running: "success",
  idle: "neutral",
  error: "error",
}

export function WorkersTab() {
  return (
    <div className="flex-1 overflow-y-auto pt-2">
      {WORKERS.map((worker) => (
        <div
          key={worker.name}
          className="mx-4 my-2 rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-3 transition-colors hover:border-[color:var(--Eulinx-color-border-strong)]"
        >
          <div className="mb-2 flex items-center gap-2">
            <Dot tone={STATUS_TONE[worker.status]} />
            <span className="flex-1 text-xs font-medium text-[color:var(--Eulinx-color-text)]">
              {worker.name}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
              {worker.status}
            </span>
          </div>
          <div className="mb-2 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{worker.desc}</div>
          {worker.progress !== undefined && (
            <div className="h-[3px] overflow-hidden rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-surface-sunken)]">
              <div
                className="h-full rounded-[var(--Eulinx-radius-xs)] bg-[color:var(--Eulinx-color-accent)] transition-[width]"
                style={{ width: `${worker.progress}%` }}
              />
            </div>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
            {worker.meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
