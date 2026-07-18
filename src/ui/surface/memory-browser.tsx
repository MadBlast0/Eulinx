/**
 * P18-UI-MEMBROWSER — Memory Browser Surface
 *
 * Browse memory entries: STM, LTM, episodic, semantic.
 * From MemoryArchitecture-Part01 through Part06.
 */

export function MemoryBrowser() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Memory Browser</h2>

      <div className="flex gap-2 text-sm">
        <span className="rounded bg-muted px-2 py-1">STM</span>
        <span className="rounded bg-muted px-2 py-1">LTM</span>
        <span className="rounded bg-muted px-2 py-1">Episodic</span>
        <span className="rounded bg-muted px-2 py-1">Semantic</span>
      </div>

      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Memory entries will appear here. Search, browse, and manage memory across sessions.
      </div>
    </div>
  )
}
