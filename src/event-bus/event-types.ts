/**
 * P03-EVENT-BUS — Event Types Catalog
 *
 * The complete typed event catalog from EventBus-Part02 and EventAPI-Part02.
 * If an event is not in this catalog, it does not exist.
 *
 * Naming rules:
 *   - Event types follow `<family>.<past_tense_fact>`
 *   - Families: runtime, worker, execution, artifact, merge, lock, permission,
 *     memory, tool, process, plugin, ui, eventbus
 */

import type {
  WorkerId,
  ExecutionId,
  ArtifactId,
  LockId,
  PluginId,
  WorkspaceId,
  SessionId,
  IsoTimestamp,
  Duration,
} from "@/core/types"

// ---------------------------------------------------------------------------
// Shared payload primitives (EventBus-Part02 §Shared Payload Primitives)
// ---------------------------------------------------------------------------

export type ProcessId = string
export type ToolId = string
export type SubscriptionId = string

export type RuntimeServiceName =
  | "RuntimeManager"
  | "Scheduler"
  | "WorkerSpawner"
  | "ExecutionEngine"
  | "WorkspaceManager"
  | "MemoryManager"
  | "ArtifactManager"
  | "MergeManager"
  | "LockManager"
  | "PermissionManager"
  | "ContextManager"
  | "ToolRegistry"
  | "EventBus"
  | "ProcessLifecycle"

export type WorkerState =
  | "created"
  | "initializing"
  | "idle"
  | "planning"
  | "working"
  | "waiting"
  | "blocked"
  | "reviewing"
  | "testing"
  | "completed"
  | "failed"
  | "cancelled"
  | "terminated"

export type RuntimeState =
  | "uninitialized"
  | "starting"
  | "ready"
  | "running"
  | "degraded"
  | "draining"
  | "stopped"
  | "failed"
  | "recovery"

export type HealthLevel = "healthy" | "degraded" | "failed"

export type FailureInfo = {
  readonly code: string
  readonly message: string
  readonly retryable: boolean
  readonly serviceName: RuntimeServiceName
}

// ---------------------------------------------------------------------------
// EulinxEvent base (EventBus-Part01 §Object Model)
// ---------------------------------------------------------------------------

export type EventSource = {
  readonly service: RuntimeServiceName
  readonly instanceId?: string
}

export type EulinxEvent<TType extends string = string, TPayload = unknown> = {
  readonly eventId: string
  readonly sequence: number
  readonly type: TType
  readonly payload: TPayload
  readonly source: EventSource
  readonly workspaceId: WorkspaceId
  readonly sessionId?: SessionId
  readonly executionId?: ExecutionId
  readonly correlationId?: string
  readonly causationId?: string
  readonly replayGrade: boolean
  readonly emittedAt: IsoTimestamp
}

// ---------------------------------------------------------------------------
// Runtime Events (replay-grade)
// ---------------------------------------------------------------------------

export type RuntimeStartedPayload = {
  readonly runtimeId: string
  readonly version: string
  readonly services: RuntimeServiceName[]
  readonly startupDurationMs: Duration
}

export type RuntimeStoppedPayload = {
  readonly runtimeId: string
  readonly reason: "user_request" | "shutdown_signal" | "fatal_error"
  readonly drainedEvents: number
}

export type RuntimeStateChangedPayload = {
  readonly runtimeId: string
  readonly from: RuntimeState
  readonly to: RuntimeState
  readonly reason: string
}

export type RuntimeServiceHealthChangedPayload = {
  readonly service: RuntimeServiceName
  readonly from: HealthLevel
  readonly to: HealthLevel
  readonly detail: string
}

export type RuntimeWorkspaceBoundPayload = {
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly rootPath: string
}

export type RuntimeInvariantViolatedPayload = {
  readonly invariant: string
  readonly service: RuntimeServiceName
  readonly detail: string
  readonly fatal: boolean
}

// ---------------------------------------------------------------------------
// Worker Events (replay-grade except output_streamed)
// ---------------------------------------------------------------------------

