/**
 * P18-UI-RUNTIMEMON — Runtime Monitor Surface
 *
 * Real-time view of runtime state: workers, processes, health.
 * From EventBus-Part01 §Event Mapping.
 */

import { useRuntimeStore } from "@/stores/runtime-store"

export function RuntimeMonitor() {
  const { workers, isConnected } = useRuntimeStore()
  const workerList = Object.values(workers)

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Runtime Monitor</h2>
        <div className="flex items-center gap-2 text-sm">
          <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
          <span className="text-muted-foreground">{isConnected ? "Live" : "Disconnected"}</span>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 text-sm font-medium">Workers</div>
        {workerList.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No workers</div>
        ) : (
          <div className="divide-y">
            {workerList.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${
                    w.state === "working" ? "bg-yellow-500" :
                    w.state === "idle" ? "bg-green-500" :
                    w.state === "failed" ? "bg-red-500" : "bg-gray-400"
                  }`} />
                  <span className="font-mono text-xs">{w.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground">{w.role}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{w.state}</span>
                  <span>{w.tokensUsed.toLocaleString()} tokens</span>
                  <span>${w.costUsd.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
