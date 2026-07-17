/**
 * P04-STATE-TASK — Task State Persistence
 *
 * Persistent task state from Task-Part01 through Part05.
 * Tasks are the smallest logical units of planned work. Their state
 * must be persisted to support scheduling, dependency tracking, and recovery.
 *
 * From Task-Part01: purpose, philosophy, responsibilities.
 * From Task-Part02: lifecycle, assignment, dependencies, priority.
 * From Task-Part03: scheduling, parallel execution, progress tracking.
 */

import type {
  TaskId,
  WorkerId,
  WorkspaceId,
  IsoTimestamp,
  Percentage,
} from "@/core/types"
import type { PersistenceMetadata, SequenceNumber } from "./state-types"

// ---------------------------------------------------------------------------
// Task state types (from Task-Part01)
// ---------------------------------------------------------------------------

export type TaskState =
  | "created"
  | "validated"
  | "ready"
  | "assigned"
  | "running"
  | "waiting"
  | "blocked"
  | "reviewing"
  | "retrying"
  | "verified"
  | "completed"
  | "failed"
  | "cancelled"

export const TASK_TERMINAL: readonly TaskState[] = [
  "completed",
  "failed",
  "cancelled",
] as const

export const TASK_ACTIVE: readonly TaskState[] = [
  "validated",
  "ready",
  "assigned",
  "running",
  "waiting",
  "blocked",
  "reviewing",
  "retrying",
  "verified",
] as const

// ---------------------------------------------------------------------------
// Task state machine
// ---------------------------------------------------------------------------

const TASK_TRANSITIONS: Map<TaskState, readonly TaskState[]> = new Map([
  ["created", ["validated", "cancelled"]],
  ["validated", ["ready", "cancelled"]],
  ["ready", ["assigned", "cancelled"]],
  ["assigned", ["running", "cancelled"]],
  ["running", ["reviewing", "waiting", "blocked", "completed", "failed", "cancelled"]],
  ["waiting", ["running", "blocked", "cancelled"]],
  ["blocked", ["ready", "running", "cancelled"]],
  ["reviewing", ["verified", "failed", "cancelled"]],
  ["retrying", ["running", "failed", "cancelled"]],
  ["verified", ["completed", "cancelled"]],
  ["completed", []],
  ["failed", ["retrying", "cancelled"]],
  ["cancelled", []],
])

export function canTaskTransition(from: TaskState, to: TaskState): boolean {
  const allowed = TASK_TRANSITIONS.get(from)
  return allowed !== undefined && (allowed as readonly TaskState[]).includes(to)
}

export function getTaskTransitions(state: TaskState): readonly TaskState[] {
  return TASK_TRANSITIONS.get(state) ?? []
}

// ---------------------------------------------------------------------------
// Task priority (from Task-Part02)
// ---------------------------------------------------------------------------

export type TaskPriority = "critical" | "high" | "normal" | "low" | "background"

// ---------------------------------------------------------------------------
// Task dependency
// ---------------------------------------------------------------------------

export interface TaskDependency {
  readonly taskId: TaskId
  readonly type: "requires" | "blocks"
}

// ---------------------------------------------------------------------------
// Task progress
// ---------------------------------------------------------------------------

export interface TaskProgress {
  readonly percentage: Percentage
  readonly currentStep?: string
  readonly totalSteps?: number
  readonly completedSteps?: number
  readonly estimatedRemainingMs?: number
  readonly lastUpdatedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Persisted task state
// ---------------------------------------------------------------------------

export interface PersistedTaskState {
  readonly id: TaskId
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly parentTaskId?: TaskId
  readonly childTaskIds: readonly TaskId[]

  /** Orchestrator that created this task. */
  readonly orchestratorId?: string

  /** Worker assigned to execute this task. */
  readonly assignedWorkerId?: WorkerId

  /** Task title and description. */
  readonly title: string
  readonly description: string

  /** Current state. */
  readonly state: TaskState

  /** Optimistic concurrency token. */
  readonly seq: SequenceNumber

  /** Priority. */
  readonly priority: TaskPriority

  /** Dependencies. */
  readonly dependencies: readonly TaskDependency[]

  /** Artifact ids produced by this task. */
  readonly artifactIds: readonly string[]

  /** Success criteria description. */
  readonly successCriteria?: string

  /** Progress. */
  readonly progress?: TaskProgress

