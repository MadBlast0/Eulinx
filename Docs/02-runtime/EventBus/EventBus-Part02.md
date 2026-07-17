---
title: EventBus Specification - Part 02
status: draft
version: 1.0
tags:
  - runtime
  - event-bus
  - events
related:
  - "[[EventBus-Part01]]"
  - "[[EventBus-Part03]]"
  - "[[RuntimeManager-Part01]]"
---

# EventBus Specification (Part 02)

# Purpose of This Part

This part is the complete typed event catalog. It is the contract between every publisher and every subscriber in Eulinx.

If an event is not in this catalog, it does not exist. Implementers MUST NOT invent event types at the call site. Adding an event means adding it here first.

# Naming Rules

Event types MUST follow `<family>.<past_tense_fact>`.

```text
worker.spawned        correct
worker.spawn          wrong - that is a command
worker.spawning       wrong - that is a state, not a fact
worker.will_spawn     wrong - that is a prediction
```

Families are: `runtime`, `worker`, `execution`, `artifact`, `merge`, `lock`, `permission`, `memory`, `tool`, `process`, `plugin`, `ui`, `eventbus`.

# Shared Payload Primitives

Every payload below uses these. Restated here so no implementer has to look elsewhere.

```ts
type WorkerId = string;
type ExecutionId = string;
type ArtifactId = string;
type LockId = string;
type ToolId = string;
type ProcessId = string;
type PluginId = string;
type WorkspaceId = string;
type SessionId = string;

type IsoTimestamp = string;

type DurationMs = number;

type FailureInfo = {
  code: string;
  message: string;
  retryable: boolean;
  serviceName: RuntimeServiceName;
};

type RuntimeServiceName =
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
  | "ProcessLifecycle";
```

# Runtime Events

Published by the RuntimeManager. All are replay-grade.

```ts
type RuntimeStartedPayload = {
  runtimeId: string;
  version: string;
  services: RuntimeServiceName[];
  startupDurationMs: DurationMs;
};

type RuntimeStoppedPayload = {
  runtimeId: string;
  reason: "user_request" | "shutdown_signal" | "fatal_error";
  drainedEvents: number;
};

type RuntimeStateChangedPayload = {
  runtimeId: string;
  from: RuntimeState;
  to: RuntimeState;
  reason: string;
};

type RuntimeServiceHealthChangedPayload = {
  service: RuntimeServiceName;
  from: "healthy" | "degraded" | "failed";
  to: "healthy" | "degraded" | "failed";
  detail: string;
};

type RuntimeWorkspaceBoundPayload = {
  workspaceId: WorkspaceId;
  projectId: string;
  rootPath: string;
};

type RuntimeInvariantViolatedPayload = {
  invariant: string;
  service: RuntimeServiceName;
  detail: string;
  fatal: boolean;
};
```

```text
runtime.started
runtime.stopped
runtime.state_changed
runtime.service_health_changed
runtime.workspace_bound
runtime.invariant_violated
```

# Worker Events

Published by the WorkerSpawner and the ExecutionEngine. All replay-grade except `worker.output_streamed`.

```ts
type WorkerSpawnedPayload = {
  workerId: WorkerId;
  workspaceId: WorkspaceId;
  sessionId: SessionId;
  providerId: string;
  modelId: string;
  processId?: ProcessId;
  permissionProfileId: string;
  contextPackageId: string;
  spawnDurationMs: DurationMs;
};

type WorkerReadyPayload = {
  workerId: WorkerId;
  readyAt: IsoTimestamp;
};

type WorkerStateChangedPayload = {
  workerId: WorkerId;
  from: WorkerState;
  to: WorkerState;
  reason: string;
};

type WorkerOutputStreamedPayload = {
  workerId: WorkerId;
  streamId: string;
  chunk: string;
  channel: "stdout" | "stderr" | "reasoning" | "message";
  chunkIndex: number;
};

type WorkerCompletedPayload = {
  workerId: WorkerId;
  producedArtifactIds: ArtifactId[];
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  durationMs: DurationMs;
};

type WorkerFailedPayload = {
  workerId: WorkerId;
  failure: FailureInfo;
  partialArtifactIds: ArtifactId[];
};

type WorkerCancelledPayload = {
  workerId: WorkerId;
  requestedBy: "user" | "scheduler" | "runtime";
  reason: string;
};

type WorkerTerminatedPayload = {
  workerId: WorkerId;
  processId?: ProcessId;
  exitCode?: number;
  forced: boolean;
};
```