export type WorkerSpawnedPayload = {
  readonly workerId: WorkerId
  readonly workspaceId: WorkspaceId
  readonly sessionId: SessionId
  readonly providerId: string
  readonly modelId: string
  readonly processId?: ProcessId
  readonly permissionProfileId: string
  readonly contextPackageId: string
  readonly spawnDurationMs: Duration
}

export type WorkerReadyPayload = {
  readonly workerId: WorkerId
  readonly readyAt: IsoTimestamp
}

export type WorkerStateChangedPayload = {
  readonly workerId: WorkerId
  readonly from: WorkerState
  readonly to: WorkerState
  readonly reason: string
}

export type WorkerOutputStreamedPayload = {
  readonly workerId: WorkerId
  readonly streamId: string
  readonly chunk: string
  readonly channel: "stdout" | "stderr" | "reasoning" | "message"
  readonly chunkIndex: number
}

export type WorkerCompletedPayload = {
  readonly workerId: WorkerId
  readonly producedArtifactIds: ArtifactId[]
  readonly tokensIn: number
  readonly tokensOut: number
  /** Integer micro-USD, never a float (EventBus-Part04 §Serialization rule 4) */
  readonly costMicroUsd: number
  readonly durationMs: Duration
}

export type WorkerFailedPayload = {
  readonly workerId: WorkerId
  readonly failure: FailureInfo
  readonly partialArtifactIds: ArtifactId[]
}

export type WorkerCancelledPayload = {
  readonly workerId: WorkerId
  readonly requestedBy: "user" | "scheduler" | "runtime"
  readonly reason: string
}

export type WorkerTerminatedPayload = {
  readonly workerId: WorkerId
  readonly processId?: ProcessId
  readonly exitCode?: number
  readonly forced: boolean
}

// ---------------------------------------------------------------------------
// Execution Events (replay-grade except progress_reported)
// ---------------------------------------------------------------------------

export type ExecutionStartedPayload = {
  readonly executionId: ExecutionId
  readonly workspaceId: WorkspaceId
  readonly workflowId?: string
  readonly rootTaskId: string
  readonly plannedNodeCount: number
}

export type ExecutionNodeQueuedPayload = {
  readonly executionId: ExecutionId
  readonly nodeId: string
  readonly priority: number
  readonly dependencies: string[]
}

export type ExecutionNodeBlockedPayload = {
  readonly executionId: ExecutionId
  readonly nodeId: string
  readonly blockedOn: "dependencies" | "permission" | "lock" | "budget" | "approval"
  readonly detail: string
}

export type ExecutionNodeStartedPayload = {
  readonly executionId: ExecutionId
  readonly nodeId: string
  readonly workerId?: WorkerId
  readonly attempt: number
}

export type ExecutionNodeCompletedPayload = {
  readonly executionId: ExecutionId
  readonly nodeId: string
  readonly artifactIds: ArtifactId[]
  readonly durationMs: Duration
}

export type ExecutionNodeFailedPayload = {
  readonly executionId: ExecutionId
  readonly nodeId: string
  readonly attempt: number
  readonly willRetry: boolean
  readonly failure: FailureInfo
}

export type ExecutionProgressReportedPayload = {
  readonly executionId: ExecutionId
  readonly completedNodes: number
  readonly totalNodes: number
  readonly percent: number
}

export type ExecutionCompletedPayload = {
  readonly executionId: ExecutionId
  readonly outcome: "success" | "partial"
  readonly artifactIds: ArtifactId[]
  readonly durationMs: Duration
  readonly totalCostMicroUsd: number
}

export type ExecutionFailedPayload = {
  readonly executionId: ExecutionId
  readonly failure: FailureInfo
  readonly failedNodeIds: string[]
}

export type ExecutionCancelledPayload = {
  readonly executionId: ExecutionId
  readonly requestedBy: "user" | "runtime"
  readonly cancelledNodeIds: string[]
}

// ---------------------------------------------------------------------------
// Artifact Events (all replay-grade)
// ---------------------------------------------------------------------------

