/**
 * P04-STATE-WORKFLOW — Workflow State Persistence
 *
 * Persistent workflow state from WorkflowEngine-Part01 through Part08.
 * The WorkflowRun, RunStep, and RunContext are the authoritative resume
 * source — they must be committed before the engine ticks onward.
 *
 * From RunStatePersistence-Part01: commit before tick, one resume point.
 * From RunStatePersistence-Part03: RunContext and the port-value contract.
 * From WorkflowEngine-Part01: the run object model and tick algorithm.
 */

import type {
  RunId,
  WorkspaceId,
  GraphNodeId,
  IsoTimestamp,
  JsonValue,
} from "@/core/types"
import type { PersistenceMetadata, SequenceNumber } from "./state-types"

// ---------------------------------------------------------------------------
// Workflow run state
// ---------------------------------------------------------------------------

export type WorkflowRunState =
  | "created"
  | "validating"
  | "running"
  | "pausing"
  | "paused"
  | "cancelling"
  | "cancelled"
  | "succeeded"
  | "failed"

export type RunMode = "normal" | "dry_run" | "replay"

export type RunTriggerKind = "user" | "orchestrator" | "schedule" | "event" | "replay" | "recovery"

export interface RunTrigger {
  readonly kind: RunTriggerKind
  readonly actorId: string
  readonly reason: string
  readonly at: IsoTimestamp
}

export type RunFailureKind =
  | "graph_invalid"
  | "node_failed_fatal"
  | "unknown_node_kind"
  | "port_unsatisfied"
  | "context_write_conflict"
  | "iteration_limit_exceeded"
  | "scheduler_unavailable"
  | "execution_engine_unavailable"
  | "persistence_failed"
  | "recovery_impossible"

export interface RunFailure {
  readonly kind: RunFailureKind
  readonly failedNodeIds: readonly GraphNodeId[]
  readonly message: string
  readonly at: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Workflow run state machine
// ---------------------------------------------------------------------------

const WORKFLOW_RUN_TRANSITIONS: Map<WorkflowRunState, readonly WorkflowRunState[]> = new Map([
  ["created", ["validating"]],
  ["validating", ["running", "failed"]],
  ["running", ["pausing", "cancelling", "succeeded", "failed"]],
  ["pausing", ["paused", "cancelling"]],
  ["paused", ["running", "cancelling"]],
  ["cancelling", ["cancelled", "failed"]],
  ["cancelled", []],
  ["succeeded", []],
  ["failed", []],
])

export const WORKFLOW_RUN_TERMINAL: readonly WorkflowRunState[] = [
  "succeeded",
  "failed",
  "cancelled",
] as const

export function canWorkflowRunTransition(from: WorkflowRunState, to: WorkflowRunState): boolean {
  const allowed = WORKFLOW_RUN_TRANSITIONS.get(from)
  return allowed !== undefined && (allowed as readonly WorkflowRunState[]).includes(to)
}

export function getWorkflowRunTransitions(state: WorkflowRunState): readonly WorkflowRunState[] {
  return WORKFLOW_RUN_TRANSITIONS.get(state) ?? []
}

// ---------------------------------------------------------------------------
// Node step state
// ---------------------------------------------------------------------------

export type NodeStepState =
  | "pending"
  | "ready"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled"

export const NODE_STEP_TERMINAL: readonly NodeStepState[] = [
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
] as const

export interface NodeStepInput {
  readonly portId: string
  readonly valueRef: string
}

export interface NodeStepOutput {
  readonly portId: string
  readonly valueRef: string
}

/**
 * Persisted state of a single node in a workflow run.
 * From RunStatePersistence-Part01: one row per (run, node).
 */
export interface PersistedNodeStep {
  /** Composite id: runId:nodeId. */
  readonly id: string
  readonly runId: RunId
  readonly nodeId: GraphNodeId
  readonly iterationIndex: number
  readonly state: NodeStepState
  readonly attempt: number
  readonly maxAttempts: number
  readonly workspaceId: WorkspaceId

  /** Input port values consumed by this step. */
  readonly inputs: readonly NodeStepInput[]

  /** Output port values produced by this step. */
  readonly outputs: readonly NodeStepOutput[]

  /** Error info if failed. */
  readonly error?: {
    readonly code: string
    readonly message: string
    readonly stack?: string
  }