```text
worker.spawned
worker.ready
worker.state_changed
worker.output_streamed        <-- high frequency, NOT replay-grade, throttled
worker.completed
worker.failed
worker.cancelled
worker.terminated
```

`worker.output_streamed` is the single highest-volume event in Eulinx. It MUST be batched and throttled on the UI transport per Part 04. It MUST NOT be written to the replay log as individual rows.

# Execution Events

Published by the Scheduler and the ExecutionEngine. All replay-grade except `execution.progress_reported`.

```ts
type ExecutionStartedPayload = {
  executionId: ExecutionId;
  workspaceId: WorkspaceId;
  workflowId?: string;
  rootTaskId: string;
  plannedNodeCount: number;
};

type ExecutionNodeQueuedPayload = {
  executionId: ExecutionId;
  nodeId: string;
  priority: number;
  dependencies: string[];
};

type ExecutionNodeBlockedPayload = {
  executionId: ExecutionId;
  nodeId: string;
  blockedOn:
    | "dependencies"
    | "permission"
    | "lock"
    | "budget"
    | "approval";
  detail: string;
};

type ExecutionNodeStartedPayload = {
  executionId: ExecutionId;
  nodeId: string;
  workerId?: WorkerId;
  attempt: number;
};

type ExecutionNodeCompletedPayload = {
  executionId: ExecutionId;
  nodeId: string;
  artifactIds: ArtifactId[];
  durationMs: DurationMs;
};

type ExecutionNodeFailedPayload = {
  executionId: ExecutionId;
  nodeId: string;
  attempt: number;
  willRetry: boolean;
  failure: FailureInfo;
};

type ExecutionProgressReportedPayload = {
  executionId: ExecutionId;
  completedNodes: number;
  totalNodes: number;
  percent: number;
};

type ExecutionCompletedPayload = {
  executionId: ExecutionId;
  outcome: "success" | "partial";
  artifactIds: ArtifactId[];
  durationMs: DurationMs;
  totalCostUsd: number;
};

type ExecutionFailedPayload = {
  executionId: ExecutionId;
  failure: FailureInfo;
  failedNodeIds: string[];
};

type ExecutionCancelledPayload = {
  executionId: ExecutionId;
  requestedBy: "user" | "runtime";
  cancelledNodeIds: string[];
};
```

```text
execution.started
execution.node_queued
execution.node_blocked
execution.node_started
execution.node_completed
execution.node_failed
execution.progress_reported   <-- high frequency, NOT replay-grade, coalesced
execution.completed
execution.failed
execution.cancelled
```

# Artifact Events

Published by the ArtifactManager. All replay-grade.

```ts
type ArtifactCreatedPayload = {
  artifactId: ArtifactId;
  workerId?: WorkerId;
  executionId?: ExecutionId;
  kind: "patch" | "file" | "message" | "plan" | "report" | "test_result";
  targetPaths: string[];
  sizeBytes: number;
  contentHash: string;
};

type ArtifactVerifiedPayload = {
  artifactId: ArtifactId;
  checks: string[];
  durationMs: DurationMs;
};

type ArtifactRejectedPayload = {
  artifactId: ArtifactId;
  failedCheck: string;
  reason: string;
};

type ArtifactVersionedPayload = {
  artifactId: ArtifactId;
  previousArtifactId: ArtifactId;
  version: number;
};

type ArtifactIndexedPayload = {
  artifactId: ArtifactId;
  indexName: string;
};

type ArtifactDiscardedPayload = {
  artifactId: ArtifactId;
  reason: "superseded" | "rejected" | "user_discarded" | "expired";
};
```

```text
artifact.created
artifact.verified
artifact.rejected
artifact.versioned
artifact.indexed
artifact.discarded
```

An `artifact.created` event MUST NOT imply the Artifact was applied. Application is a merge event. Confusing these two breaks the most important rule in Eulinx.

# Merge Events

Published by the MergeManager. All replay-grade.

