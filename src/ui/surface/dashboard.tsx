/**
 * P18-UI-DASH — Dashboard Surface
 *
 * Main dashboard: overview of workers, sessions, artifacts, and recent activity.
 * From WorkspaceLayout-Part01 §CenterCanvas.
 *
 * Seeds demo data on first render so the dashboard is never empty.
 */

import { useEffect } from "react"
import { useRuntimeStore, type Worker, type Session, type Artifact, type WorkflowRun } from "@/stores/runtime-store"

const DEMO_WORKERS: Worker[] = [
  { id: "w-1", role: "coder", state: "working", sessionId: "s-1", health: "healthy", tokensUsed: 12400, costUsd: 0.18, createdAt: "2026-07-19T01:00:00Z", updatedAt: "2026-07-19T03:45:00Z" },
  { id: "w-2", role: "reviewer", state: "idle", sessionId: "s-2", health: "healthy", tokensUsed: 8200, costUsd: 0.12, createdAt: "2026-07-19T01:30:00Z", updatedAt: "2026-07-19T03:30:00Z" },
  { id: "w-3", role: "researcher", state: "blocked", sessionId: null, health: "unhealthy", tokensUsed: 3100, costUsd: 0.04, createdAt: "2026-07-19T02:00:00Z", updatedAt: "2026-07-19T03:40:00Z" },
  { id: "w-4", role: "planner", state: "idle", sessionId: "s-3", health: "healthy", tokensUsed: 5600, costUsd: 0.08, createdAt: "2026-07-19T02:15:00Z", updatedAt: "2026-07-19T03:20:00Z" },
]

const DEMO_SESSIONS: Session[] = [
  { id: "s-1", kind: "chat", state: "active", messageCount: 24, createdAt: "2026-07-19T01:00:00Z" },
  { id: "s-2", kind: "terminal", state: "active", messageCount: 8, createdAt: "2026-07-19T01:30:00Z" },
  { id: "s-3", kind: "agent", state: "paused", messageCount: 12, createdAt: "2026-07-19T02:15:00Z" },
]

const DEMO_ARTIFACTS: Artifact[] = [
  { id: "a-1", kind: "file", state: "merged", size: 4200, producedBy: "w-1", createdAt: "2026-07-19T03:00:00Z" },
  { id: "a-2", kind: "diff", state: "verified", size: 1800, producedBy: "w-2", createdAt: "2026-07-19T03:15:00Z" },
]

const DEMO_RUNS: WorkflowRun[] = [
  { runId: "r-1", workflowId: "wf-deploy", state: "running", completedNodes: 3, totalNodes: 5, startedAt: "2026-07-19T03:30:00Z" },
  { runId: "r-2", workflowId: "wf-test", state: "succeeded", completedNodes: 4, totalNodes: 4, startedAt: "2026-07-19T02:00:00Z" },
]

export function Dashboard() {
  const { workers, sessions, artifacts, workflowRuns, isConnected, applyWorkerCreated, applySessionUpdated, applyArtifactCreated, applyWorkflowRunUpdated, setConnected } = useRuntimeStore()

  useEffect(() => {
    setConnected(true)
    for (const w of DEMO_WORKERS) applyWorkerCreated(w)
    for (const s of DEMO_SESSIONS) applySessionUpdated(s)
    for (const a of DEMO_ARTIFACTS) applyArtifactCreated(a)
    for (const r of DEMO_RUNS) applyWorkflowRunUpdated(r)
  }, [])

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
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${w.state === "working" ? "bg-green-500" : w.state === "blocked" ? "bg-yellow-500" : w.state === "failed" ? "bg-red-500" : "bg-muted-foreground"}`} />
                  {w.role}
                </span>
                <span className="text-muted-foreground">{w.state}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Runs */}
      {activeRuns > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-medium">Active Workflow Runs</h3>
          <div className="space-y-2">
            {Object.values(workflowRuns).filter((r) => r.state === "running").map((run) => (
              <div key={run.runId} className="flex items-center justify-between text-sm">
                <span>{run.workflowId}</span>
                <span className="text-muted-foreground">{run.completedNodes}/{run.totalNodes} nodes</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