  /** Execution duration in ms. */
  readonly durationMs?: number

  /** Worker id that executed this step. */
  readonly workerId?: string

  readonly startedAt?: IsoTimestamp
  readonly completedAt?: IsoTimestamp
  readonly lastPersistedAt: IsoTimestamp
  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Run context (port values)
// ---------------------------------------------------------------------------

/**
 * Port value carried between nodes via data edges.
 * From RunStatePersistence-Part03: the port-value contract.
 */
export interface PortValue {
  readonly portId: string
  readonly producingStepNodeId: GraphNodeId
  readonly producingStepIteration: number
  /** Either inline (small) or an artifact ref (large). */
  readonly inlineValue?: JsonValue
  readonly artifactRef?: string
  readonly producedAtTick: number
}

/**
 * Run context: data carried along data edges between nodes.
 * From RunStatePersistence-Part03: stored separately from run for large payloads.
 */
export interface PersistedRunContext {
  readonly id: string
  readonly runId: RunId
  readonly workspaceId: WorkspaceId
  readonly portValues: readonly PortValue[]
  readonly lastPersistedAt: IsoTimestamp
  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Persisted workflow run
// ---------------------------------------------------------------------------

/**
 * The authoritative persisted run record.
 * From WorkflowEngine-Part01: the WorkflowRun object model.
 * From RunStatePersistence-Part01: committed to SQLite before engine ticks.
 */
export interface PersistedWorkflowRun {
  /** Alias for runId — satisfies PersistedEntity.id. */
  readonly id: RunId
  readonly runId: RunId
  readonly workflowId: string
  readonly workflowVersion: number
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly sessionId: string

  readonly state: WorkflowRunState
  readonly seq: SequenceNumber

  /** Current tick counter — monotonically increasing. */
  readonly currentTick: number

  /** Engine version for compatibility on resume. */
  readonly engineVersion: string

  /** Graph snapshot id — frozen at run start. */
  readonly graphSnapshotId: string

  /** Run context reference. */
  readonly contextRef: string

  /** Run trigger. */
  readonly trigger: RunTrigger

  /** Run mode. */
  readonly mode: RunMode

  /** Node counts. */
  readonly nodeCount: number
  readonly completedNodeCount: number
  readonly failedNodeCount: number
  readonly skippedNodeCount: number

  /** Failure info. */
  readonly failure?: RunFailure

  /** Restart generation counter. */
  readonly restartGeneration: number

  /** Deterministic seed for reproducibility. */
  readonly determinismSeed: string