export type ArtifactCreatedPayload = {
  readonly artifactId: ArtifactId
  readonly workerId?: WorkerId
  readonly executionId?: ExecutionId
  readonly kind: "patch" | "file" | "message" | "plan" | "report" | "test_result"
  readonly targetPaths: string[]
  readonly sizeBytes: number
  readonly contentHash: string
}

export type ArtifactVerifiedPayload = {
  readonly artifactId: ArtifactId
  readonly checks: string[]
  readonly durationMs: Duration
}

export type ArtifactRejectedPayload = {
  readonly artifactId: ArtifactId
  readonly failedCheck: string
  readonly reason: string
}

export type ArtifactVersionedPayload = {
  readonly artifactId: ArtifactId
  readonly previousArtifactId: ArtifactId
  readonly version: number
}

export type ArtifactIndexedPayload = {
  readonly artifactId: ArtifactId
  readonly indexName: string
}

export type ArtifactDiscardedPayload = {
  readonly artifactId: ArtifactId
  readonly reason: "superseded" | "rejected" | "user_discarded" | "expired"
}

// ---------------------------------------------------------------------------
// Merge Events (all replay-grade)
// ---------------------------------------------------------------------------

export type MergeRequestedPayload = {
  readonly mergeId: string
  readonly artifactIds: ArtifactId[]
  readonly targetPaths: string[]
  readonly requiresApproval: boolean
}

export type MergeApprovalRequiredPayload = {
  readonly mergeId: string
  readonly reason: string
  readonly targetPaths: string[]
}

export type MergeApprovedPayload = {
  readonly mergeId: string
  readonly approvedBy: "user" | "policy"
  readonly policyId?: string
}

export type MergeRejectedPayload = {
  readonly mergeId: string
  readonly rejectedBy: "user" | "policy"
  readonly reason: string
}

export type MergeConflictDetectedPayload = {
  readonly mergeId: string
  readonly path: string
  readonly conflictKind: "content" | "delete_modify" | "lock_held" | "stale_base"
  readonly detail: string
}

export type MergeAppliedPayload = {
  readonly mergeId: string
  readonly artifactIds: ArtifactId[]
  readonly changedPaths: string[]
  readonly commitId?: string
  readonly durationMs: Duration
}

export type MergeFailedPayload = {
  readonly mergeId: string
  readonly failure: FailureInfo
  readonly rolledBack: boolean
}

export type MergeRolledBackPayload = {
  readonly mergeId: string
  readonly restoredPaths: string[]
  readonly reason: string
}

// ---------------------------------------------------------------------------
// Lock Events (all replay-grade)
// ---------------------------------------------------------------------------

export type LockRequestedPayload = {
  readonly lockId: LockId
  readonly holderId: string
  readonly holderKind: "worker" | "merge" | "service"
  readonly resource: string
  readonly lockKind: "file" | "symbol" | "artifact" | "resource" | "terminal"
  readonly mode: "shared" | "exclusive"
}

export type LockGrantedPayload = {
  readonly lockId: LockId
  readonly holderId: string
  readonly resource: string
  readonly waitedMs: Duration
}

export type LockQueuedPayload = {
  readonly lockId: LockId
  readonly holderId: string
  readonly resource: string
  readonly queuePosition: number
  readonly currentHolderId: string
}

export type LockReleasedPayload = {
  readonly lockId: LockId
  readonly holderId: string
  readonly resource: string
  readonly heldMs: Duration
}

export type LockDeniedPayload = {
  readonly lockId: LockId
  readonly holderId: string
  readonly resource: string
  readonly reason: "timeout" | "policy" | "shutdown"
}

export type LockTimedOutPayload = {
  readonly lockId: LockId
  readonly holderId: string
  readonly resource: string
  readonly waitedMs: Duration
}

export type LockDeadlockDetectedPayload = {
  readonly cycle: string[]
  readonly victimHolderId: string
  readonly resources: string[]
}

// ---------------------------------------------------------------------------
// Permission Events (all replay-grade — audit trail, NEVER lossy)
// ---------------------------------------------------------------------------

