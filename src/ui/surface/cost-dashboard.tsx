/**
 * P18-UI-COSTDASH — Cost Dashboard Surface
 *
 * Cost tracking: tokens, dollars, budget usage.
 * From CostOptimization-Part01 through Part06.
 */

import { useRuntimeStore } from "@/stores/runtime-store"

export function CostDashboard() {
  const { workers } = useRuntimeStore()
  const workerList = Object.values(workers)
  const totalCost = workerList.reduce((sum, w) => sum + w.costUsd, 0)
  const totalTokens = workerList.reduce((sum, w) => sum + w.tokensUsed, 0)

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Cost Dashboard</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">${totalCost.toFixed(4)}</div>
          <div className="text-xs text-muted-foreground">Total Cost</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Tokens</div>
        </div>
      </div>

      <div className="rounded-lg border">
        <div className="border-b px-4 py-2 text-sm font-medium">Cost by Worker</div>
        {workerList.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No cost data</div>
        ) : (
          <div className="divide-y">
            {workerList.map((w) => (
              <div key={w.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="font-mono text-xs">{w.id.slice(0, 8)}</span>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{w.tokensUsed.toLocaleString()} tokens</span>
                  <span className="font-medium">${w.costUsd.toFixed(4)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