  readonly startedAt: IsoTimestamp
  readonly endedAt?: IsoTimestamp
  readonly pausedAt?: IsoTimestamp
  readonly lastPersistedAt: IsoTimestamp

  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Workflow run factory
// ---------------------------------------------------------------------------

export function createPersistedWorkflowRun(
  runId: RunId,
  workflowId: string,
  workflowVersion: number,
  workspaceId: WorkspaceId,
  projectId: string,
  sessionId: string,
  trigger: RunTrigger,
  graphSnapshotId: string,
  contextRef: string,
  nodeCount: number,
  engineVersion: string,
): PersistedWorkflowRun {
  const now = new Date().toISOString() as IsoTimestamp
  const determinismSeed = `${runId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return {
    id: runId,
    runId,
    workflowId,
    workflowVersion,
    workspaceId,
    projectId,
    sessionId,
    state: "created",
    seq: 1,
    currentTick: 0,
    engineVersion,
    graphSnapshotId,
    contextRef,
    trigger,
    mode: "normal",
    nodeCount,
    completedNodeCount: 0,
    failedNodeCount: 0,
    skippedNodeCount: 0,
    restartGeneration: 0,
    determinismSeed,
    startedAt: now,
    lastPersistedAt: now,
    metadata: {
      createdAt: now,
      updatedAt: now,
      version: 1,
      checksum: "",
    },
  }
}

/**
 * Transition workflow run state and bump sequence + tick.
 * From RunStatePersistence-Part02: persist before ticking onward.
 */
export function transitionWorkflowRun(
  current: PersistedWorkflowRun,
  newState: WorkflowRunState,
  _reason: string,
): PersistedWorkflowRun {
  if (!canWorkflowRunTransition(current.state, newState)) {
    throw new Error(`Invalid workflow run transition: ${current.state} → ${newState}`)
  }
  const now = new Date().toISOString() as IsoTimestamp
  const endedAt = (newState === "succeeded" || newState === "failed" || newState === "cancelled")
    ? now
    : current.endedAt
  const pausedAt = newState === "paused" ? now : current.pausedAt

  return {
    ...current,
    state: newState,
    seq: current.seq + 1,
    currentTick: current.currentTick + 1,
    endedAt,
    pausedAt,
    lastPersistedAt: now,
    metadata: {
      ...current.metadata,
      updatedAt: now,
      version: current.metadata.version + 1,
    },
  }
}

/**
 * Mark a node step as succeeded and update run counters.
 */
export function completeNodeStep(
  run: PersistedWorkflowRun,
  step: PersistedNodeStep,
): { run: PersistedWorkflowRun; step: PersistedNodeStep } {
  const now = new Date().toISOString() as IsoTimestamp
  const updatedStep: PersistedNodeStep = {
    ...step,
    state: "succeeded",
    completedAt: now,
    lastPersistedAt: now,
  }
  const updatedRun: PersistedWorkflowRun = {
    ...run,
    completedNodeCount: run.completedNodeCount + 1,
    seq: run.seq + 1,
    lastPersistedAt: now,
    metadata: {
      ...run.metadata,
      updatedAt: now,
      version: run.metadata.version + 1,
    },
  }
  return { run: updatedRun, step: updatedStep }
}

/**
 * Mark a node step as failed and update run counters.
 */
export function failNodeStep(
  run: PersistedWorkflowRun,
  step: PersistedNodeStep,
  error: { code: string; message: string; stack?: string },
): { run: PersistedWorkflowRun; step: PersistedNodeStep } {
  const now = new Date().toISOString() as IsoTimestamp
  const updatedStep: PersistedNodeStep = {
    ...step,
    state: "failed",
    error,
    completedAt: now,
    lastPersistedAt: now,
  }
  const updatedRun: PersistedWorkflowRun = {
    ...run,
    failedNodeCount: run.failedNodeCount + 1,
    seq: run.seq + 1,
    lastPersistedAt: now,
    metadata: {
      ...run.metadata,
      updatedAt: now,
      version: run.metadata.version + 1,
    },
  }
  return { run: updatedRun, step: updatedStep }
}

/**
 * Skip a node step and update run counters.
 */
export function skipNodeStep(
  run: PersistedWorkflowRun,
  step: PersistedNodeStep,
): { run: PersistedWorkflowRun; step: PersistedNodeStep } {
  const now = new Date().toISOString() as IsoTimestamp
  const updatedStep: PersistedNodeStep = {
    ...step,
    state: "skipped",
    completedAt: now,
    lastPersistedAt: now,
  }
  const updatedRun: PersistedWorkflowRun = {
    ...run,
    skippedNodeCount: run.skippedNodeCount + 1,
    seq: run.seq + 1,
    lastPersistedAt: now,
    metadata: {
      ...run.metadata,
      updatedAt: now,
      version: run.metadata.version + 1,
    },
  }
  return { run: updatedRun, step: updatedStep }
}

// ---------------------------------------------------------------------------
// Workflow run invariants
// ---------------------------------------------------------------------------

export function validateWorkflowRun(
  run: PersistedWorkflowRun,
): readonly string[] {
  const errors: string[] = []

  if (run.seq < 1) {
    errors.push("Sequence number must be >= 1")
  }

  if (run.currentTick < 0) {
    errors.push("Current tick must be >= 0")
  }

  if (run.completedNodeCount + run.failedNodeCount + run.skippedNodeCount > run.nodeCount) {
    errors.push("Sum of completed/failed/skipped exceeds node count")
  }

  if (run.completedNodeCount < 0 || run.failedNodeCount < 0 || run.skippedNodeCount < 0) {
    errors.push("Node counts must be >= 0")
  }

  if (run.nodeCount < 0) {
    errors.push("Node count must be >= 0")
  }

  const isTerminal = (WORKFLOW_RUN_TERMINAL as readonly WorkflowRunState[]).includes(run.state)
  if (isTerminal && !run.endedAt) {
    errors.push("Terminal run must have endedAt")
  }

  if (run.state === "running" && run.endedAt) {
    errors.push("Running run must not have endedAt")
  }

  if (!run.determinismSeed) {
    errors.push("Determinism seed must be set")
  }

  return errors
}