export type PermissionRequestedPayload = {
  readonly requestId: string
  readonly requesterId: string
  readonly requesterKind: "worker" | "tool" | "plugin" | "service"
  readonly capability: string
  readonly target: string
  readonly scope: "session" | "execution" | "once"
}

export type PermissionGrantedPayload = {
  readonly requestId: string
  readonly capability: string
  readonly target: string
  readonly grantedBy: "user" | "policy" | "profile"
  readonly policyId?: string
  readonly expiresAt?: IsoTimestamp
}

export type PermissionDeniedPayload = {
  readonly requestId: string
  readonly capability: string
  readonly target: string
  readonly deniedBy: "user" | "policy" | "default_deny"
  readonly reason: string
}

export type PermissionPromptShownPayload = {
  readonly requestId: string
  readonly capability: string
  readonly target: string
}

export type PermissionRevokedPayload = {
  readonly requestId: string
  readonly capability: string
  readonly revokedBy: "user" | "policy" | "expiry"
}

export type PermissionProfileAppliedPayload = {
  readonly profileId: string
  readonly subjectId: string
  readonly capabilities: string[]
}

// ---------------------------------------------------------------------------
// Memory Events (replay-grade except search_performed)
// ---------------------------------------------------------------------------

export type MemoryWrittenPayload = {
  readonly memoryId: string
  readonly scope: "workspace" | "session" | "worker" | "project"
  readonly kind: "fact" | "summary" | "decision" | "note"
  readonly sizeBytes: number
  readonly authorId: string
}

export type MemorySummarizedPayload = {
  readonly memoryId: string
  readonly sourceMemoryIds: string[]
  readonly compressionRatio: number
}

export type MemoryIndexedPayload = {
  readonly memoryId: string
  readonly vectorDimensions: number
  readonly indexName: string
}

export type MemorySearchPerformedPayload = {
  readonly queryId: string
  readonly scope: string
  readonly resultCount: number
  readonly durationMs: Duration
}

export type MemoryEvictedPayload = {
  readonly memoryId: string
  readonly reason: "expired" | "budget" | "user_deleted" | "superseded"
}

// ---------------------------------------------------------------------------
// Tool Events (all replay-grade)
// ---------------------------------------------------------------------------

export type ToolRegisteredPayload = {
  readonly toolId: ToolId
  readonly name: string
  readonly origin: "internal" | "mcp" | "plugin" | "cli"
  readonly schemaHash: string
}

export type ToolInvokedPayload = {
  readonly invocationId: string
  readonly toolId: ToolId
  readonly callerId: string
  readonly callerKind: "worker" | "orchestrator" | "service"
  readonly argumentsHash: string
  readonly permissionRequestId?: string
}

export type ToolSucceededPayload = {
  readonly invocationId: string
  readonly toolId: ToolId
  readonly resultHash: string
  readonly producedArtifactIds: ArtifactId[]
  readonly durationMs: Duration
}

export type ToolFailedPayload = {
  readonly invocationId: string
  readonly toolId: ToolId
  readonly failure: FailureInfo
}

export type ToolTimedOutPayload = {
  readonly invocationId: string
  readonly toolId: ToolId
  readonly timeoutMs: Duration
}

export type ToolBlockedPayload = {
  readonly invocationId: string
  readonly toolId: ToolId
  readonly reason: "permission_denied" | "not_registered" | "schema_invalid" | "runtime_unsafe"
}

// ---------------------------------------------------------------------------
// Process Events (replay-grade except output_streamed)
// ---------------------------------------------------------------------------

export type ProcessStartedPayload = {
  readonly processId: ProcessId
  readonly ownerId: string
  readonly command: string
  readonly args: string[]
  readonly cwd: string
  readonly pty: boolean
  readonly osPid: number
}

export type ProcessOutputStreamedPayload = {
  readonly processId: ProcessId
  readonly chunk: string
  readonly channel: "stdout" | "stderr"
  readonly chunkIndex: number
}

export type ProcessExitedPayload = {
  readonly processId: ProcessId
  readonly exitCode: number
  readonly durationMs: Duration
}

export type ProcessKilledPayload = {
  readonly processId: ProcessId
  readonly signal: string
  readonly requestedBy: "user" | "runtime" | "timeout"
}

