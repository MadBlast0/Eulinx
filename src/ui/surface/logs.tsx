/**
 * P18-UI-LOGS — Logs Surface
 *
 * Real-time log viewer for runtime events.
 * From RuntimeManager-Part01 §Diagnostics.
 */

export function Logs() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Logs</h2>
        <div className="flex gap-2">
          <button className="rounded bg-muted px-3 py-1 text-xs hover:bg-muted/80">Clear</button>
          <button className="rounded bg-muted px-3 py-1 text-xs hover:bg-muted/80">Export</button>
        </div>
      </div>

      <div className="flex gap-2 text-xs">
        <span className="rounded bg-green-100 px-2 py-1 text-green-800">INFO</span>
        <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800">WARN</span>
        <span className="rounded bg-red-100 px-2 py-1 text-red-800">ERROR</span>
      </div>

      <div className="flex-1 rounded-lg border bg-muted/30 p-3 font-mono text-xs">
        <div className="text-muted-foreground">Logs will stream here in real-time.</div>
      </div>
    </div>
  )
}
