/**
 * P05-SCHEDULER — Core Scheduler Types
 *
 * SchedulingUnit, SchedulingState, SchedulingPriority, ReadinessResult,
 * ReadinessBlocker, SafetyGateResult, BudgetEstimate, RetryPolicy,
 * SchedulingDependency, and related types from Scheduler-Part01 through Part08.
 */

import type { IsoTimestamp, WorkspaceId, ExecutionId } from "@/core/types"

// ---------------------------------------------------------------------------
// Scheduling Unit Kind (Scheduler-Part01 §Scheduling Unit)
// ---------------------------------------------------------------------------

export type SchedulingUnitKind =
  | "workflow_node"
  | "task"
  | "worker_spawn"
  | "tool_invocation"
  | "verification"
  | "merge"
  | "background_job"

// ---------------------------------------------------------------------------
// Scheduling State (Scheduler-Part01 §Scheduling States)
// ---------------------------------------------------------------------------

export type SchedulingState =
  | "created"
  | "queued"
  | "waiting_for_dependencies"
  | "waiting_for_permission"
  | "waiting_for_lock"
  | "waiting_for_budget"
  | "waiting_for_approval"
  | "ready"
  | "scheduled"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "skipped"

// ---------------------------------------------------------------------------
// Scheduling Priority (Scheduler-Part02 §Priority Levels)
// ---------------------------------------------------------------------------

export type SchedulingPriority = "critical" | "high" | "normal" | "low" | "background"

export const PRIORITY_NUMERIC: Record<SchedulingPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
  background: 4,
}

// ---------------------------------------------------------------------------
// Scheduling Unit (Scheduler-Part01 §Scheduling Unit)
// ---------------------------------------------------------------------------

export interface SchedulingUnit {
  readonly id: string
  readonly kind: SchedulingUnitKind
  readonly workspaceId: WorkspaceId
  readonly sessionId?: string
  readonly executionId?: ExecutionId
  readonly workflowId?: string
  readonly nodeId?: string
  readonly taskId?: string
  readonly priority: SchedulingPriority
  readonly dependencies: readonly string[]
  readonly requiredPermissions: readonly string[]
  readonly requiredLocks: readonly string[]
  readonly budgetEstimate?: BudgetEstimate
  state: SchedulingState
  readonly createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Scheduling Dependency (Scheduler-Part03 §Dependency Object)
// ---------------------------------------------------------------------------

export type DependencyType =
  | "unit_completed"
  | "artifact_available"
  | "approval_granted"
  | "lock_released"
  | "tool_available"
  | "budget_available"
  | "event_received"

export interface SchedulingDependency {
  readonly id: string
  readonly unitId: string
  readonly dependencyType: DependencyType
  readonly targetId: string
  readonly required: boolean
}

// ---------------------------------------------------------------------------
// Readiness Blocker (Scheduler-Part02 §Blocker Object)
// ---------------------------------------------------------------------------

export type BlockerKind =
  | "dependency"
  | "permission"
  | "approval"
  | "lock"
  | "budget"
  | "runtime_state"
  | "resource"
  | "tool_unavailable"
  | "workspace_unavailable"

export interface ReadinessBlocker {
  readonly kind: BlockerKind
  readonly message: string
  readonly blockingObjectId?: string
  readonly recoverable: boolean
}

// ---------------------------------------------------------------------------
// Readiness Result (Scheduler-Part02 §Readiness Object)
// ---------------------------------------------------------------------------

export interface ReadinessResult {
  readonly unitId: string
  readonly ready: boolean
  readonly blockers: readonly ReadinessBlocker[]
  readonly checkedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Safety Gate Result (Scheduler-Part05 §Safety Gate Object)
// ---------------------------------------------------------------------------

export type SafetyGateKind =
  | "runtime_state"
  | "dependency"
  | "permission"
  | "approval"
  | "lock"
  | "budget"
  | "resource"

export interface SafetyGateResult {
  readonly unitId: string
  readonly gate: SafetyGateKind
  readonly passed: boolean
  readonly blocker?: string
  readonly checkedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Budget Estimate (Scheduler-Part04 §Budget Estimate)
// ---------------------------------------------------------------------------

export type BudgetConfidence = "low" | "medium" | "high"

export interface BudgetEstimate {
  readonly estimatedRuntimeMs?: number
  readonly estimatedTokens?: number
  readonly estimatedCostMicroUsd?: number
  readonly estimatedWorkers?: number
  readonly estimatedToolInvocations?: number
  readonly estimatedFileWrites?: number
  readonly confidence: BudgetConfidence
}

// ---------------------------------------------------------------------------
// Budget Reservation
// ---------------------------------------------------------------------------

export interface BudgetReservation {
  readonly unitId: string
  readonly reservedAt: IsoTimestamp
  readonly runtimeMs?: number
  readonly tokens?: number
  readonly costMicroUsd?: number
  readonly workers?: number
  readonly toolInvocations?: number
  readonly fileWrites?: number
}

// ---------------------------------------------------------------------------
// Retry Policy (Scheduler-Part06 §Retry Policy)
// ---------------------------------------------------------------------------

export type BackoffStrategy = "none" | "fixed" | "exponential"

export interface RetryPolicy {
  readonly maxAttempts: number
  readonly backoff: BackoffStrategy
  readonly delayMs?: number
  readonly retryOn: readonly string[]
  readonly requireRevalidation: boolean
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoff: "exponential",
  delayMs: 1_000,
  retryOn: ["lock_conflict", "merge_conflict", "timeout", "tool_unavailable"],
  requireRevalidation: true,
}

// ---------------------------------------------------------------------------
// Failure Categories (Scheduler-Part06 §Failure Categories)
// ---------------------------------------------------------------------------

export type FailureCategory =
  | "dependency_failed"
  | "permission_denied"
  | "approval_rejected"
  | "lock_timeout"
  | "budget_exhausted"
  | "tool_unavailable"
  | "worker_failed"
  | "runtime_unsafe"
  | "timeout"
  | "unknown_error"

// ---------------------------------------------------------------------------
// Queue Types (Scheduler-Part02 §Queue Types)
// ---------------------------------------------------------------------------

export type QueueKind =
  | "incoming"
  | "dependency_wait"
  | "permission_wait"
  | "approval_wait"
  | "lock_wait"
  | "budget_wait"
  | "runnable"
  | "running"
  | "retry"
  | "cancelled"
  | "completed"
  | "failed"

// ---------------------------------------------------------------------------
// Concurrency Policy
// ---------------------------------------------------------------------------

export type ConcurrencyPolicy = "fifo" | "priority" | "fair"

// ---------------------------------------------------------------------------
// Scheduler Queue Snapshot (Scheduler-Part08 §Public API)
// ---------------------------------------------------------------------------

export interface QueueSnapshotEntry {
  readonly unitId: string
  readonly kind: SchedulingUnitKind
  readonly priority: SchedulingPriority
  readonly state: SchedulingState
  readonly waitReason?: BlockerKind
  readonly queuedAt: IsoTimestamp
  readonly ageMs: number
}

export interface SchedulerQueueSnapshot {
  readonly queues: Readonly<Record<QueueKind, readonly QueueSnapshotEntry[]>>
  readonly runningCount: number
  readonly totalBlocked: number
  readonly timestamp: IsoTimestamp
}