export type ProcessCrashedPayload = {
  readonly processId: ProcessId
  readonly signal?: string
  readonly failure: FailureInfo
}

export type ProcessRestartedPayload = {
  readonly processId: ProcessId
  readonly previousProcessId: ProcessId
  readonly attempt: number
}

// ---------------------------------------------------------------------------
// Plugin Events (all replay-grade)
// ---------------------------------------------------------------------------

export type PluginLoadedPayload = {
  readonly pluginId: PluginId
  readonly name: string
  readonly version: string
  readonly subscribedTopics: string[]
  readonly grantedCapabilities: string[]
}

export type PluginUnloadedPayload = {
  readonly pluginId: PluginId
  readonly reason: "user_request" | "shutdown" | "error"
}

export type PluginSubscribedPayload = {
  readonly pluginId: PluginId
  readonly subscriptionId: string
  readonly topicPattern: string
}

export type PluginErroredPayload = {
  readonly pluginId: PluginId
  readonly failure: FailureInfo
  readonly subscriptionId?: string
}

export type PluginQuarantinedPayload = {
  readonly pluginId: PluginId
  readonly reason: "slow_subscriber" | "repeated_panic" | "capability_violation"
  readonly droppedEvents: number
  readonly detail: string
}

// ---------------------------------------------------------------------------
// UI Events (NOT replay-grade)
// ---------------------------------------------------------------------------

export type UiViewOpenedPayload = {
  readonly viewId: string
  readonly viewKind: "workspace" | "worker" | "execution" | "diff" | "logs" | "settings"
  readonly subjectId?: string
}

export type UiUserActionPayload = {
  readonly actionId: string
  readonly action:
    | "approve_merge"
    | "reject_merge"
    | "cancel_execution"
    | "grant_permission"
    | "deny_permission"
  readonly subjectId: string
}

export type UiNotificationRaisedPayload = {
  readonly notificationId: string
  readonly severity: "info" | "warning" | "error"
  readonly message: string
  readonly subjectId?: string
}

// ---------------------------------------------------------------------------
// EventBus Self Events (replay-grade)
// ---------------------------------------------------------------------------

export type EventBusSubscriberDroppedEventPayload = {
  readonly subscriptionId: string
  readonly subscriberKind: "core" | "plugin" | "ui"
  readonly droppedEventType: string
  readonly droppedCount: number
  readonly reason: "queue_full" | "slow_subscriber" | "quarantined"
}

export type EventBusSubscriberPanickedPayload = {
  readonly subscriptionId: string
  readonly subscriberKind: "core" | "plugin" | "ui"
  readonly eventType: string
  readonly detail: string
}

export type EventBusLogWriteFailedPayload = {
  readonly eventType: string
  readonly sequence: number
  readonly failure: FailureInfo
}

export type EventBusBackpressureEngagedPayload = {
  readonly queue: "core" | "plugin"
  readonly depth: number
  readonly capacity: number
}

// ---------------------------------------------------------------------------
// EulinxEventUnion — the complete event union (EventBus-Part02 §Complete Event Union)
// ---------------------------------------------------------------------------

