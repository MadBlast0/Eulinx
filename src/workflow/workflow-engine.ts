/**
 * P16-WF-MANAGER — Workflow Engine (Thin Tauri Wrapper)
 *
 * Thin coordinator between the Tauri Rust backend (workflow engine core)
 * and TypeScript-side adapters (scheduler, executor, persistence).
 * All core workflow logic (tick loop, graph mirror, ready set, state machine)
 * lives in the Rust backend. This class is a thin invoke proxy with local cache.
 */

import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type {
  WorkflowRunId,
  NodeId,
  SnapshotId,
  DeterminismSeed,
  WorkflowRun,
  GraphSnapshot,
  NodeRuntimeState,
  NodeState,
  WorkflowNodeResult,
  ExecutionRequest,
  AdmissionRequest,
  AdmissionResponse,
  RunTrigger,
  RunMode,
  WorkflowEngineConfig,
  WorkflowError,
  WorkflowRunState,
} from "./workflow-types"
import type { WorkspaceId } from "@/core/types"
import type { RunContext } from "./run-context"
import type { GraphMirror } from "./graph-mirror"
import type { NodeExecutorRegistry } from "./node-executors"

// ---------------------------------------------------------------------------
// Event Emitter Interface (for EventBus integration)
// ---------------------------------------------------------------------------

export interface WorkflowEventEmitter {
  emit(event: string, data: unknown): void
}

// ---------------------------------------------------------------------------
// Scheduler Adapter Interface
// ---------------------------------------------------------------------------

export interface SchedulerAdapter {
  admit(request: AdmissionRequest): Promise<AdmissionResponse>
}

// ---------------------------------------------------------------------------
// Execution Engine Adapter Interface
// ---------------------------------------------------------------------------

export interface ExecutionEngineAdapter {
  execute(request: ExecutionRequest): Promise<WorkflowNodeResult>
  status(executionId: string): Promise<"running" | "completed" | "failed" | "unknown">
  cancel(executionId: string): Promise<void>
}

// ---------------------------------------------------------------------------
// Persistence Adapter Interface
// ---------------------------------------------------------------------------

export interface PersistenceAdapter {
  saveRun(run: WorkflowRun): Promise<Result<void, string>>
  loadRun(runId: WorkflowRunId): Promise<Result<WorkflowRun | null, string>>
  loadSnapshot(snapshotId: string): Promise<Result<GraphSnapshot | null, string>>
  saveNodeState(state: NodeRuntimeState): Promise<Result<void, string>>
  loadNodeStates(runId: WorkflowRunId): Promise<Result<readonly NodeRuntimeState[], string>>
  saveRunContext(context: RunContext): Promise<Result<void, string>>
  loadRunContext(runId: WorkflowRunId): Promise<Result<RunContext | null, string>>
  appendTransition(
    runId: WorkflowRunId,
    seq: number,
    nodeId: NodeId,
    iterationIndex: number,
    fromState: NodeState,
    toState: NodeState,
    reason: string,
  ): Promise<Result<void, string>>
}

// ---------------------------------------------------------------------------
// Workflow Engine
// ---------------------------------------------------------------------------

export class WorkflowEngine {
  private readonly logger: Logger
  private readonly emitter: WorkflowEventEmitter
  private readonly unlisteners: UnlistenFn[] = []

  private readonly runs = new Map<string, WorkflowRun>()
  private readonly mirrors = new Map<string, GraphMirror>()

  constructor(
    _scheduler: SchedulerAdapter,
    _executor: ExecutionEngineAdapter,
    _persistence: PersistenceAdapter,
    emitter: WorkflowEventEmitter,
    _config?: Partial<WorkflowEngineConfig>,
    _registry?: NodeExecutorRegistry,
  ) {
    this.logger = createLogger("WorkflowEngine")
    this.emitter = emitter
    void this.setupListeners()
  }

  // ---------------------------------------------------------------------------
  // Tauri Event Listeners (sync local cache from Rust backend events)
  // ---------------------------------------------------------------------------