  /** Retry state. */
  readonly retryState?: {
    readonly attempt: number
    readonly maxAttempts: number
    readonly lastError?: string
  }

  /** Blocking info. */
  readonly blockedBy?: {
    readonly reason: string
    readonly blockedAt: IsoTimestamp
  }

  /** Error info if failed. */
  readonly lastError?: {
    readonly code: string
    readonly message: string
    readonly at: IsoTimestamp
  }

  /** Estimated duration in ms. */
  readonly estimatedDurationMs?: number

  readonly createdAt: IsoTimestamp
  readonly updatedAt: IsoTimestamp
  readonly lastPersistedAt: IsoTimestamp

  readonly metadata: PersistenceMetadata
}

// ---------------------------------------------------------------------------
// Task state factory
// ---------------------------------------------------------------------------

export function createPersistedTaskState(
  id: TaskId,
  workspaceId: WorkspaceId,
  projectId: string,
  title: string,
  description: string,
  options?: {
    parentTaskId?: TaskId
    orchestratorId?: string
    priority?: TaskPriority
    dependencies?: readonly TaskDependency[]
    successCriteria?: string
    estimatedDurationMs?: number
  },
): PersistedTaskState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    id,
    workspaceId,
    projectId,
    parentTaskId: options?.parentTaskId,
    childTaskIds: [],
    orchestratorId: options?.orchestratorId,
    title,
    description,
    state: "created",
    seq: 1,
    priority: options?.priority ?? "normal",
    dependencies: options?.dependencies ?? [],
    artifactIds: [],
    successCriteria: options?.successCriteria,
    estimatedDurationMs: options?.estimatedDurationMs,
    createdAt: now,
    updatedAt: now,
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
 * Transition task state.
 * From Task-Part02: lifecycle follows deterministic path.
 */
export function transitionTaskState(
  current: PersistedTaskState,
  newState: TaskState,
  _reason: string,
): PersistedTaskState {
  if (!canTaskTransition(current.state, newState)) {
    throw new Error(`Invalid task transition: ${current.state} → ${newState}`)
  }
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...current,
    state: newState,
    seq: current.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...current.metadata,
      updatedAt: now,
      version: current.metadata.version + 1,
    },
  }
}

/**
 * Assign a worker to a task.
 * From Task-Part02: assignment considers worker capabilities, workload, permissions.
 */
export function assignTask(
  state: PersistedTaskState,
  workerId: WorkerId,
): PersistedTaskState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    assignedWorkerId: workerId,
    state: "assigned",
    seq: state.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Update task progress.
 * From Task-Part03: progress tracking records percentage, current state, etc.
 */
export function updateTaskProgress(
  state: PersistedTaskState,
  progress: TaskProgress,
): PersistedTaskState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    progress,
    seq: state.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Block a task.
 * From Task-Part03: blocked tasks must be reevaluated automatically when conditions change.
 */
export function blockTask(
  state: PersistedTaskState,
  reason: string,
): PersistedTaskState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    state: "blocked",
    blockedBy: { reason, blockedAt: now },
    seq: state.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Unblock a task.
 */
export function unblockTask(
  state: PersistedTaskState,
): PersistedTaskState {
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    state: "ready",
    blockedBy: undefined,
    seq: state.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

/**
 * Add an artifact to the task's artifact list.
 */
export function addTaskArtifact(
  state: PersistedTaskState,
  artifactId: string,
): PersistedTaskState {
  if (state.artifactIds.includes(artifactId)) return state
  const now = new Date().toISOString() as IsoTimestamp
  return {
    ...state,
    artifactIds: [...state.artifactIds, artifactId],
    seq: state.seq + 1,
    updatedAt: now,
    lastPersistedAt: now,
    metadata: {
      ...state.metadata,
      updatedAt: now,
      version: state.metadata.version + 1,
    },
  }
}

// ---------------------------------------------------------------------------
// Task state invariants
// ---------------------------------------------------------------------------

export function validateTaskState(
  state: PersistedTaskState,
): readonly string[] {
  const errors: string[] = []

  if (state.seq < 1) {
    errors.push("Sequence number must be >= 1")
  }

  if (state.progress && state.progress.percentage < 0) {
    errors.push("Progress percentage must be >= 0")
  }

  if (state.retryState && state.retryState.attempt > state.retryState.maxAttempts) {
    errors.push("Retry attempt exceeds max attempts")
  }

  if (!state.title) {
    errors.push("Title must be set")
  }

  return errors
}