export type EulinxEventUnion =
  // Runtime
  | EulinxEvent<"runtime.started", RuntimeStartedPayload>
  | EulinxEvent<"runtime.stopped", RuntimeStoppedPayload>
  | EulinxEvent<"runtime.state_changed", RuntimeStateChangedPayload>
  | EulinxEvent<"runtime.service_health_changed", RuntimeServiceHealthChangedPayload>
  | EulinxEvent<"runtime.workspace_bound", RuntimeWorkspaceBoundPayload>
  | EulinxEvent<"runtime.invariant_violated", RuntimeInvariantViolatedPayload>
  // Worker
  | EulinxEvent<"worker.spawned", WorkerSpawnedPayload>
  | EulinxEvent<"worker.ready", WorkerReadyPayload>
  | EulinxEvent<"worker.state_changed", WorkerStateChangedPayload>
  | EulinxEvent<"worker.output_streamed", WorkerOutputStreamedPayload>
  | EulinxEvent<"worker.completed", WorkerCompletedPayload>
  | EulinxEvent<"worker.failed", WorkerFailedPayload>
  | EulinxEvent<"worker.cancelled", WorkerCancelledPayload>
  | EulinxEvent<"worker.terminated", WorkerTerminatedPayload>
  // Execution
  | EulinxEvent<"execution.started", ExecutionStartedPayload>
  | EulinxEvent<"execution.node_queued", ExecutionNodeQueuedPayload>
  | EulinxEvent<"execution.node_blocked", ExecutionNodeBlockedPayload>
  | EulinxEvent<"execution.node_started", ExecutionNodeStartedPayload>
  | EulinxEvent<"execution.node_completed", ExecutionNodeCompletedPayload>
  | EulinxEvent<"execution.node_failed", ExecutionNodeFailedPayload>
  | EulinxEvent<"execution.progress_reported", ExecutionProgressReportedPayload>
  | EulinxEvent<"execution.completed", ExecutionCompletedPayload>
  | EulinxEvent<"execution.failed", ExecutionFailedPayload>
  | EulinxEvent<"execution.cancelled", ExecutionCancelledPayload>
  // Artifact
  | EulinxEvent<"artifact.created", ArtifactCreatedPayload>
  | EulinxEvent<"artifact.verified", ArtifactVerifiedPayload>
  | EulinxEvent<"artifact.rejected", ArtifactRejectedPayload>
  | EulinxEvent<"artifact.versioned", ArtifactVersionedPayload>
  | EulinxEvent<"artifact.indexed", ArtifactIndexedPayload>
  | EulinxEvent<"artifact.discarded", ArtifactDiscardedPayload>
  // Merge
  | EulinxEvent<"merge.requested", MergeRequestedPayload>
  | EulinxEvent<"merge.approval_required", MergeApprovalRequiredPayload>
  | EulinxEvent<"merge.approved", MergeApprovedPayload>
  | EulinxEvent<"merge.rejected", MergeRejectedPayload>
  | EulinxEvent<"merge.conflict_detected", MergeConflictDetectedPayload>
  | EulinxEvent<"merge.applied", MergeAppliedPayload>
  | EulinxEvent<"merge.failed", MergeFailedPayload>
  | EulinxEvent<"merge.rolled_back", MergeRolledBackPayload>
  // Lock
  | EulinxEvent<"lock.requested", LockRequestedPayload>
  | EulinxEvent<"lock.granted", LockGrantedPayload>
  | EulinxEvent<"lock.queued", LockQueuedPayload>
  | EulinxEvent<"lock.released", LockReleasedPayload>
  | EulinxEvent<"lock.denied", LockDeniedPayload>
  | EulinxEvent<"lock.timed_out", LockTimedOutPayload>
  | EulinxEvent<"lock.deadlock_detected", LockDeadlockDetectedPayload>
  // Permission
  | EulinxEvent<"permission.requested", PermissionRequestedPayload>
  | EulinxEvent<"permission.prompt_shown", PermissionPromptShownPayload>
  | EulinxEvent<"permission.granted", PermissionGrantedPayload>
  | EulinxEvent<"permission.denied", PermissionDeniedPayload>
  | EulinxEvent<"permission.revoked", PermissionRevokedPayload>
  | EulinxEvent<"permission.profile_applied", PermissionProfileAppliedPayload>
  // Memory
  | EulinxEvent<"memory.written", MemoryWrittenPayload>
  | EulinxEvent<"memory.summarized", MemorySummarizedPayload>
  | EulinxEvent<"memory.indexed", MemoryIndexedPayload>
  | EulinxEvent<"memory.search_performed", MemorySearchPerformedPayload>
  | EulinxEvent<"memory.evicted", MemoryEvictedPayload>
  // Tool
  | EulinxEvent<"tool.registered", ToolRegisteredPayload>
  | EulinxEvent<"tool.invoked", ToolInvokedPayload>
  | EulinxEvent<"tool.succeeded", ToolSucceededPayload>
  | EulinxEvent<"tool.failed", ToolFailedPayload>
  | EulinxEvent<"tool.timed_out", ToolTimedOutPayload>
  | EulinxEvent<"tool.blocked", ToolBlockedPayload>
  // Process
  | EulinxEvent<"process.started", ProcessStartedPayload>
  | EulinxEvent<"process.output_streamed", ProcessOutputStreamedPayload>
  | EulinxEvent<"process.exited", ProcessExitedPayload>
  | EulinxEvent<"process.killed", ProcessKilledPayload>
  | EulinxEvent<"process.crashed", ProcessCrashedPayload>
  | EulinxEvent<"process.restarted", ProcessRestartedPayload>
  // Plugin
  | EulinxEvent<"plugin.loaded", PluginLoadedPayload>
  | EulinxEvent<"plugin.unloaded", PluginUnloadedPayload>
  | EulinxEvent<"plugin.subscribed", PluginSubscribedPayload>
  | EulinxEvent<"plugin.errored", PluginErroredPayload>
  | EulinxEvent<"plugin.quarantined", PluginQuarantinedPayload>
  // UI
  | EulinxEvent<"ui.view_opened", UiViewOpenedPayload>
  | EulinxEvent<"ui.user_action", UiUserActionPayload>
  | EulinxEvent<"ui.notification_raised", UiNotificationRaisedPayload>
  // EventBus self
  | EulinxEvent<"eventbus.subscriber_dropped_event", EventBusSubscriberDroppedEventPayload>
  | EulinxEvent<"eventbus.subscriber_panicked", EventBusSubscriberPanickedPayload>
  | EulinxEvent<"eventbus.log_write_failed", EventBusLogWriteFailedPayload>
  | EulinxEvent<"eventbus.backpressure_engaged", EventBusBackpressureEngagedPayload>

