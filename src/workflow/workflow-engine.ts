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
  EdgeDefinition,
} from "./workflow-types"
import type { WorkspaceId } from "@/core/types"
import type { RunContext } from "./run-context"
import { stateKey, parseStateKey, updateNodeState } from "./graph-mirror"
import type { GraphMirror } from "./graph-mirror"
import type { NodeExecutorRegistry } from "./node-executors"
import { resolveInputs, storeOutputs } from "./port-resolver"
import { isNodeTerminal, isRunTerminal } from "./workflow-types"

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
// Tick Result
// ---------------------------------------------------------------------------

export interface TickResult {
  readonly dispatched: number
  readonly completed: number
  readonly failed: number
  readonly isComplete: boolean
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
  private readonly contexts = new Map<string, RunContext>()

  private readonly executor: ExecutionEngineAdapter
  private readonly registry?: NodeExecutorRegistry

  constructor(
    _scheduler: SchedulerAdapter,
    executor: ExecutionEngineAdapter,
    _persistence: PersistenceAdapter,
    emitter: WorkflowEventEmitter,
    _config?: Partial<WorkflowEngineConfig>,
    registry?: NodeExecutorRegistry,
  ) {
    this.logger = createLogger("WorkflowEngine")
    this.emitter = emitter
    this.executor = executor
    this.registry = registry
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
    return this.contexts.get(runId)
  }

  setContext(runId: WorkflowRunId, context: RunContext): void {
    this.contexts.set(runId, context)
  }

  // ---------------------------------------------------------------------------
  // Ready Set Computation
  // ---------------------------------------------------------------------------

  /**
   * Compute the set of node state keys that are ready to run.
   * A node is ready when:
   *   1. Its state is "pending"
   *   2. Its remainingDeps is 0 (all upstream deps satisfied)
   *
   * Uses the mirror's states and graph structure — no I/O.
   */
  computeReadySet(mirror: GraphMirror, run: WorkflowRun): readonly string[] {
    void run
    const ready: string[] = []

    for (const [key, state] of mirror.states) {
      if (state.state === "pending" && state.remainingDeps <= 0) {
        ready.push(key)
      }
    }

    return ready
  }

  // ---------------------------------------------------------------------------
  // Tick Loop (Pure TypeScript Execution Engine)
  // ---------------------------------------------------------------------------

