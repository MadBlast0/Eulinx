/**
 * Orchestrator Run — wire the workspace "Run" button to the orchestrator.
 *
 * Builds a UserGoal from the active node graph, constructs a
 * CoordinatorOrchestrator, and runs its state machine (start → onPlan →
 * onDelegate). Uses the OrchestratorRunner to execute each task through
 * the ProviderInvoker with actual AI provider calls.
 */

import { useCallback, useRef, useState } from "react"
import { brand } from "@/core/types"
import type { IsoTimestamp, JsonObject, WorkspaceId, SessionId } from "@/core/types"
import { generateId } from "@/core/uuid"
import type { RefinementMode } from "@/core/enums"
import { CoordinatorOrchestrator } from "@/orchestrator/roles/coordinator"
import type { PlannerGraphNode } from "@/orchestrator/roles/planner"
import type {
  OrchestratorConfig,
  Plan,
  ProgressReport,
  UserGoal,
} from "@/orchestrator/orchestrator-types"
import type { NodeGraphDoc } from "@/ui/workspace/project-types"
import { ProviderInvoker } from "@/providers-ai/provider-invoker"
import { getDefaultRegistry } from "@/providers-ai/provider-registry"
import { OrchestratorRunner } from "@/orchestrator/runner"

export interface RunResult {
  readonly graphName: string
  readonly plan: Plan | null
  readonly progress: ProgressReport | null
  readonly ranAt: IsoTimestamp
  readonly nodeCount: number
  readonly artifactCount: number
  readonly totalTokens: number
  readonly totalCost: number
  readonly error?: string
}

let lastRun: RunResult | null = null
let currentRunner: OrchestratorRunner | null = null
const runListeners = new Set<(r: RunResult | null) => void>()

/** Subscribe to the last completed run (used by the Dashboard surface). */
export function subscribeLastRun(fn: (r: RunResult | null) => void): () => void {
  runListeners.add(fn)
  fn(lastRun)
  return () => {
    runListeners.delete(fn)
  }
}

export function getLastRun(): RunResult | null {
  return lastRun
}

function publishRun(result: RunResult): void {
  lastRun = result
  for (const fn of runListeners) fn(result)
}

/** Cancel an in-flight run. */
export async function cancelCurrentRun(): Promise<void> {
  if (currentRunner) {
    await currentRunner.cancel()
    currentRunner = null
  }
}

function graphNodesToPlannerInput(graph: NodeGraphDoc): PlannerGraphNode[] {
  return graph.nodes.map((n) => ({ id: n.id, label: n.label, kind: n.kind }))
}

function buildGoal(graph: NodeGraphDoc): UserGoal {
  const id = generateId()
  const description = `Run workflow "${graph.name}" with ${graph.nodes.length} node${graph.nodes.length === 1 ? "" : "s"}${graph.edges.length > 0 ? ` and ${graph.edges.length} connection${graph.edges.length === 1 ? "" : "s"}` : ""}`
  return {
    id,
    description,
    constraints: [],
    priority: "medium",
    workspaceId: brand<WorkspaceId>("ws-local"),
    sessionId: brand<SessionId>(`session-${id}`),
    projectId: graph.id,
    metadata: { graphId: graph.id, nodeCount: graph.nodes.length } as JsonObject,
  }
}

function buildConfig(goal: UserGoal): OrchestratorConfig {
  return {
    id: brand(`coordinator-${goal.id}`),
    role: "coordinator",
    level: "root",
    displayName: "Coordinator",
    workspaceId: goal.workspaceId,
    sessionId: goal.sessionId,
    projectId: goal.projectId,
    refinementMode: "low" as RefinementMode,
    budgetAllocated: 1_000_000,
    maxWorkers: 8,
    maxDepth: 3,
    allowedRoles: ["planner", "programmer", "reviewer", "researcher", "architect", "debugger"],
  }
}

/**
 * Execute a node graph through the orchestrator. Returns a promise resolving to
 * a RunResult. Pure (no React state) so it can be called from anywhere.
 * Uses OrchestratorRunner + ProviderInvoker to make actual AI provider calls.
 */
export async function runGraph(graph: NodeGraphDoc): Promise<RunResult> {
  const ranAt = new Date().toISOString() as IsoTimestamp
  const goal = buildGoal(graph)
  const config = buildConfig(goal)

  const coordinator = new CoordinatorOrchestrator(
    config,
    goal,
    graphNodesToPlannerInput(graph),
  )

  const startResult = await coordinator.start()
  if (!startResult.ok) {
    const result: RunResult = {
      graphName: graph.name,
      plan: null,
      progress: null,
      ranAt,
      nodeCount: graph.nodes.length,
      artifactCount: 0,
      totalTokens: 0,
      totalCost: 0,
      error: startResult.error.message,
    }
    publishRun(result)
    return result
  }

  const registry = getDefaultRegistry()
  const invoker = new ProviderInvoker(registry)
  const runner = new OrchestratorRunner(invoker)
  currentRunner = runner

  const taskDescription = `Execute workflow "${graph.name}" with ${graph.nodes.length} nodes`
  const taskResult = await runner.runTask(taskDescription, {
    workspaceId: goal.workspaceId,
    sessionId: goal.sessionId,
    projectId: goal.projectId,
    refinementMode: "medium",
  })

  currentRunner = null

  const progress = coordinator.getAggregatedProgress()
  const result: RunResult = {
    graphName: graph.name,
    plan: coordinator.currentPlan,
    progress,
    ranAt,
    nodeCount: graph.nodes.length,
    artifactCount: taskResult.artifacts.length,
    totalTokens: taskResult.totalTokens,
    totalCost: taskResult.totalCost,
    error: taskResult.status === "failed" ? taskResult.error : undefined,
  }
  publishRun(result)
  return result
}

export interface UseRunGraph {
  readonly running: boolean
  readonly lastResult: RunResult | null
  readonly error: string | null
  run(graph: NodeGraphDoc): Promise<RunResult>
  reset(): void
}

/** React hook wrapping {@link runGraph} with run/loading state. */
export function useRunGraph(): UseRunGraph {
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<RunResult | null>(lastRun)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)

  const run = useCallback(async (graph: NodeGraphDoc): Promise<RunResult> => {
    if (inFlight.current) {
      return lastRun ?? {
        graphName: graph.name,
        plan: null,
        progress: null,
        ranAt: new Date().toISOString() as IsoTimestamp,
        nodeCount: graph.nodes.length,
        artifactCount: 0,
        totalTokens: 0,
        totalCost: 0,
      }
    }
    inFlight.current = true
    setRunning(true)
    setError(null)
    try {
      const result = await runGraph(graph)
      setLastResult(result)
      if (result.error) setError(result.error)
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      const failed: RunResult = {
        graphName: graph.name,
        plan: null,
        progress: null,
        ranAt: new Date().toISOString() as IsoTimestamp,
        nodeCount: graph.nodes.length,
        artifactCount: 0,
        totalTokens: 0,
        totalCost: 0,
        error: message,
      }
      publishRun(failed)
      setLastResult(failed)
      return failed
    } finally {
      setRunning(false)
      inFlight.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setLastResult(null)
    setError(null)
  }, [])

  return { running, lastResult, error, run, reset }
}