// ---------------------------------------------------------------------------
// Non-replay-grade event types (EventBus-Part02 §Replay Grade Summary)
// ---------------------------------------------------------------------------

export const NON_REPLAY_GRADE_TYPES: readonly string[] = [
  "worker.output_streamed",
  "process.output_streamed",
  "execution.progress_reported",
  "memory.search_performed",
  "ui.view_opened",
  "ui.user_action",
  "ui.notification_raised",
] as const

export function isReplayGrade(type: string): boolean {
  return !NON_REPLAY_GRADE_TYPES.includes(type)
}

// ---------------------------------------------------------------------------
// Event type families
// ---------------------------------------------------------------------------

export type EventFamily =
  | "runtime"
  | "worker"
  | "execution"
  | "artifact"
  | "merge"
  | "lock"
  | "permission"
  | "memory"
  | "tool"
  | "process"
  | "plugin"
  | "ui"
  | "eventbus"

export function getEventFamily(type: string): EventFamily | undefined {
  const dotIndex = type.indexOf(".")
  if (dotIndex === -1) return undefined
  const family = type.substring(0, dotIndex)
  if (isValidEventFamily(family)) return family
  return undefined
}

function isValidEventFamily(value: string): value is EventFamily {
  return (
    value === "runtime" ||
    value === "worker" ||
    value === "execution" ||
    value === "artifact" ||
    value === "merge" ||
    value === "lock" ||
    value === "permission" ||
    value === "memory" ||
    value === "tool" ||
    value === "process" ||
    value === "plugin" ||
    value === "ui" ||
    value === "eventbus"
  )
}

// Immediate-flush event families for UI batcher (EventBus-Part04 §Batching)
export const IMMEDIATE_FLUSH_FAMILIES: readonly EventFamily[] = [
  "merge",
  "permission",
  "runtime",
] as const

export const IMMEDIATE_FLUSH_TYPES: readonly string[] = [
  "execution.completed",
  "execution.failed",
  "execution.cancelled",
  "worker.failed",
] as const

export function shouldFlushImmediately(type: string): boolean {
  const family = getEventFamily(type)
  if (family && IMMEDIATE_FLUSH_FAMILIES.includes(family)) return true
  if (IMMEDIATE_FLUSH_TYPES.includes(type)) return true
  return false
}
