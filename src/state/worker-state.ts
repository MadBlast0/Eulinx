/**
 * P04-STATE-WORKER — Worker State Persistence
 *
 * Persistent worker state from Worker-Part01 through Part03.
 * Workers are the smallest autonomous execution units. Their state
 * must be persisted so that a crash mid-execution can be resumed.
 *
 * From Worker-Part02: complete object model and state lifecycle.
 * From RunStatePersistence-Part01: commit before tick, one resume point.
 */

import type {
  WorkerId,
  WorkspaceId,
  TaskId,
  SessionId,
  IsoTimestamp,
  JsonValue,
  Percentage,
} from "@/core/types"
import type { RunState, RefinementMode } from "@/core/enums"
import type { PersistenceMetadata, SequenceNumber } from "./state-types"

// ---------------------------------------------------------------------------
// Worker state model
// ---------------------------------------------------------------------------

export interface PersistedWorkerState {
  readonly id: WorkerId
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly parentWorkerId?: WorkerId
  readonly childWorkerIds: readonly WorkerId[]
  readonly orchestratorId?: string
  readonly taskId?: TaskId
  readonly terminalId?: string
  readonly sessionId?: SessionId

  /** Provider and model configuration. */
  readonly provider?: string
  readonly model?: string

  /** Current execution state. */
  readonly state: RunState

  /** Optimistic concurrency token. */
  readonly seq: SequenceNumber

  /** Refinement mode. */
  readonly refinementMode: RefinementMode

  /** Progress percentage (0-100). */
  readonly progress?: Percentage

  /** Prompt used for this worker. */
  readonly prompt?: string

  /** Context data. */
  readonly context?: JsonValue

  /** Permission profile id. */
  readonly permissionProfileId?: string

  /** Memory channel id. */
  readonly memoryId?: string

  /** Artifact ids produced by this worker. */
  readonly artifactIds: readonly string[]

  /** Execution metrics. */
  readonly metrics: WorkerMetrics

  /** Retry state. */
  readonly retryState?: WorkerRetryState

  /** When the worker was created. */
  readonly createdAt: IsoTimestamp

  /** When the worker was last persisted. */
  readonly lastPersistedAt: IsoTimestamp

  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Worker metrics
// ---------------------------------------------------------------------------

export interface WorkerMetrics {
  readonly totalTokens: number
  readonly totalCostMicroUsd: number
  readonly executionCount: number
  readonly errorCount: number
  readonly totalDurationMs: number
  readonly lastActivityAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker retry state
// ---------------------------------------------------------------------------

export interface WorkerRetryState {
  readonly attempt: number
  readonly maxAttempts: number
  readonly backoffMs: number
  readonly lastError?: string
  readonly nextRetryAt?: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Worker state transitions
// ---------------------------------------------------------------------------

/**
 * Valid worker state transitions from Worker-Part02.
 * Uses the existing WORKER_TRANSITIONS from core/base.ts.
 */
import { WORKER_TRANSITIONS } from "@/core/base"

export function canWorkerTransition(from: RunState, to: RunState): boolean {
  const allowed = WORKER_TRANSITIONS.get(from)
  return allowed !== undefined && (allowed as readonly RunState[]).includes(to)
}

export function getWorkerTransitions(state: RunState): readonly RunState[] {
  return WORKER_TRANSITIONS.get(state) ?? []
}

// ---------------------------------------------------------------------------
// Worker state factory
// ---------------------------------------------------------------------------

export function createPersistedWorkerState(
  id: WorkerId,
  workspaceId: WorkspaceId,
  projectId: string,
  options?: {
    parentWorkerId?: WorkerId
    orchestratorId?: string
    taskId?: TaskId
    provider?: string
    model?: string
    prompt?: string
    refinementMode?: RefinementMode
    permissionProfileId?: string
  },
): PersistedWorkerState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    id,
    workspaceId,
    projectId,
    parentWorkerId: options?.parentWorkerId,
    childWorkerIds: [],
    orchestratorId: options?.orchestratorId,
    taskId: options?.taskId,
    provider: options?.provider,
    model: options?.model,
    state: "created",
    seq: 1,
    refinementMode: options?.refinementMode ?? "medium",
    prompt: options?.prompt,
    permissionProfileId: options?.permissionProfileId,
    artifactIds: [],
    metrics: {
      totalTokens: 0,
      totalCostMicroUsd: 0,
      executionCount: 0,
      errorCount: 0,
      totalDurationMs: 0,
    },
    createdAt: now,
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
 * Transition worker state and bump sequence number.
 * From RunStatePersistence-Part02: persist before ticking onward.
 */
export function transitionWorkerState(
  current: PersistedWorkerState,
  newState: RunState,
  _reason: string,
): PersistedWorkerState {
  if (!canWorkerTransition(current.state, newState)) {
    throw new Error(`Invalid worker transition: ${current.state} → ${newState}`)
  }
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...current,
    state: newState,
    seq: current.seq + 1,
    lastPersistedAt: now,
    metadata: {
      ...current.metadata,
      updatedAt: now,
      version: current.metadata.version + 1,
    },
  }
}

/**
 * Update worker metrics.
 */
export function updateWorkerMetrics(
  state: PersistedWorkerState,
  metrics: Partial<WorkerMetrics>,
): PersistedWorkerState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    metrics: { ...state.metrics, ...metrics },
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Update worker progress.
 */
export function updateWorkerProgress(
  state: PersistedWorkerState,
  progress: Percentage,
): PersistedWorkerState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    progress,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Add an artifact to the worker's artifact list.
 */
export function addWorkerArtifact(
  state: PersistedWorkerState,
  artifactId: string,
): PersistedWorkerState {
  if (state.artifactIds.includes(artifactId)) return state
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    artifactIds: [...state.artifactIds, artifactId],
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

// ---------------------------------------------------------------------------
// Worker state invariants
// ---------------------------------------------------------------------------

export function validateWorkerState(
  state: PersistedWorkerState,
): readonly string[] {
  const errors: string[] = []

  if (state.seq < 1) {
    errors.push("Sequence number must be >= 1")
  }

  if (state.metrics.totalTokens < 0) {
    errors.push("Total tokens must be >= 0")
  }

  if (state.metrics.totalCostMicroUsd < 0) {
    errors.push("Total cost must be >= 0")
  }

  if (state.progress !== undefined && (state.progress < 0 || state.progress > 100)) {
    errors.push("Progress must be between 0 and 100")
  }

  if (state.retryState && state.retryState.attempt > state.retryState.maxAttempts) {
    errors.push("Retry attempt exceeds max attempts")
  }

  return errors
}