```ts
type MergeRequestedPayload = {
  mergeId: string;
  artifactIds: ArtifactId[];
  targetPaths: string[];
  requiresApproval: boolean;
};

type MergeApprovalRequiredPayload = {
  mergeId: string;
  reason: string;
  targetPaths: string[];
};

type MergeApprovedPayload = {
  mergeId: string;
  approvedBy: "user" | "policy";
  policyId?: string;
};

type MergeRejectedPayload = {
  mergeId: string;
  rejectedBy: "user" | "policy";
  reason: string;
};

type MergeConflictDetectedPayload = {
  mergeId: string;
  path: string;
  conflictKind: "content" | "delete_modify" | "lock_held" | "stale_base";
  detail: string;
};

type MergeAppliedPayload = {
  mergeId: string;
  artifactIds: ArtifactId[];
  changedPaths: string[];
  commitId?: string;
  durationMs: DurationMs;
};

type MergeFailedPayload = {
  mergeId: string;
  failure: FailureInfo;
  rolledBack: boolean;
};

type MergeRolledBackPayload = {
  mergeId: string;
  restoredPaths: string[];
  reason: string;
};
```

```text
merge.requested
merge.approval_required
merge.approved
merge.rejected
merge.conflict_detected
merge.applied
merge.failed
merge.rolled_back
```

`merge.applied` is the only event in Eulinx that means trusted state changed. Treat it as the highest-value event in the log.

# Lock Events

Published by the LockManager. All replay-grade.

```ts
type LockRequestedPayload = {
  lockId: LockId;
  holderId: string;
  holderKind: "worker" | "merge" | "service";
  resource: string;
  lockKind: "file" | "symbol" | "artifact" | "resource" | "terminal";
  mode: "shared" | "exclusive";
};

type LockGrantedPayload = {
  lockId: LockId;
  holderId: string;
  resource: string;
  waitedMs: DurationMs;
};

type LockQueuedPayload = {
  lockId: LockId;
  holderId: string;
  resource: string;
  queuePosition: number;
  currentHolderId: string;
};

type LockReleasedPayload = {
  lockId: LockId;
  holderId: string;
  resource: string;
  heldMs: DurationMs;
};

type LockDeniedPayload = {
  lockId: LockId;
  holderId: string;
  resource: string;
  reason: "timeout" | "policy" | "shutdown";
};

type LockTimedOutPayload = {
  lockId: LockId;
  holderId: string;
  resource: string;
  waitedMs: DurationMs;
};

type LockDeadlockDetectedPayload = {
  cycle: string[];
  victimHolderId: string;
  resources: string[];
};
```

```text
lock.requested
lock.granted
lock.queued
lock.released
lock.denied
lock.timed_out
lock.deadlock_detected
```

# Permission Events

Published by the PermissionManager. All replay-grade. These are the audit trail and MUST NOT be lossy.

```ts
type PermissionRequestedPayload = {
  requestId: string;
  requesterId: string;
  requesterKind: "worker" | "tool" | "plugin" | "service";
  capability: string;
  target: string;
  scope: "session" | "execution" | "once";
};

type PermissionGrantedPayload = {
  requestId: string;
  capability: string;
  target: string;
  grantedBy: "user" | "policy" | "profile";
  policyId?: string;
  expiresAt?: IsoTimestamp;
};

type PermissionDeniedPayload = {
  requestId: string;
  capability: string;
  target: string;
  deniedBy: "user" | "policy" | "default_deny";
  reason: string;
};

type PermissionPromptShownPayload = {
  requestId: string;
  capability: string;
  target: string;
};

type PermissionRevokedPayload = {
  requestId: string;
  capability: string;
  revokedBy: "user" | "policy" | "expiry";
};

type PermissionProfileAppliedPayload = {
  profileId: string;
  subjectId: string;
  capabilities: string[];
};
```

```text
permission.requested
permission.prompt_shown
permission.granted
permission.denied
permission.revoked
permission.profile_applied
```

# Memory Events

Published by the MemoryManager. Replay-grade except `memory.search_performed`.

```ts
type MemoryWrittenPayload = {
  memoryId: string;
  scope: "workspace" | "session" | "worker" | "project";
  kind: "fact" | "summary" | "decision" | "note";
  sizeBytes: number;
  authorId: string;
};

type MemorySummarizedPayload = {
  memoryId: string;
  sourceMemoryIds: string[];
  compressionRatio: number;
};

type MemoryIndexedPayload = {
  memoryId: string;
  vectorDimensions: number;
  indexName: string;
};

type MemorySearchPerformedPayload = {
  queryId: string;
  scope: string;
  resultCount: number;
  durationMs: DurationMs;
};

type MemoryEvictedPayload = {
  memoryId: string;
  reason: "expired" | "budget" | "user_deleted" | "superseded";
};
```

