/**
 * P18-UI-DASH — Dashboard Surface
 *
 * Main dashboard: overview of workers, sessions, artifacts, and recent activity.
 * From WorkspaceLayout-Part01 §CenterCanvas.
 */

import { useRuntimeStore } from "@/stores/runtime-store"

export function Dashboard() {
  const { workers, sessions, artifacts, workflowRuns, isConnected } = useRuntimeStore()

  const workerCount = Object.keys(workers).length
  const sessionCount = Object.keys(sessions).length
  const artifactCount = Object.keys(artifacts).length
  const activeRuns = Object.values(workflowRuns).filter((r) => r.state === "running").length

  return (
    <div className="flex h-full flex-col gap-4 p-4 overflow-y-auto">
      <h2 className="text-lg font-semibold">Dashboard</h2>

      {/* Connection Status */}
      <div className="flex items-center gap-2 text-sm">
        <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-muted-foreground">{isConnected ? "Connected" : "Disconnected"}</span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Workers" value={workerCount} />
        <StatCard label="Sessions" value={sessionCount} />
        <StatCard label="Artifacts" value={artifactCount} />
        <StatCard label="Active Runs" value={activeRuns} />
      </div>

      {/* Recent Workers */}
      <div className="rounded-lg border p-4">
        <h3 className="mb-2 text-sm font-medium">Recent Workers</h3>
        {workerCount === 0 ? (
          <p className="text-sm text-muted-foreground">No workers active</p>
        ) : (
          <div className="space-y-2">
            {Object.values(workers).slice(0, 5).map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm">
                <span>{w.role}</span>
                <span className="text-muted-foreground">{w.state}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