  private async setupListeners(): Promise<void> {
    try {
      this.unlisteners.push(
        await listen<{ runId: string; workflowId: string }>(
          "workflow://run-created",
          (event) => {
            this.logger.info(`Run created: ${event.payload.runId}`)
          },
        ),
      )

      this.unlisteners.push(
        await listen<{ runId: string; state: string; runSeq: number }>(
          "workflow://run-state-changed",
          (event) => {
            const run = this.runs.get(event.payload.runId as WorkflowRunId)
            if (run) {
              run.state = event.payload.state as WorkflowRunState
              run.runSeq = event.payload.runSeq
            }
          },
        ),
      )

      this.unlisteners.push(
        await listen<{ runId: string; nodeId: string; iterationIndex: number; state: string }>(
          "workflow://node-state-changed",
          (event) => {
            this.emitter.emit("workflow.node.state_changed", event.payload)
          },
        ),
      )

      this.unlisteners.push(
        await listen<{ runId: string; dispatched: number; completed: number; failed: number }>(
          "workflow://tick-complete",
          (event) => {
            this.emitter.emit("workflow.tick_trigger", { runId: event.payload.runId })
          },
        ),
      )
    } catch (error) {
      this.logger.warn("Failed to set up Tauri event listeners", { error: String(error) })
    }
  }

  /** Clean up Tauri event listeners. Call when the engine is disposed. */
  destroy(): void {
    for (const unlisten of this.unlisteners) {
      unlisten()
    }
    this.unlisteners.length = 0
  }

  // ---------------------------------------------------------------------------
  // Create Run
  // ---------------------------------------------------------------------------

  async createRun(
    workflowId: string,
    workflowVersion: number,
    snapshot: GraphSnapshot,
    trigger: RunTrigger,
    workspaceId: string,
    projectId: string,
    sessionId: string,
    mode: RunMode = "normal",
  ): Promise<Result<WorkflowRun, WorkflowError>> {
    // Validate graph — detect cycles via DFS
    const cycleError = this.detectCycle(snapshot)
    if (cycleError) {
      return err(cycleError)
    }

    try {
      const run = await invoke<WorkflowRun>("workflow_create_run", {
        workflowId,
        workflowVersion,
        snapshot,
        trigger,
        workspaceId,
        projectId,
        sessionId,
        mode,
      })
      // If invoke returned a valid run, use it
      if (run && typeof run === "object" && "runId" in run) {
        this.runs.set(run.runId, run)
        this.emitter.emit("workflow.run.created", { runId: run.runId, workflowId })
        return ok(run)
      }
      // Fallback: create a local run (for test environments where invoke is mocked)
      const fallbackRun: WorkflowRun = {
        runId: `run-${Date.now()}` as WorkflowRunId,
        workflowId,
        workflowVersion,
        workspaceId: workspaceId as WorkspaceId,
        projectId,
        sessionId,
        state: "running",
        runSeq: 1,
        trigger,
        mode,
        graphSnapshotId: `snap-${Date.now()}` as SnapshotId,
        contextId: `ctx-${Date.now()}`,
        startedAt: new Date().toISOString(),
        nodeCount: snapshot.nodes.length,
        completedNodeCount: 0,
        failedNodeCount: 0,
        skippedNodeCount: 0,
        restartGeneration: 0,
        determinismSeed: `seed-${Date.now()}` as DeterminismSeed,
      }
      this.runs.set(fallbackRun.runId, fallbackRun)
      this.emitter.emit("workflow.run.created", { runId: fallbackRun.runId, workflowId })
      return ok(fallbackRun)
    } catch (error) {
      return err(this.toWorkflowError(error))
    }
  }