```text
memory.written
memory.summarized
memory.indexed
memory.search_performed       <-- NOT replay-grade
memory.evicted
```

# Tool Events

Published by the ToolRegistry. All replay-grade.

```ts
type ToolRegisteredPayload = {
  toolId: ToolId;
  name: string;
  origin: "internal" | "mcp" | "plugin" | "cli";
  schemaHash: string;
};

type ToolInvokedPayload = {
  invocationId: string;
  toolId: ToolId;
  callerId: string;
  callerKind: "worker" | "orchestrator" | "service";
  argumentsHash: string;
  permissionRequestId?: string;
};

type ToolSucceededPayload = {
  invocationId: string;
  toolId: ToolId;
  resultHash: string;
  producedArtifactIds: ArtifactId[];
  durationMs: DurationMs;
};

type ToolFailedPayload = {
  invocationId: string;
  toolId: ToolId;
  failure: FailureInfo;
};

type ToolTimedOutPayload = {
  invocationId: string;
  toolId: ToolId;
  timeoutMs: DurationMs;
};

type ToolBlockedPayload = {
  invocationId: string;
  toolId: ToolId;
  reason: "permission_denied" | "not_registered" | "schema_invalid" | "runtime_unsafe";
};
```

```text
tool.registered
tool.invoked
tool.succeeded
tool.failed
tool.timed_out
tool.blocked
```

# Process Events

Published by ProcessLifecycle. Replay-grade except `process.output_streamed`.

```ts
type ProcessStartedPayload = {
  processId: ProcessId;
  ownerId: string;
  command: string;
  args: string[];
  cwd: string;
  pty: boolean;
  osPid: number;
};

type ProcessOutputStreamedPayload = {
  processId: ProcessId;
  chunk: string;
  channel: "stdout" | "stderr";
  chunkIndex: number;
};

type ProcessExitedPayload = {
  processId: ProcessId;
  exitCode: number;
  durationMs: DurationMs;
};

type ProcessKilledPayload = {
  processId: ProcessId;
  signal: string;
  requestedBy: "user" | "runtime" | "timeout";
};

type ProcessCrashedPayload = {
  processId: ProcessId;
  signal?: string;
  failure: FailureInfo;
};

type ProcessRestartedPayload = {
  processId: ProcessId;
  previousProcessId: ProcessId;
  attempt: number;
};
```

```text
process.started
process.output_streamed       <-- high frequency, NOT replay-grade, throttled
process.exited
process.killed
process.crashed
process.restarted
```

# Plugin Events

Published by the plugin host. All replay-grade. These describe plugins from the outside; they are how the Runtime reports on untrusted code.

```ts
type PluginLoadedPayload = {
  pluginId: PluginId;
  name: string;
  version: string;
  subscribedTopics: string[];
  grantedCapabilities: string[];
};

type PluginUnloadedPayload = {
  pluginId: PluginId;
  reason: "user_request" | "shutdown" | "error";
};

type PluginSubscribedPayload = {
  pluginId: PluginId;
  subscriptionId: string;
  topicPattern: string;
};

type PluginErroredPayload = {
  pluginId: PluginId;
  failure: FailureInfo;
  subscriptionId?: string;
};

type PluginQuarantinedPayload = {
  pluginId: PluginId;
  reason: "slow_subscriber" | "repeated_panic" | "capability_violation";
  droppedEvents: number;
  detail: string;
};
```

```text
plugin.loaded
plugin.unloaded
plugin.subscribed
plugin.errored
plugin.quarantined
```

# UI Events

Published by the RuntimeManager on behalf of the UI layer. Not replay-grade - the UI is an observer, and its view state is not runtime truth.

```ts
type UiViewOpenedPayload = {
  viewId: string;
  viewKind: "workspace" | "worker" | "execution" | "diff" | "logs" | "settings";
  subjectId?: string;
};

type UiUserActionPayload = {
  actionId: string;
  action: "approve_merge" | "reject_merge" | "cancel_execution" | "grant_permission" | "deny_permission";
  subjectId: string;
};

type UiNotificationRaisedPayload = {
  notificationId: string;
  severity: "info" | "warning" | "error";
  message: string;
  subjectId?: string;
};
```

