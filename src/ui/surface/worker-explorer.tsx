/**
 * P18-UI-WORKEREXP — Worker Explorer Surface
 *
 * Detailed view of workers: hierarchy, health, capabilities.
 * From WorkerHierarchy-Part01 through Part06.
 */

import { useRuntimeStore } from "@/stores/runtime-store"

export function WorkerExplorer() {
  const { workers } = useRuntimeStore()
  const workerList = Object.values(workers)

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Worker Explorer</h2>

      {workerList.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
          No workers active. Workers will appear here when spawned.
        </div>
      ) : (
        <div className="space-y-3">
          {workerList.map((w) => (
            <div key={w.id} className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{w.id}</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{w.role}</span>
                </div>
                <span className={`text-xs font-medium ${
                  w.state === "working" ? "text-yellow-600" :
                  w.state === "idle" ? "text-green-600" :
                  w.state === "failed" ? "text-red-600" : "text-muted-foreground"
                }`}>
                  {w.state}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>Health: {w.health}</div>
                <div>Tokens: {w.tokensUsed.toLocaleString()}</div>
                <div>Cost: ${w.costUsd.toFixed(4)}</div>
                <div>Session: {w.sessionId ?? "none"}</div>
                <div>Created: {new Date(w.createdAt).toLocaleTimeString()}</div>
                <div>Updated: {new Date(w.updatedAt).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
