export function ChecksTab() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-start gap-2 px-4 py-6">
        <h3 className="text-sm font-semibold text-[color:var(--Eulinx-color-text)]">No pull request found</h3>
        <p className="text-xs leading-normal text-[color:var(--Eulinx-color-text-muted)]">
          Create a pull request to start checks and review.
        </p>
        <button
          type="button"
          className="mt-1 rounded-[var(--Eulinx-radius-sm)] border border-[color:var(--Eulinx-color-border)] bg-[color:var(--Eulinx-color-surface)] px-4 py-2 text-xs text-[color:var(--Eulinx-color-text-secondary)] transition-colors hover:bg-[color:var(--Eulinx-color-hover)] hover:text-[color:var(--Eulinx-color-text)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
