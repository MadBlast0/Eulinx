import { Dot } from "../primitives"
import { useWorkers, STATUS_TONE } from "../workers-store"
import { EmptyState } from "../right-sidebar"

export function WorkersTab() {
  const { workers } = useWorkers()

  if (workers.length === 0) {
    return (
      <EmptyState
        icon={
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M12 6V2H8" />
            <path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
            <path d="M2 12h2" />
            <path d="M9 11v2" />
            <path d="M15 11v2" />
            <path d="M20 12h2" />
          </svg>
        }
        title="No workers running"
        description="Spawn a worker to get started with background tasks."
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-2">
      {workers.map((worker) => (
        <div
          key={worker.id}
          className="mb-1.5 rounded-md border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-3 py-2 transition-colors hover:border-[color:var(--Eulinx-color-border-strong)]"
        >
          {/* Header row */}
          <div className="flex items-center gap-2">
            <Dot tone={STATUS_TONE[worker.status]} />
            <span className="flex-1 truncate text-xs font-medium text-[color:var(--Eulinx-color-text)]">
              {worker.name}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-[color:var(--Eulinx-color-text-muted)]">
              {worker.status}
            </span>
          </div>

          {/* Description */}
          <p className="mt-1 text-[11px] leading-snug text-[color:var(--Eulinx-color-text-muted)]">
            {worker.desc}
          </p>

          {/* Progress bar */}
          <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[color:var(--Eulinx-color-surface-sunken)]">
            <div
              className="h-full rounded-full bg-[color:var(--Eulinx-color-accent)] transition-[width]"
              style={{ width: `${worker.utilization}%` }}
            />
          </div>

          {/* Metadata */}
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-[color:var(--Eulinx-color-text-muted)]">
            {worker.meta.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
