export function ChecksTab() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col items-start gap-2 px-4 py-6">
        <h3 className="text-sm font-semibold text-[color:var(--wsx-text)]">No pull request found</h3>
        <p className="text-xs leading-normal text-[color:var(--wsx-text-muted)]">
          Create a pull request to start checks and review.
        </p>
        <button
          type="button"
          className="mt-1 rounded-[var(--wsx-r-sm)] border border-[color:var(--wsx-border)] bg-[color:var(--wsx-bg-surface)] px-4 py-2 text-xs text-[color:var(--wsx-text-sec)] transition-colors hover:bg-[color:var(--wsx-bg-hover)] hover:text-[color:var(--wsx-text)]"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