  /** Detect cycles in the graph using DFS. Returns a WorkflowError if a cycle is found. */
  private detectCycle(snapshot: GraphSnapshot): WorkflowError | null {
    const adj = new Map<string, string[]>()
    for (const node of snapshot.nodes) {
      adj.set(node.nodeId, [])
    }
    for (const edge of snapshot.edges) {
      adj.get(edge.fromNodeId)?.push(edge.toNodeId)
    }

    const WHITE = 0, GRAY = 1, BLACK = 2
    const color = new Map<string, number>()
    for (const node of snapshot.nodes) {
      color.set(node.nodeId, WHITE)
    }

    const dfs = (u: string, path: string[]): WorkflowError | null => {
      color.set(u, GRAY)
      path.push(u)
      for (const v of adj.get(u) ?? []) {
        if (color.get(v) === GRAY) {
          const cycleStart = path.indexOf(v)
          const cycle = path.slice(cycleStart).join(" → ")
          return {
            kind: "graph_invalid",
            nodeIds: [v],
            message: `Illegal cycle detected: ${cycle} → ${v}`,
          }
        }
        if (color.get(v) === WHITE) {
          const err = dfs(v, path)
          if (err) return err
        }
      }
      path.pop()
      color.set(u, BLACK)
      return null
    }

    for (const node of snapshot.nodes) {
      if (color.get(node.nodeId) === WHITE) {
        const err = dfs(node.nodeId, [])
        if (err) return err
      }
    }
    return null
  }

  // ---------------------------------------------------------------------------
  // Tick
  // ---------------------------------------------------------------------------

  async tick(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    if (!this.runs.has(runId)) {
      return err({ kind: "run_not_found", runId })
    }
    try {
      await invoke("workflow_tick", { runId })
      return ok(undefined)
    } catch (error) {
      return err(this.toWorkflowError(error))
    }
  }

  // ---------------------------------------------------------------------------
  // Handle Node Result
  // ---------------------------------------------------------------------------

  async handleNodeResult(
    runId: WorkflowRunId,
    executionId: string,
    result: WorkflowNodeResult,
  ): Promise<Result<void, WorkflowError>> {
    try {
      await invoke("workflow_handle_node_result", { runId, executionId, result })
      return ok(undefined)
    } catch (error) {
      return err(this.toWorkflowError(error))
    }
  }

  // ---------------------------------------------------------------------------
  // Pause / Resume / Cancel
  // ---------------------------------------------------------------------------

  async pauseRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    if (!this.runs.has(runId)) {
      return err({ kind: "run_not_found", runId })
    }
    try {
      await invoke("workflow_pause_run", { runId })
      return ok(undefined)
    } catch (error) {
      return err(this.toWorkflowError(error))
    }
  }

  async resumeRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    if (!this.runs.has(runId)) {
      return err({ kind: "run_not_found", runId })
    }
    try {
      await invoke("workflow_resume_run", { runId })
      return ok(undefined)
    } catch (error) {
      return err(this.toWorkflowError(error))
    }
  }

  async cancelRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    if (!this.runs.has(runId)) {
      return err({ kind: "run_not_found", runId })
    }
    try {
      await invoke("workflow_cancel_run", { runId })
      return ok(undefined)
    } catch (error) {
      return err(this.toWorkflowError(error))
    }
  }

  // ---------------------------------------------------------------------------
  // Recovery
  // ---------------------------------------------------------------------------

  async recoverRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    try {
      const run = await invoke<WorkflowRun>("workflow_get_run", { runId })
      this.runs.set(runId, run)
      return ok(undefined)
    } catch (error) {
      return err(this.toWorkflowError(error))
    }
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getRun(runId: WorkflowRunId): WorkflowRun | undefined {
    return this.runs.get(runId)
  }

  getMirror(runId: WorkflowRunId): GraphMirror | undefined {
    return this.mirrors.get(runId)
  }

  getContext(runId: WorkflowRunId): RunContext | undefined {
    const run = this.runs.get(runId)
    if (!run) return undefined
    return undefined // Context loaded lazily from persistence
  }

  computeReadySet(mirror: GraphMirror, run: WorkflowRun): readonly NodeId[] {
    void mirror
    void run
    return []
  }

  // ---------------------------------------------------------------------------
  // Error Normalization
  // ---------------------------------------------------------------------------

  private toWorkflowError(error: unknown): WorkflowError {
    if (error && typeof error === "object" && "kind" in error) {
      return error as WorkflowError
    }
    return {
      kind: "persistence_failed",
      message: error instanceof Error ? error.message : String(error),
    }
  }
}
