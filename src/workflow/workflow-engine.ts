/**
 * P16-WF-MANAGER — Workflow Engine (Tick Loop)
 *
 * The deterministic interpreter of a Workflow graph. Owns the run object,
 * the in-memory graph mirror, ready-set computation, topological execution,
 * parallel branch dispatch, run context, pause/resume/cancel, and the
 * numbered engine tick algorithm.
 * From WorkflowEngine-Part01 through Part08, ExecutionFlow-Part01 through Part08.
 */

import type { Result } from "@/core/result"
import { ok, err } from "@/core/result"
import { createLogger } from "@/core/logger"
import type { Logger } from "@/core/logger"
import type { JsonValue, WorkspaceId } from "@/core/types"
import type {
  WorkflowRunId,
  NodeId,
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
  NodeFailure,
  SkipReason,
  FailurePolicy,
  RunFailure,
  WorkflowEngineConfig,
  WorkflowError,
  EdgeDefinition,
  DeterminismSeed,
} from "./workflow-types"
import { isRunTerminal, isNodeTerminal, DEFAULT_RETRY_POLICY } from "./workflow-types"
import { RunContext } from "./run-context"
import type { NodeExecutorRegistry } from "./node-executors"
import {
  buildMirror,
  stateKey,
  parseStateKey,
  detectCycle,
  updateNodeState,
  type GraphMirror,
} from "./graph-mirror"

// ---------------------------------------------------------------------------
// Default Config
// ---------------------------------------------------------------------------