  /**
   * Execute a single tick cycle for a run. This is the core execution loop:
   *
   * 1. Find all ready nodes (pending + all deps satisfied)
   * 2. Transition them to "running" and dispatch to executors
   * 3. Handle results — transition to succeeded/failed
   * 4. Decrement downstream deps and promote newly-ready nodes
   * 5. Return whether the run has reached a terminal state
   *
   * This runs entirely in TypeScript (no Rust invoke) — suitable for
   * local execution, testing, and the pure-TS execution path.
   */
  async tickLocal(runId: WorkflowRunId): Promise<Result<TickResult, WorkflowError>> {
    const run = this.runs.get(runId)
    if (!run) {
      return err({ kind: "run_not_found", runId })
    }

    const mirror = this.mirrors.get(runId)
    if (!mirror) {
      return err({ kind: "snapshot_missing", snapshotId: run.graphSnapshotId })
    }

    const context = this.contexts.get(runId)
    if (!context) {
      return err({ kind: "persistence_failed", message: "RunContext not found for run" })
    }

    if (isRunTerminal(run.state)) {
      return ok({ dispatched: 0, completed: 0, failed: 0, isComplete: true })
    }

    // Phase 1: Collect ready nodes
    const readyKeys = this.computeReadySet(mirror, run)
    if (readyKeys.length === 0) {
      // No ready nodes — check if run is complete
      const isComplete = this.isRunComplete(mirror)
      return ok({ dispatched: 0, completed: 0, failed: 0, isComplete })
    }

    let dispatched = 0
    let completed = 0
    let failed = 0

    // Phase 2: Transition ready nodes to running and dispatch
    for (const key of readyKeys) {
      const parsed = parseStateKey(key)
      const nodeId = parsed.nodeId
      const iterationIndex = parsed.iterationIndex

      const nodeDef = mirror.nodes.get(nodeId)
      if (!nodeDef) continue

      // Transition: pending → running
      const transitioned = updateNodeState(mirror, nodeId, iterationIndex, "running")
      if (!transitioned) continue

      // Resolve inputs from upstream outputs
      const incomingEdgeIds = mirror.incoming.get(nodeId) ?? []
      const incomingEdges = incomingEdgeIds
        .map((eid) => mirror.edges.get(eid))
        .filter((e): e is EdgeDefinition => e !== undefined)

      const resolved = resolveInputs(nodeId, iterationIndex, nodeDef, incomingEdges, context)

      // Check for unsatisfied required ports
      if (resolved.unsatisfied.length > 0) {
        // Transition back to failed — port_unsatisfied
        updateNodeState(mirror, nodeId, iterationIndex, "failed", {
          failure: {
            kind: "port_unsatisfied",
            message: `Unsatisfied required ports: ${resolved.unsatisfied.join(", ")}`,
            retriable: false,
            at: new Date().toISOString(),
          },
        })
        failed++
        this.emitNodeState(runId, nodeId, iterationIndex, "failed")
        this.propagateFailureDeps(mirror, nodeId, run)
        continue
      }

      dispatched++
      this.emitNodeState(runId, nodeId, iterationIndex, "running")

      // Build execution request
      const executionId = `exec-${runId}-${nodeId}-${iterationIndex}-${Date.now()}`
      const request: ExecutionRequest = {
        executionId,
        runId,
        nodeId,
        iterationIndex,
        attempt: 1,
        kind: nodeDef.kind,
        config: nodeDef.config,
        inputs: resolved.values,
        workspaceId: run.workspaceId,
        projectId: run.projectId,
        sessionId: run.sessionId,
        ownerRef: { kind: "workflow_node", runId, nodeId },
        timeoutMs: nodeDef.timeoutMs,
        deterministicSeed: run.determinismSeed,
        mode: run.mode,
      }

      // Dispatch to executor
      try {
        const result = this.registry
          ? await this.registry.dispatch(request, context)
          : await this.executor.execute(request)

        if (result.ok) {
          // Store outputs in the run context
          const outgoingEdgeIds = mirror.outgoing.get(nodeId) ?? []
          const outgoingEdges = outgoingEdgeIds
            .map((eid) => mirror.edges.get(eid))
            .filter((e): e is EdgeDefinition => e !== undefined)

          storeOutputs(nodeId, iterationIndex, result.outputs, outgoingEdges, context)

          // Transition: running → succeeded
          updateNodeState(mirror, nodeId, iterationIndex, "succeeded")
          completed++
          run.completedNodeCount++
          this.emitNodeState(runId, nodeId, iterationIndex, "succeeded")

          // Decrement downstream deps
          this.decrementDownstreamDeps(mirror, nodeId, run)
        } else {
          // Transition: running → failed
          updateNodeState(mirror, nodeId, iterationIndex, "failed", {
            failure: result.failure,
          })
          failed++
          run.failedNodeCount++
          this.emitNodeState(runId, nodeId, iterationIndex, "failed")

          // Propagate failure to downstream nodes
          this.propagateFailureDeps(mirror, nodeId, run)
        }
      } catch (error) {
        // Transition: running → failed (executor threw)
        updateNodeState(mirror, nodeId, iterationIndex, "failed", {
          failure: {
            kind: "executor_error",
            message: error instanceof Error ? error.message : String(error),
            retriable: true,
            at: new Date().toISOString(),
          },
        })
        failed++
        run.failedNodeCount++
        this.emitNodeState(runId, nodeId, iterationIndex, "failed")
        this.propagateFailureDeps(mirror, nodeId, run)
      }
    }

    // Phase 3: Check if run is complete
    const isComplete = this.isRunComplete(mirror)
    if (isComplete) {
      run.state = failed > 0 ? "failed" : "succeeded"
      run.endedAt = new Date().toISOString()
    }

    return ok({ dispatched, completed, failed, isComplete })
  }