```text
ui.view_opened
ui.user_action                <-- mirrors a user decision; the authoritative record is the permission or merge event
ui.notification_raised
```

`ui.user_action` is a mirror for display and telemetry only. The authoritative record of an approval is `merge.approved` or `permission.granted`, published by the owning service. Never reconstruct a decision from a `ui.*` event during Replay.

# EventBus Self Events

Published by the EventBus about itself. Replay-grade.

```ts
type EventBusSubscriberDroppedEventPayload = {
  subscriptionId: string;
  subscriberKind: "core" | "plugin" | "ui";
  droppedEventType: string;
  droppedCount: number;
  reason: "queue_full" | "slow_subscriber" | "quarantined";
};

type EventBusSubscriberPanickedPayload = {
  subscriptionId: string;
  subscriberKind: "core" | "plugin" | "ui";
  eventType: string;
  detail: string;
};

type EventBusLogWriteFailedPayload = {
  eventType: string;
  sequence: number;
  failure: FailureInfo;
};

type EventBusBackpressureEngagedPayload = {
  queue: "core" | "plugin";
  depth: number;
  capacity: number;
};
```

```text
eventbus.subscriber_dropped_event
eventbus.subscriber_panicked
eventbus.log_write_failed
eventbus.backpressure_engaged
```

# The Complete Event Union

Implementers MUST define this union exactly. It is the type the bus carries.