const DEFAULT_ENGINE_CONFIG: WorkflowEngineConfig = {
  schedulerAdmitTimeoutMs: 30_000,
  tickTimerIntervalMs: 5_000,
  maxSchedulerFailures: 10,
  determinismSeedLength: 32,
  defaultRunBudget: {
    maxWallClockMs: 24 * 60 * 60 * 1000,
    maxNodeRuns: 10_000,
    maxCostUsd: 100,
    maxTokens: 10_000_000,
    maxConcurrentNodes: 16,
    maxDepth: 50,
  },
}

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
  private readonly config: WorkflowEngineConfig
  private readonly emitter: WorkflowEventEmitter
  private readonly scheduler: SchedulerAdapter
  private readonly executor: ExecutionEngineAdapter
  private readonly persistence: PersistenceAdapter
  private readonly nodeExecutors?: NodeExecutorRegistry

  // Active runs: runId -> mirror
  private readonly mirrors = new Map<string, GraphMirror>()
  // Active run contexts
  private readonly contexts = new Map<string, RunContext>()
  // Active run records
  private readonly runs = new Map<string, WorkflowRun>()
  // Scheduler consecutive failure counter
  private schedulerFailures = 0

  constructor(
    scheduler: SchedulerAdapter,
    executor: ExecutionEngineAdapter,
    persistence: PersistenceAdapter,
    emitter: WorkflowEventEmitter,
    config?: Partial<WorkflowEngineConfig>,
    nodeExecutors?: NodeExecutorRegistry,
  ) {
    this.logger = createLogger("WorkflowEngine")
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config }
    this.emitter = emitter
    this.scheduler = scheduler
    this.executor = executor
    this.persistence = persistence
    this.nodeExecutors = nodeExecutors
  }

  // -------------------------------------------------------------------------
  // Create Run (WorkflowEngine-Part01 §Creating a WorkflowRun)
  // -------------------------------------------------------------------------

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
    // Validate the graph first (WorkflowEngine-Part01 §validating)
    const cycleNodes = detectCycle(
      new Map(snapshot.nodes.map((n) => [n.nodeId, n])),
      new Map(snapshot.edges.map((e) => [e.edgeId, e])),
    )
    if (cycleNodes) {
      return err({
        kind: "graph_invalid",
        nodeIds: cycleNodes,
        message: `Illegal cycle detected involving nodes: ${cycleNodes.join(", ")}`,
      })
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}` as WorkflowRunId
    const determinismSeed = this.generateDeterminismSeed()

    const run: WorkflowRun = {
      runId,
      workflowId,
      workflowVersion,
      workspaceId: workspaceId as WorkspaceId,
      projectId,
      sessionId,
      state: "created",
      runSeq: 0,
      trigger,
      mode,
      graphSnapshotId: snapshot.snapshotId,
      contextId: `ctx_${runId}`,
      startedAt: new Date().toISOString(),
      nodeCount: snapshot.nodes.length,
      completedNodeCount: 0,
      failedNodeCount: 0,
      skippedNodeCount: 0,
      failure: undefined,
      restartGeneration: 0,
      determinismSeed,
    }

    // Persist run + snapshot
    const saveResult = await this.persistence.saveRun(run)
    if (!saveResult.ok) {
      return err({ kind: "persistence_failed", message: saveResult.error })
    }

    // Build initial node states and persist them
    const nodeStates: NodeRuntimeState[] = snapshot.nodes.map((node) => {
      const inEdges = snapshot.edges.filter(
        (e) => e.toNodeId === node.nodeId && !e.loopBackEdge && e.kind !== "loop_back",
      )
      return {
        runId,
        nodeId: node.nodeId,
        iterationIndex: 0,
        state: "pending" as NodeState,
        remainingDeps: inEdges.length,
        attempt: 0,
      }
    })

    for (const ns of nodeStates) {
      await this.persistence.saveNodeState(ns)
    }

    // Build the mirror
    const mirror = buildMirror(snapshot, nodeStates)
    this.mirrors.set(runId, mirror)
    this.contexts.set(runId, new RunContext(runId, workflowVersion))
    this.runs.set(runId, run)

    // Transition: created -> validating -> running
    run.state = "validating"
    await this.persistence.saveRun(run)
    run.state = "running"
    run.runSeq++
    await this.persistence.saveRun(run)

    this.emitter.emit("workflow.run.created", { runId, workflowId })
    this.emitter.emit("workflow.run.state_changed", {
      runId,
      state: "running",
      runSeq: run.runSeq,
    })

    return ok(run)
  }

  // -------------------------------------------------------------------------
  // Tick (WorkflowEngine-Part08 §The Tick Algorithm)
  // -------------------------------------------------------------------------

  async tick(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    const run = this.runs.get(runId)
    if (!run) return err({ kind: "run_not_found", runId })

    const mirror = this.mirrors.get(runId)
    if (!mirror) return err({ kind: "run_not_found", runId })

    // Step 2: If terminal, stop
    if (isRunTerminal(run.state)) return ok(undefined)

    // Step 3: Handle pausing/cancelling transitions
    if (run.state === "pausing" || run.state === "cancelling") {
      return this.finishTransition(run, mirror)
    }

    // Step 4: Compute ready set
    const readySet = this.computeReadySet(mirror, run)

    // Step 5: Terminal check
    if (readySet.length === 0 && mirror.runningSet.size === 0) {
      return this.finalizeRun(run, mirror)
    }

    // Step 6: Sort by nodeId for determinism (WorkflowEngine-Part08 step 6)
    readySet.sort((a, b) => {
      const aParsed = parseStateKey(a)
      const bParsed = parseStateKey(b)
      const aTopoIdx = mirror.topoOrder.indexOf(aParsed.nodeId)
      const bTopoIdx = mirror.topoOrder.indexOf(bParsed.nodeId)
      if (aTopoIdx !== bTopoIdx) return aTopoIdx - bTopoIdx
      if (aParsed.nodeId !== bParsed.nodeId) return aParsed.nodeId.localeCompare(bParsed.nodeId)
      return aParsed.iterationIndex - bParsed.iterationIndex
    })

    // Step 7: Scheduler admission
    const candidates = readySet.map((key) => {
      const parsed = parseStateKey(key)
      const node = mirror.nodes.get(parsed.nodeId)!
      return {
        nodeId: parsed.nodeId,
        iterationIndex: parsed.iterationIndex,
        kind: node.kind,
        topoRank: mirror.topoOrder.indexOf(parsed.nodeId),
        estimatedCost: {
          expectedDurationMs: 0,
          expectedTokens: 0,
          expectedCostUsd: 0,
          spawnsWorker: node.kind === "worker" || node.kind === "builder",
          spawnsProcess: false,
        },
        requiredResources: [],
      }
    })

    let admission: AdmissionResponse
    try {
      admission = await this.scheduler.admit({
        runId,
        workspaceId: run.workspaceId,
        projectId: run.projectId,
        candidates,
        runPriority: "normal",
      })
      this.schedulerFailures = 0
    } catch {
      this.schedulerFailures++
      if (this.schedulerFailures >= this.config.maxSchedulerFailures) {
        return err({
          kind: "scheduler_unavailable",
          consecutiveFailures: this.schedulerFailures,
        })
      }
      return ok(undefined) // Retry next tick
    }

    // Handle rejected nodes
    for (const rejected of admission.rejected) {
      const parsed = parseStateKey(rejected.key)
      await this.failNode(run, mirror, parsed.nodeId, parsed.iterationIndex, {
        kind: rejected.reason,
        message: rejected.message,
        retriable: false,
        at: new Date().toISOString(),
      })
    }

    // Step 8-9: Dispatch admitted nodes
    for (const key of admission.admitted) {
      const parsed = parseStateKey(key)
      await this.dispatchNode(run, mirror, parsed.nodeId, parsed.iterationIndex)
    }

    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Compute Ready Set (WorkflowEngine-Part03 §Computing The Ready Set)
  // -------------------------------------------------------------------------

  computeReadySet(mirror: GraphMirror, run: WorkflowRun): string[] {
    // Step 1: Only running runs dispatch
    if (run.state !== "running") return []

    // Step 2-3: readySet minus runningSet
    const result: string[] = []
    for (const key of mirror.readySet) {
      if (!mirror.runningSet.has(key)) {
        result.push(key)
      }
    }
    return result
  }

  // -------------------------------------------------------------------------
  // Dispatch Node (WorkflowEngine-Part04 §Dispatch)
  // -------------------------------------------------------------------------

  private async dispatchNode(
    run: WorkflowRun,
    mirror: GraphMirror,
    nodeId: NodeId,
    iterationIndex: number,
  ): Promise<void> {
    const node = mirror.nodes.get(nodeId)
    if (!node) {
      await this.failRun(run, {
        kind: "unknown_node_kind",
        failedNodeIds: [nodeId],
        message: `Node definition not found: ${nodeId}`,
        at: new Date().toISOString(),
      })
      return
    }

    // Step 8: Conditional update ready -> running (dispatch-once gate)
    const updated = updateNodeState(mirror, nodeId, iterationIndex, "running", {
      attempt: (mirror.states.get(stateKey(nodeId, iterationIndex))?.attempt ?? 0) + 1,
      startedAt: new Date().toISOString(),
    })

    if (!updated) {
      // Another tick won the race
      return
    }

    // Persist the state change
    const state = mirror.states.get(stateKey(nodeId, iterationIndex))!
    await this.persistence.saveNodeState(state)
    await this.persistence.appendTransition(
      run.runId,
      run.runSeq,
      nodeId,
      iterationIndex,
      "ready",
      "running",
      "dispatched",
    )
    run.runSeq++

    this.emitter.emit("workflow.node.state_changed", {
      runId: run.runId,
      nodeId,
      iterationIndex,
      state: "running",
    })

    // Step 9: Build ExecutionRequest
    const context = this.contexts.get(run.runId)
    const inputs: Record<string, JsonValue> = {}
    if (context) {
      for (const port of node.inputPorts) {
        const value = context.resolveInput(nodeId, port.portId, iterationIndex)
        if (value !== undefined) {
          inputs[port.portId] = value
        }
      }
    }

    const executionId = `exec_${nodeId}_${iterationIndex}_${state.attempt}`
    const request: ExecutionRequest = {
      executionId,
      runId: run.runId,
      nodeId,
      iterationIndex,
      attempt: state.attempt,
      kind: node.kind,
      config: node.config,
      inputs,
      workspaceId: run.workspaceId,
      projectId: run.projectId,
      sessionId: run.sessionId,
      ownerRef: { kind: "workflow_node", runId: run.runId, nodeId },
      timeoutMs: node.timeoutMs,
      deterministicSeed: this.deriveDeterministicSeed(run.determinismSeed, nodeId, iterationIndex),
      mode: run.mode,
    }

    // Execute
    try {
      const result = this.nodeExecutors
        ? await this.nodeExecutors.dispatch(request, context ?? new RunContext(run.runId, run.workflowVersion))
        : await this.executor.execute(request)
      await this.onResult(run, mirror, result)
    } catch (error) {
      await this.onResult(run, mirror, {
        ok: false,
        executionId,
        failure: {
          kind: "execution_error",
          message: error instanceof Error ? error.message : String(error),
          retriable: true,
          at: new Date().toISOString(),
        },
        metrics: { durationMs: 0, tokensUsed: 0, costUsd: 0, toolCalls: 0 },
      })
    }
  }

  // -------------------------------------------------------------------------
  // On Result (WorkflowEngine-Part04 §Result Arrival)
  // -------------------------------------------------------------------------

  async onResult(
    run: WorkflowRun,
    mirror: GraphMirror,
    result: WorkflowNodeResult,
  ): Promise<void> {
    // Step 1: Look up node by executionId
    let nodeKey: string | undefined
    for (const [key, state] of mirror.states) {
      if (state.executionId === result.executionId) {
        nodeKey = key
        break
      }
    }

    if (!nodeKey) {
      this.logger.warn(`Result for unknown execution: ${result.executionId}`)
      return
    }

    const parsed = parseStateKey(nodeKey)

    // Step 2: Check state is running
    const state = mirror.states.get(nodeKey)
    if (!state || state.state !== "running") {
      this.logger.warn(`Result for non-running node: ${parsed.nodeId}`)
      return
    }

    if (result.ok) {
      // Step 3a-3e: Success path
      // Write outputs to RunContext
      const context = this.contexts.get(run.runId)
      const node = mirror.nodes.get(parsed.nodeId)
      if (context && node) {
        for (const port of node.outputPorts) {
          const value = result.outputs[port.portId]
          if (value !== undefined) {
            const bytes = JSON.stringify(value).length
            context.writeOutput(
              parsed.nodeId,
              port.portId,
              parsed.iterationIndex,
              value as any,
              `edge_${parsed.nodeId}_${port.portId}` as any,
              bytes,
            )
          }
        }
      }

      // Transition running -> succeeded
      updateNodeState(mirror, parsed.nodeId, parsed.iterationIndex, "succeeded", {
        endedAt: new Date().toISOString(),
        outputs: result.outputs as any,
      })

      // Persist
      const newState = mirror.states.get(nodeKey)!
      await this.persistence.saveNodeState(newState)
      await this.persistence.appendTransition(
        run.runId,
        run.runSeq,
        parsed.nodeId,
        parsed.iterationIndex,
        "running",
        "succeeded",
        "completed",
      )
      run.runSeq++
      run.completedNodeCount++

      // Decrement remainingDeps on targets (same transaction conceptually)
      await this.decrementTargets(run, mirror, parsed.nodeId, parsed.iterationIndex)

      this.emitter.emit("workflow.node.state_changed", {
        runId: run.runId,
        nodeId: parsed.nodeId,
        iterationIndex: parsed.iterationIndex,
        state: "succeeded",
      })
    } else {
      // Step 4: Failure path
      const node = mirror.nodes.get(parsed.nodeId)
      const retryPolicy = node?.retryPolicy ?? DEFAULT_RETRY_POLICY

      if (
        result.failure.retriable &&
        state.attempt < retryPolicy.maxAttempts
      ) {
        // Retry: running -> ready
        updateNodeState(mirror, parsed.nodeId, parsed.iterationIndex, "ready", {
          executionId: undefined,
          endedAt: undefined,
        })
        const retryState = mirror.states.get(nodeKey)!
        await this.persistence.saveNodeState(retryState)
        this.emitter.emit("workflow.node.state_changed", {
          runId: run.runId,
          nodeId: parsed.nodeId,
          iterationIndex: parsed.iterationIndex,
          state: "ready",
          reason: "retry",
        })
      } else {
        // Terminal failure
        await this.failNode(run, mirror, parsed.nodeId, parsed.iterationIndex, result.failure)
      }
    }

    // Remove from runningSet
    mirror.runningSet.delete(nodeKey)

    // Signal tick loop
    this.emitter.emit("workflow.tick_trigger", { runId: run.runId })
  }

  // -------------------------------------------------------------------------
  // Fail Node (WorkflowEngine-Part03 §The Failure Cascade)
  // -------------------------------------------------------------------------

  private async failNode(
    run: WorkflowRun,
    mirror: GraphMirror,
    nodeId: NodeId,
    iterationIndex: number,
    failure: NodeFailure,
  ): Promise<void> {
    const key = stateKey(nodeId, iterationIndex)
    const node = mirror.nodes.get(nodeId)
    const failurePolicy: FailurePolicy = (node?.failurePolicy as FailurePolicy) ?? "fail_run"

    updateNodeState(mirror, nodeId, iterationIndex, "failed", {
      failure,
      endedAt: new Date().toISOString(),
    })

    const state = mirror.states.get(key)!
    await this.persistence.saveNodeState(state)
    await this.persistence.appendTransition(
      run.runId,
      run.runSeq,
      nodeId,
      iterationIndex,
      "running",
      "failed",
      failure.kind,
    )
    run.runSeq++
    run.failedNodeCount++

    mirror.runningSet.delete(key)

    this.emitter.emit("workflow.node.state_changed", {
      runId: run.runId,
      nodeId,
      iterationIndex,
      state: "failed",
      failure,
    })

    if (failurePolicy === "fail_run") {
      await this.failRun(run, {
        kind: "node_failed_fatal",
        failedNodeIds: [nodeId],
        message: failure.message,
        at: failure.at,
      })
    } else if (failurePolicy === "fail_branch") {
      await this.skipDescendants(run, mirror, nodeId, "upstream_failed")
    } else {
      // "continue" — satisfy outgoing edges with absent values
      await this.decrementTargets(run, mirror, nodeId, iterationIndex)
    }
  }

  // -------------------------------------------------------------------------
  // Fail Run
  // -------------------------------------------------------------------------

  private async failRun(run: WorkflowRun, failure: RunFailure): Promise<void> {
    run.failure = failure
    run.state = "failed"
    run.runSeq++
    run.endedAt = new Date().toISOString()
    await this.persistence.saveRun(run)

    // Cancel all running nodes
    const mirror = this.mirrors.get(run.runId)
    if (mirror) {
      for (const key of mirror.runningSet) {
        const nodeState = mirror.states.get(key)
        if (nodeState?.executionId) {
          await this.executor.cancel(nodeState.executionId).catch(() => {})
        }
      }
      // Mark all pending/ready as skipped
      for (const [key, state] of mirror.states) {
        if (state.state === "pending" || state.state === "ready") {
          const parsed = parseStateKey(key)
          updateNodeState(mirror, parsed.nodeId, parsed.iterationIndex, "skipped", {
            skipReason: "upstream_failed",
          })
          run.skippedNodeCount++
        }
      }
    }

    this.emitter.emit("workflow.run.failed", { runId: run.runId, failure })
    this.emitter.emit("workflow.run.state_changed", {
      runId: run.runId,
      state: "failed",
      runSeq: run.runSeq,
    })
  }

  // -------------------------------------------------------------------------
  // Skip Descendants (NodeArchitecture-Part05 §Skip Propagation)
  // -------------------------------------------------------------------------

  private async skipDescendants(
    run: WorkflowRun,
    mirror: GraphMirror,
    nodeId: NodeId,
    reason: SkipReason,
  ): Promise<void> {
    const outEdges = mirror.outgoing.get(nodeId) ?? []
    for (const edgeId of outEdges) {
      const edge = mirror.edges.get(edgeId)
      if (!edge) continue

      const targetKey = stateKey(edge.toNodeId, 0)
      const targetState = mirror.states.get(targetKey)
      if (!targetState) continue
      if (isNodeTerminal(targetState.state)) continue

      updateNodeState(mirror, edge.toNodeId, 0, "skipped", { skipReason: reason })
      run.skippedNodeCount++

      const updatedState = mirror.states.get(targetKey)!
      await this.persistence.saveNodeState(updatedState)
      this.emitter.emit("workflow.node.state_changed", {
        runId: run.runId,
        nodeId: edge.toNodeId,
        iterationIndex: 0,
        state: "skipped",
        skipReason: reason,
      })

      // Recurse
      await this.skipDescendants(run, mirror, edge.toNodeId, reason)
    }
  }

  // -------------------------------------------------------------------------
  // Decrement Targets (WorkflowEngine-Part03 §remainingDeps)
  // -------------------------------------------------------------------------

  private async decrementTargets(
    run: WorkflowRun,
    mirror: GraphMirror,
    sourceNodeId: NodeId,
    iterationIndex: number,
  ): Promise<void> {
    const outEdges = mirror.outgoing.get(sourceNodeId) ?? []

    for (const edgeId of outEdges) {
      const edge = mirror.edges.get(edgeId)
      if (!edge) continue
      if (edge.loopBackEdge) continue
      if (edge.kind === "loop_back") continue

      const targetKey = stateKey(edge.toNodeId, iterationIndex)
      const targetState = mirror.states.get(targetKey)
      if (!targetState) continue
      if (isNodeTerminal(targetState.state)) continue

      // Decrement
      targetState.remainingDeps--

      if (targetState.remainingDeps < 0) {
        await this.failRun(run, {
          kind: "persistence_failed",
          failedNodeIds: [edge.toNodeId],
          message: `Negative remainingDeps on edge ${edgeId}`,
          at: new Date().toISOString(),
        })
        return
      }

      if (targetState.remainingDeps === 0) {
        // Evaluate skip rule (WorkflowEngine-Part03 §The Skip Cascade)
        const shouldSkip = this.evaluateSkipRule(mirror, edge.toNodeId, iterationIndex)
        if (shouldSkip) {
          updateNodeState(mirror, edge.toNodeId, iterationIndex, "skipped", {
            skipReason: this.determineSkipReason(mirror, edge.toNodeId, iterationIndex),
          })
          run.skippedNodeCount++
        } else {
          updateNodeState(mirror, edge.toNodeId, iterationIndex, "ready")
        }

        const updatedState = mirror.states.get(targetKey)!
        await this.persistence.saveNodeState(updatedState)
        this.emitter.emit("workflow.node.state_changed", {
          runId: run.runId,
          nodeId: edge.toNodeId,
          iterationIndex,
          state: updatedState.state,
        })
      } else {
        // Just persist the decremented remainingDeps
        await this.persistence.saveNodeState(targetState)
      }
    }
  }

  // -------------------------------------------------------------------------
  // Skip Rule (WorkflowEngine-Part03 §The Skip Cascade step 4)
  // -------------------------------------------------------------------------

  private evaluateSkipRule(
    mirror: GraphMirror,
    nodeId: NodeId,
    iterationIndex: number,
  ): boolean {
    const inEdges = mirror.incoming.get(nodeId) ?? []

    // If no incoming control edges (root node), don't skip
    const controlEdges = inEdges
      .map((eid) => mirror.edges.get(eid))
      .filter(
        (e): e is EdgeDefinition =>
          e !== undefined && (e.kind === "control" || e.kind === "data" || e.kind === "conditional"),
    )

    if (controlEdges.length === 0) return false

    // Check if any control parent succeeded
    for (const edge of controlEdges) {
      const srcKey = stateKey(edge.fromNodeId, iterationIndex)
      const srcState = mirror.states.get(srcKey)
      if (srcState?.state === "succeeded") return false
    }

    // All control parents were skipped, failed, or cancelled — skip this node
    return true
  }

  private determineSkipReason(
    mirror: GraphMirror,
    nodeId: NodeId,
    iterationIndex: number,
  ): SkipReason {
    const inEdges = mirror.incoming.get(nodeId) ?? []
    for (const edgeId of inEdges) {
      const edge = mirror.edges.get(edgeId)
      if (!edge) continue
      const srcKey = stateKey(edge.fromNodeId, iterationIndex)
      const srcState = mirror.states.get(srcKey)
      if (srcState?.state === "failed") return "upstream_failed"
      if (srcState?.state === "cancelled") return "run_cancelled"
    }
    return "upstream_skipped"
  }

  // -------------------------------------------------------------------------
  // Pause / Resume / Cancel (WorkflowEngine-Part06)
  // -------------------------------------------------------------------------

  async pauseRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    const run = this.runs.get(runId)
    if (!run) return err({ kind: "run_not_found", runId })

    if (run.state !== "running") {
      return err({
        kind: "persistence_failed",
        message: `Cannot pause run in state: ${run.state}`,
      })
    }

    run.state = "pausing"
    run.pausedAt = new Date().toISOString()
    run.runSeq++
    await this.persistence.saveRun(run)

    this.emitter.emit("workflow.run.state_changed", {
      runId,
      state: "pausing",
      runSeq: run.runSeq,
    })

    // If no nodes running, complete transition immediately
    const mirror = this.mirrors.get(runId)
    if (mirror && mirror.runningSet.size === 0) {
      run.state = "paused"
      run.runSeq++
      await this.persistence.saveRun(run)
      this.emitter.emit("workflow.run.state_changed", {
        runId,
        state: "paused",
        runSeq: run.runSeq,
      })
    }

    return ok(undefined)
  }

  async resumeRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    const run = this.runs.get(runId)
    if (!run) return err({ kind: "run_not_found", runId })

    if (run.state !== "paused") {
      return err({
        kind: "persistence_failed",
        message: `Cannot resume run in state: ${run.state}`,
      })
    }

    run.state = "running"
    run.runSeq++
    await this.persistence.saveRun(run)

    this.emitter.emit("workflow.run.state_changed", {
      runId,
      state: "running",
      runSeq: run.runSeq,
    })

    return ok(undefined)
  }

  async cancelRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    const run = this.runs.get(runId)
    if (!run) return err({ kind: "run_not_found", runId })

    if (isRunTerminal(run.state)) {
      return err({
        kind: "persistence_failed",
        message: `Cannot cancel terminal run in state: ${run.state}`,
      })
    }

    run.state = "cancelling"
    run.runSeq++
    await this.persistence.saveRun(run)

    this.emitter.emit("workflow.run.state_changed", {
      runId,
      state: "cancelling",
      runSeq: run.runSeq,
    })

    // Cancel all running nodes
    const mirror = this.mirrors.get(runId)
    if (mirror) {
      for (const key of mirror.runningSet) {
        const nodeState = mirror.states.get(key)
        if (nodeState?.executionId) {
          await this.executor.cancel(nodeState.executionId).catch(() => {})
        }
      }
    }

    // Complete transition
    return this.finishTransition(run, mirror!)
  }

  // -------------------------------------------------------------------------
  // Finish Transition (WorkflowEngine-Part06)
  // -------------------------------------------------------------------------

  private async finishTransition(
    run: WorkflowRun,
    mirror: GraphMirror,
  ): Promise<Result<void, WorkflowError>> {
    if (run.state === "pausing") {
      if (mirror.runningSet.size === 0) {
        run.state = "paused"
        run.runSeq++
        await this.persistence.saveRun(run)
        this.emitter.emit("workflow.run.state_changed", {
          runId: run.runId,
          state: "paused",
          runSeq: run.runSeq,
        })
      }
    } else if (run.state === "cancelling") {
      if (mirror.runningSet.size === 0) {
        run.state = "cancelled"
        run.endedAt = new Date().toISOString()
        run.runSeq++
        await this.persistence.saveRun(run)

        // Mark all non-terminal nodes as cancelled
        for (const [key, state] of mirror.states) {
          if (!isNodeTerminal(state.state)) {
            const parsed = parseStateKey(key)
            updateNodeState(mirror, parsed.nodeId, parsed.iterationIndex, "cancelled", {
              skipReason: "run_cancelled",
            })
          }
        }

        this.emitter.emit("workflow.run.state_changed", {
          runId: run.runId,
          state: "cancelled",
          runSeq: run.runSeq,
        })
      }
    }
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Finalize Run (WorkflowEngine-Part08 step 12)
  // -------------------------------------------------------------------------

  private async finalizeRun(
    run: WorkflowRun,
    mirror: GraphMirror,
  ): Promise<Result<void, WorkflowError>> {
    // Check for stuck nodes
    const pendingNodes: NodeId[] = []
    for (const [, state] of mirror.states) {
      if (state.state === "pending" || state.state === "ready") {
        pendingNodes.push(state.nodeId)
      }
    }

    if (pendingNodes.length > 0) {
      await this.failRun(run, {
        kind: "port_unsatisfied",
        failedNodeIds: pendingNodes,
        message: `Unsatisfiable nodes: ${pendingNodes.join(", ")}`,
        at: new Date().toISOString(),
      })
      return ok(undefined)
    }

    // Determine terminal state
    let hasFailed = false
    for (const [, state] of mirror.states) {
      if (state.state === "failed") {
        hasFailed = true
        break
      }
    }

    run.state = hasFailed ? "failed" : "succeeded"
    run.endedAt = new Date().toISOString()
    run.runSeq++
    await this.persistence.saveRun(run)

    this.emitter.emit("workflow.run.state_changed", {
      runId: run.runId,
      state: run.state,
      runSeq: run.runSeq,
    })
    this.emitter.emit("workflow.run.finished", { runId: run.runId, state: run.state })

    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Recovery (WorkflowEngine-Part06 §Restart Recovery)
  // -------------------------------------------------------------------------

  async recoverRun(runId: WorkflowRunId): Promise<Result<void, WorkflowError>> {
    const loadResult = await this.persistence.loadRun(runId)
    if (!loadResult.ok) return err({ kind: "persistence_failed", message: loadResult.error })
    if (!loadResult.value) return err({ kind: "run_not_found", runId })

    const run = loadResult.value
    if (isRunTerminal(run.state)) return ok(undefined)

    // Load snapshot
    const snapResult = await this.persistence.loadSnapshot(run.graphSnapshotId)
    if (!snapResult.ok || !snapResult.value) {
      await this.failRun(run, {
        kind: "recovery_impossible",
        failedNodeIds: [],
        message: `Snapshot not found: ${run.graphSnapshotId}`,
        at: new Date().toISOString(),
      })
      return err({ kind: "snapshot_missing", snapshotId: run.graphSnapshotId })
    }

    // Load persisted node states
    const statesResult = await this.persistence.loadNodeStates(runId)
    if (!statesResult.ok) {
      return err({ kind: "persistence_failed", message: statesResult.error })
    }

    // Build mirror
    const mirror = buildMirror(snapResult.value, statesResult.value)
    this.mirrors.set(runId, mirror)
    this.runs.set(runId, run)

    // Reconcile running nodes (WorkflowEngine-Part06 §reconcileRunning)
    if (run.state === "running") {
      for (const [key, state] of mirror.states) {
        if (state.state === "running" && state.executionId) {
          const status = await this.executor.status(state.executionId)
          if (status === "unknown" || status === "failed") {
            // Orphaned or dead — rollback to ready
            const parsed = parseStateKey(key)
            updateNodeState(mirror, parsed.nodeId, parsed.iterationIndex, "ready", {
              executionId: undefined,
              startedAt: undefined,
            })
            await this.persistence.saveNodeState(mirror.states.get(key)!)
          }
        }
      }
    }

    // Handle pausing/paused/cancelling
    if (run.state === "pausing" || run.state === "cancelling") {
      await this.finishTransition(run, mirror)
    }

    this.emitter.emit("workflow.run.recovered", { runId, state: run.state })
    return ok(undefined)
  }

  // -------------------------------------------------------------------------
  // Determinism Helpers (WorkflowEngine-Part07)
  // -------------------------------------------------------------------------

  private generateDeterminismSeed(): DeterminismSeed {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    let seed = ""
    for (let i = 0; i < this.config.determinismSeedLength; i++) {
      seed += chars[Math.floor(Math.random() * chars.length)]
    }
    return seed as DeterminismSeed
  }

  private deriveDeterministicSeed(
    baseSeed: DeterminismSeed,
    nodeId: NodeId,
    iterationIndex: number,
  ): string {
    // Simple deterministic derivation — in production use a real hash
    return `${baseSeed}_${nodeId}_${iterationIndex}`
  }

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  getRun(runId: WorkflowRunId): WorkflowRun | undefined {
    return this.runs.get(runId)
  }

  getMirror(runId: WorkflowRunId): GraphMirror | undefined {
    return this.mirrors.get(runId)
  }

  getContext(runId: WorkflowRunId): RunContext | undefined {
    return this.contexts.get(runId)
  }
}