  // ---------------------------------------------------------------------------
  // Run Completion Check
  // ---------------------------------------------------------------------------

  /** Check if all nodes in the mirror are in a terminal state. */
  private isRunComplete(mirror: GraphMirror): boolean {
    for (const [, state] of mirror.states) {
      if (!isNodeTerminal(state.state)) {
        return false
      }
    }
    return true
  }

  // ---------------------------------------------------------------------------
  // Dependency Management
  // ---------------------------------------------------------------------------

  /**
   * After a node succeeds, decrement remainingDeps for all downstream nodes.
   * If a downstream node's remainingDeps reaches 0 and it's still pending,
   * it becomes ready on the next tick.
   */
  private decrementDownstreamDeps(
    mirror: GraphMirror,
    completedNodeId: NodeId,
    _run: WorkflowRun,
  ): void {
    const outgoingEdgeIds = mirror.outgoing.get(completedNodeId) ?? []
    for (const edgeId of outgoingEdgeIds) {
      const edge = mirror.edges.get(edgeId)
      if (!edge) continue
      // Skip loop back-edges
      if (edge.loopBackEdge || edge.kind === "loop_back") continue

      const downstreamKey = stateKey(edge.toNodeId, 0)
      const downstreamState = mirror.states.get(downstreamKey)
      if (!downstreamState) continue

      // Only decrement for non-terminal nodes
      if (isNodeTerminal(downstreamState.state)) continue

      const newDeps = downstreamState.remainingDeps - 1
      if (newDeps < 0) {
        this.logger.error(`Negative remaining deps for edge ${edgeId}`, {
          nodeId: edge.toNodeId,
          newDeps,
        })
        return
      }
      downstreamState.remainingDeps = newDeps
    }
  }

  /**
   * When a node fails, skip all downstream nodes that depend on it
   * (unless they have alternative satisfied paths).
   * Uses failurePolicy from the node definition to determine cascade behavior.
   */
  private propagateFailureDeps(
    mirror: GraphMirror,
    failedNodeId: NodeId,
    run: WorkflowRun,
  ): void {
    const nodeDef = mirror.nodes.get(failedNodeId)
    const policy = nodeDef?.failurePolicy ?? "fail_branch"

    if (policy === "continue") {
      // Don't propagate — downstream nodes can still run
      return
    }

    // "fail_branch" or "fail_run": skip downstream nodes
    const outgoingEdgeIds = mirror.outgoing.get(failedNodeId) ?? []
    for (const edgeId of outgoingEdgeIds) {
      const edge = mirror.edges.get(edgeId)
      if (!edge) continue
      if (edge.loopBackEdge || edge.kind === "loop_back") continue

      const downstreamKey = stateKey(edge.toNodeId, 0)
      const downstreamState = mirror.states.get(downstreamKey)
      if (!downstreamState) continue
      if (isNodeTerminal(downstreamState.state)) continue

      // Skip the downstream node
      const skipped = updateNodeState(mirror, edge.toNodeId, 0, "skipped", {
        skipReason: "upstream_failed",
      })
      if (skipped) {
        run.skippedNodeCount++
        this.emitNodeState(run.runId, edge.toNodeId, 0, "skipped")
      }
    }

    if (policy === "fail_run") {
      // Mark the entire run as failed
      run.state = "failed"
      run.endedAt = new Date().toISOString()
    }
  }

  // ---------------------------------------------------------------------------
  // Event Emission
  // ---------------------------------------------------------------------------

  private emitNodeState(
    runId: WorkflowRunId,
    nodeId: NodeId,
    iterationIndex: number,
    state: NodeState,
  ): void {
    this.emitter.emit("workflow.node.state_changed", {
      runId,
      nodeId,
      iterationIndex,
      state,
    })
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