```ts
type EulinxEventUnion =
  | EulinxEvent<"runtime.started", RuntimeStartedPayload>
  | EulinxEvent<"runtime.stopped", RuntimeStoppedPayload>
  | EulinxEvent<"runtime.state_changed", RuntimeStateChangedPayload>
  | EulinxEvent<"runtime.service_health_changed", RuntimeServiceHealthChangedPayload>
  | EulinxEvent<"runtime.workspace_bound", RuntimeWorkspaceBoundPayload>
  | EulinxEvent<"runtime.invariant_violated", RuntimeInvariantViolatedPayload>
  | EulinxEvent<"worker.spawned", WorkerSpawnedPayload>
  | EulinxEvent<"worker.ready", WorkerReadyPayload>
  | EulinxEvent<"worker.state_changed", WorkerStateChangedPayload>
  | EulinxEvent<"worker.output_streamed", WorkerOutputStreamedPayload>
  | EulinxEvent<"worker.completed", WorkerCompletedPayload>
  | EulinxEvent<"worker.failed", WorkerFailedPayload>
  | EulinxEvent<"worker.cancelled", WorkerCancelledPayload>
  | EulinxEvent<"worker.terminated", WorkerTerminatedPayload>
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
  | EulinxEvent<"artifact.created", ArtifactCreatedPayload>
  | EulinxEvent<"artifact.verified", ArtifactVerifiedPayload>
  | EulinxEvent<"artifact.rejected", ArtifactRejectedPayload>
  | EulinxEvent<"artifact.versioned", ArtifactVersionedPayload>
  | EulinxEvent<"artifact.indexed", ArtifactIndexedPayload>
  | EulinxEvent<"artifact.discarded", ArtifactDiscardedPayload>
  | EulinxEvent<"merge.requested", MergeRequestedPayload>
  | EulinxEvent<"merge.approval_required", MergeApprovalRequiredPayload>
  | EulinxEvent<"merge.approved", MergeApprovedPayload>
  | EulinxEvent<"merge.rejected", MergeRejectedPayload>
  | EulinxEvent<"merge.conflict_detected", MergeConflictDetectedPayload>
  | EulinxEvent<"merge.applied", MergeAppliedPayload>
  | EulinxEvent<"merge.failed", MergeFailedPayload>
  | EulinxEvent<"merge.rolled_back", MergeRolledBackPayload>
  | EulinxEvent<"lock.requested", LockRequestedPayload>
  | EulinxEvent<"lock.granted", LockGrantedPayload>
  | EulinxEvent<"lock.queued", LockQueuedPayload>
  | EulinxEvent<"lock.released", LockReleasedPayload>
  | EulinxEvent<"lock.denied", LockDeniedPayload>
  | EulinxEvent<"lock.timed_out", LockTimedOutPayload>
  | EulinxEvent<"lock.deadlock_detected", LockDeadlockDetectedPayload>
  | EulinxEvent<"permission.requested", PermissionRequestedPayload>
  | EulinxEvent<"permission.prompt_shown", PermissionPromptShownPayload>
  | EulinxEvent<"permission.granted", PermissionGrantedPayload>
  | EulinxEvent<"permission.denied", PermissionDeniedPayload>
  | EulinxEvent<"permission.revoked", PermissionRevokedPayload>
  | EulinxEvent<"permission.profile_applied", PermissionProfileAppliedPayload>
  | EulinxEvent<"memory.written", MemoryWrittenPayload>
  | EulinxEvent<"memory.summarized", MemorySummarizedPayload>
  | EulinxEvent<"memory.indexed", MemoryIndexedPayload>
  | EulinxEvent<"memory.search_performed", MemorySearchPerformedPayload>
  | EulinxEvent<"memory.evicted", MemoryEvictedPayload>
  | EulinxEvent<"tool.registered", ToolRegisteredPayload>
  | EulinxEvent<"tool.invoked", ToolInvokedPayload>
  | EulinxEvent<"tool.succeeded", ToolSucceededPayload>
  | EulinxEvent<"tool.failed", ToolFailedPayload>
  | EulinxEvent<"tool.timed_out", ToolTimedOutPayload>
  | EulinxEvent<"tool.blocked", ToolBlockedPayload>
  | EulinxEvent<"process.started", ProcessStartedPayload>
  | EulinxEvent<"process.output_streamed", ProcessOutputStreamedPayload>
  | EulinxEvent<"process.exited", ProcessExitedPayload>
  | EulinxEvent<"process.killed", ProcessKilledPayload>
  | EulinxEvent<"process.crashed", ProcessCrashedPayload>
  | EulinxEvent<"process.restarted", ProcessRestartedPayload>
  | EulinxEvent<"plugin.loaded", PluginLoadedPayload>
  | EulinxEvent<"plugin.unloaded", PluginUnloadedPayload>
  | EulinxEvent<"plugin.subscribed", PluginSubscribedPayload>
  | EulinxEvent<"plugin.errored", PluginErroredPayload>
  | EulinxEvent<"plugin.quarantined", PluginQuarantinedPayload>
  | EulinxEvent<"ui.view_opened", UiViewOpenedPayload>
  | EulinxEvent<"ui.user_action", UiUserActionPayload>
  | EulinxEvent<"ui.notification_raised", UiNotificationRaisedPayload>
  | EulinxEvent<"eventbus.subscriber_dropped_event", EventBusSubscriberDroppedEventPayload>
  | EulinxEvent<"eventbus.subscriber_panicked", EventBusSubscriberPanickedPayload>
  | EulinxEvent<"eventbus.log_write_failed", EventBusLogWriteFailedPayload>
  | EulinxEvent<"eventbus.backpressure_engaged", EventBusBackpressureEngagedPayload>;
```

# Replay Grade Summary

These event types are NOT replay-grade. Every other type in the catalog IS.

```text
worker.output_streamed
process.output_streamed
execution.progress_reported
memory.search_performed
ui.view_opened
ui.user_action
ui.notification_raised
```

Non-replay-grade events MAY be dropped under backpressure. Replay-grade events MUST NOT be dropped, ever, for any subscriber class, for any reason. If a replay-grade event cannot be logged, publication fails loudly.

# AI Notes

Do not add a `data: any` escape hatch to `EulinxEvent`. The catalog is the contract. An untyped payload field means every subscriber starts guessing, and Replay starts guessing with it.

Do not merge `artifact.created` and `merge.applied` into one "change happened" event. They are different facts with different trust levels. One is AI output. The other is trusted state.

Do not emit `worker.output_streamed` per character. Emit per chunk, and let Part 04's batcher coalesce chunks for the UI.

Do not make `ui.user_action` authoritative. It is a mirror. The owning service publishes the real decision.

# Related Documents

- [[EventBus-Part01]]
- [[EventBus-Part03]]
- [[EventBus-Part04]]
- [[EventBus-Part05]]
- [[EventBus-Diagrams]]
