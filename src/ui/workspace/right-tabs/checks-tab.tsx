import { useWorkers } from "../workers-store"

export function ChecksTab() {
  const { workers } = useWorkers()

  const activeWorkers = workers.filter((w) => w.status === "running")

  return (
    <div className="flex-1 overflow-y-auto">
      {activeWorkers.length > 0 ? (
        <div className="flex flex-col gap-3 px-4 py-4">
          <h3 className="text-sm font-semibold text-[color:var(--Eulinx-color-text)]">Active Workers</h3>
          {activeWorkers.map((w) => (
            <div
              key={w.id}
              className="rounded-[var(--Eulinx-radius-md)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] p-3"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[color:var(--Eulinx-color-success)]" />
                <span className="text-xs font-medium text-[color:var(--Eulinx-color-text)]">{w.name}</span>
              </div>
              <p className="mt-1 text-[11px] text-[color:var(--Eulinx-color-text-muted)]">{w.desc}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2 px-4 py-6">
          <h3 className="text-sm font-semibold text-[color:var(--Eulinx-color-text)]">No active checks</h3>
          <p className="text-xs leading-normal text-[color:var(--Eulinx-color-text-muted)]">
            Spawn a worker to see its status here.
          </p>
          <button
            type="button"
            className="mt-1 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-4 py-2 text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}
