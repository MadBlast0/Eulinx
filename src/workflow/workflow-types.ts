/**
 * P16-WF — Workflow Engine Types
 *
 * Types for the workflow engine: run object model, graph representation,
 * node and edge definitions, runtime states, triggers, budgets, and
 * execution request/result contracts.
 * From WorkflowEngine-Part01 through Part08, NodeArchitecture-Part01 through Part06,
 * EdgeTypes-Part01 through Part05, ExecutionFlow-Part01 through Part08.
 */

import type {
  Brand,
  WorkspaceId,
  JsonValue,
} from "@/core/types"

// ---------------------------------------------------------------------------
// Branded IDs
// ---------------------------------------------------------------------------

export type WorkflowRunId = Brand<string, "WorkflowRunId">
export type NodeId = Brand<string, "NodeId">
export type EdgeId = Brand<string, "EdgeId">
export type SnapshotId = Brand<string, "SnapshotId">
export type NodeRunId = Brand<string, "NodeRunId">
export type DeterminismSeed = Brand<string, "DeterminismSeed">

// ---------------------------------------------------------------------------
// Node Kind (NodeTypes-Part01 §Built-in Kinds)
// ---------------------------------------------------------------------------

export type NodeKind =
  | "worker"
  | "orchestrator"
  | "tool"
  | "builder"
  | "verifier"
  | "condition"
  | "loop"
  | "merge"
  | "artifact"
  | "memory"
  | "mcp"
  | "input"
  | "output"
  | "delay"
  | "human_approval"

// ---------------------------------------------------------------------------
// Node State (NodeArchitecture-Part03 §Node States)
// ---------------------------------------------------------------------------

export type NodeState =
  | "pending"
  | "ready"
  | "running"
  | "succeeded"
  | "failed"
  | "skipped"
  | "cancelled"

export const NODE_STATE_TERMINAL: readonly NodeState[] = [
  "succeeded",
  "failed",
  "skipped",
  "cancelled",
] as const

export function isNodeTerminal(state: NodeState): boolean {
  return (NODE_STATE_TERMINAL as readonly NodeState[]).includes(state)
}

// ---------------------------------------------------------------------------
// Skip Reason (WorkflowEngine-Part02 §SkipReason)
// ---------------------------------------------------------------------------

export type SkipReason =
  | "branch_not_taken"
  | "upstream_failed"
  | "upstream_skipped"
  | "loop_exited"
  | "run_cancelled"

// ---------------------------------------------------------------------------
// Port Types (NodeArchitecture-Part02 §Type Lattice)
// ---------------------------------------------------------------------------

export type PortValueType =
  | "text"
  | "number"
  | "boolean"
  | "json"
  | "artifact_ref"
  | "worker_handle"
  | "tool_handle"
  | "bytes"
  | "any"

export type PortCardinality = "single" | "many"

// ---------------------------------------------------------------------------
// Port Definition (NodeArchitecture-Part01 §Base Node Contract)
// ---------------------------------------------------------------------------

export interface PortDefinition {
  readonly portId: string
  readonly direction: "in" | "out"
  readonly valueType: PortValueType
  readonly cardinality: PortCardinality
  readonly required: boolean
  readonly defaultValue?: JsonValue
}

// ---------------------------------------------------------------------------
// Port Value Ref (WorkflowEngine-Part02 §outputs)
// ---------------------------------------------------------------------------

export interface PortValueRef {
  readonly storageKey: string
  readonly valueType: PortValueType
  readonly sizeBytes: number
}

// ---------------------------------------------------------------------------
// Retry Policy (NodeArchitecture-Part04 §Retry Policy)
// ---------------------------------------------------------------------------

export type BackoffStrategy = "none" | "fixed" | "exponential"

export interface RetryPolicy {
  readonly maxAttempts: number
  readonly backoff: BackoffStrategy
  readonly delayMs: number
  readonly retryableErrors: readonly string[]
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 1,
  backoff: "none",
  delayMs: 0,
  retryableErrors: [],
}

// ---------------------------------------------------------------------------
// Failure Policy (WorkflowEngine-Part03 §Failure Cascade)
// ---------------------------------------------------------------------------

export type FailurePolicy = "fail_run" | "fail_branch" | "continue"

// ---------------------------------------------------------------------------
// Node Definition (WorkflowEngine-Part02 §Node and Edge Definitions)
// ---------------------------------------------------------------------------

export interface NodeDefinition {
  readonly nodeId: NodeId
  readonly kind: NodeKind
  readonly label: string
  readonly config: unknown
  readonly inputPorts: readonly PortDefinition[]
  readonly outputPorts: readonly PortDefinition[]
  readonly retryPolicy: RetryPolicy
  readonly timeoutMs: number
  readonly layout: { readonly x: number; readonly y: number }
  readonly createdBy: "user" | "orchestrator" | "template" | "plugin"
  readonly pluginId?: string
  readonly failurePolicy?: FailurePolicy
}

// ---------------------------------------------------------------------------
// Edge Kind (EdgeTypes-Part01 §EdgeKind)
// ---------------------------------------------------------------------------

export type EdgeKind =
  | "control"
  | "data"
  | "conditional"
  | "error"
  | "loop_back"
  | "artifact"
  | "memory"
  | "event"

// ---------------------------------------------------------------------------
// Activation Policy (EdgeTypes-Part01 §ActivationPolicy)
// ---------------------------------------------------------------------------

export type ActivationPolicy =
  | { readonly mode: "all" }
  | { readonly mode: "any" }
  | { readonly mode: "count"; readonly n: number }
  | { readonly mode: "quorum"; readonly numerator: number; readonly denominator: number }

// ---------------------------------------------------------------------------
// Edge Guard (EdgeTypes-Part01 §Guards)
// ---------------------------------------------------------------------------

export type GuardOperand =
  | { readonly src: "literal"; readonly value: JsonValue }
  | { readonly src: "source_output"; readonly portId: string; readonly path?: string }
  | { readonly src: "node_status"; readonly nodeId: string }
  | { readonly src: "workflow_input"; readonly key: string }
  | { readonly src: "loop_counter"; readonly loopNodeId: string }

export type GuardExpr =
  | { readonly op: "always" }
  | { readonly op: "never" }
  | { readonly op: "eq"; readonly left: GuardOperand; readonly right: GuardOperand }
  | { readonly op: "neq"; readonly left: GuardOperand; readonly right: GuardOperand }
  | { readonly op: "lt"; readonly left: GuardOperand; readonly right: GuardOperand }
  | { readonly op: "lte"; readonly left: GuardOperand; readonly right: GuardOperand }
  | { readonly op: "gt"; readonly left: GuardOperand; readonly right: GuardOperand }
  | { readonly op: "gte"; readonly left: GuardOperand; readonly right: GuardOperand }
  | { readonly op: "in"; readonly needle: GuardOperand; readonly haystack: GuardOperand }
  | { readonly op: "has_key"; readonly obj: GuardOperand; readonly key: string }
  | { readonly op: "matches"; readonly value: GuardOperand; readonly pattern: string }
  | { readonly op: "and"; readonly terms: readonly GuardExpr[] }
  | { readonly op: "or"; readonly terms: readonly GuardExpr[] }
  | { readonly op: "not"; readonly term: GuardExpr }

export type GuardOnError = "block" | "traverse" | "fail_node"

export interface EdgeGuard {
  readonly guardId: string
  readonly expr: GuardExpr
  readonly onError: GuardOnError
  readonly timeoutMs: number
}

// ---------------------------------------------------------------------------
// Transform Spec (EdgeTypes-Part05 §Transform Kinds)
// ---------------------------------------------------------------------------

export type TransformKind =
  | "json_path"
  | "string_format"
  | "type_coerce"
  | "array_flatten"
  | "array_map"
  | "default_value"
  | "concat"
  | "custom_script"

export interface TransformSpec {
  readonly transformId: string
  readonly kind: TransformKind
  readonly config: unknown
}

// ---------------------------------------------------------------------------
// Edge Origin (EdgeTypes-Part01 §Origin and Trust)
// ---------------------------------------------------------------------------

export interface EdgeOrigin {
  readonly authorKind: "user" | "orchestrator" | "builder_node" | "template" | "system"
  readonly authorId: string
  readonly trusted: boolean
  readonly artifactId?: string
}

// ---------------------------------------------------------------------------
// Edge Validation Record (EdgeTypes-Part01 §Validation)
// ---------------------------------------------------------------------------

export interface EdgeValidationRecord {
  readonly valid: boolean
  readonly checkedAt: string
  readonly errors: readonly string[]
}

// ---------------------------------------------------------------------------
// Edge Definition (WorkflowEngine-Part02 §Node and Edge Definitions)
// ---------------------------------------------------------------------------

export interface EdgeDefinition {
  readonly edgeId: EdgeId
  readonly kind: EdgeKind
  readonly fromNodeId: NodeId
  readonly fromPortId: string
  readonly toNodeId: NodeId
  readonly toPortId: string
  readonly guard?: EdgeGuard
  readonly transform?: TransformSpec
  readonly cardinality: EdgeCardinality
  readonly ordering: number
  readonly required: boolean
  readonly activationPolicy: ActivationPolicy
  readonly origin: EdgeOrigin
  readonly validation: EdgeValidationRecord
  readonly label?: string
  readonly loopBackEdge?: { readonly loopNodeId: NodeId }
}

// ---------------------------------------------------------------------------
// Edge Cardinality (EdgeTypes-Part01 §Cardinality)
// ---------------------------------------------------------------------------

export type EdgeCardinality = "single" | "many"

// ---------------------------------------------------------------------------
// Edge Runtime State (EdgeTypes-Part01 §States)
// ---------------------------------------------------------------------------

export type EdgeRuntimeState =
  | "inactive"
  | "pending"
  | "guard_blocked"
  | "type_rejected"
  | "traversed"
  | "cancelled"

// ---------------------------------------------------------------------------
// Graph Snapshot (WorkflowEngine-Part02 §The Frozen Graph Snapshot)
// ---------------------------------------------------------------------------

export interface GraphSnapshot {
  readonly snapshotId: SnapshotId
  readonly workflowId: string
  readonly workflowVersion: number
  readonly nodes: readonly NodeDefinition[]
  readonly edges: readonly EdgeDefinition[]
  readonly createdAt: string
  readonly contentHash: string
}

// ---------------------------------------------------------------------------
// Run Trigger (WorkflowEngine-Part01 §RunTrigger)
// ---------------------------------------------------------------------------

export type TriggerKind =
  | "user_manual"
  | "orchestrator_plan"
  | "parent_workflow_node"
  | "schedule_cron"
  | "file_watch"
  | "event_subscription"
  | "api_call"
  | "retry_of_run"
  | "replay"

export interface RunTrigger {
  readonly triggerId: string
  readonly kind: TriggerKind
  readonly firedAt: string
  readonly firedBy: string
  readonly payload: Record<string, JsonValue>
  readonly idempotencyKey?: string
}

// ---------------------------------------------------------------------------
// Run Mode (WorkflowEngine-Part01 §RunMode)
// ---------------------------------------------------------------------------

export type RunMode = "normal" | "dry_run" | "replay"

// ---------------------------------------------------------------------------
// Run Budget (ExecutionFlow-Part01 §RunBudget)
// ---------------------------------------------------------------------------

export interface RunBudget {
  readonly maxWallClockMs: number
  readonly maxNodeRuns: number
  readonly maxCostUsd: number
  readonly maxTokens: number
  readonly maxConcurrentNodes: number
  readonly maxDepth: number
}

export interface RunBudgetSpent {
  readonly wallClockMs: number
  readonly nodeRuns: number
  readonly costUsd: number
  readonly tokens: number
}

// ---------------------------------------------------------------------------
// Run Failure (WorkflowEngine-Part01 §RunFailure)
// ---------------------------------------------------------------------------

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
  readonly failedNodeIds: readonly NodeId[]
  readonly message: string
  readonly at: string
}

// ---------------------------------------------------------------------------
// Workflow Run State (WorkflowEngine-Part01 §Run State Machine)
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

export const RUN_STATE_TERMINAL: readonly WorkflowRunState[] = [
  "succeeded",
  "failed",
  "cancelled",
] as const

export function isRunTerminal(state: WorkflowRunState): boolean {
  return (RUN_STATE_TERMINAL as readonly WorkflowRunState[]).includes(state)
}

// ---------------------------------------------------------------------------
// Workflow Run (WorkflowEngine-Part01 §Workflow Run Object Model)
// ---------------------------------------------------------------------------

export interface WorkflowRun {
  readonly runId: WorkflowRunId
  readonly workflowId: string
  readonly workflowVersion: number
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly sessionId: string

  state: WorkflowRunState
  runSeq: number

  readonly trigger: RunTrigger
  readonly mode: RunMode

  readonly graphSnapshotId: SnapshotId
  readonly contextId: string

  readonly startedAt: string
  endedAt?: string
  pausedAt?: string

  nodeCount: number
  completedNodeCount: number
  failedNodeCount: number
  skippedNodeCount: number

  failure?: RunFailure
  restartGeneration: number
  readonly determinismSeed: DeterminismSeed
}

// ---------------------------------------------------------------------------
// Node Runtime State (WorkflowEngine-Part02 §Runtime Node State)
// ---------------------------------------------------------------------------

export interface NodeRuntimeState {
  readonly runId: WorkflowRunId
  readonly nodeId: NodeId
  readonly iterationIndex: number

  state: NodeState
  remainingDeps: number
  attempt: number

  executionId?: string
  startedAt?: string
  endedAt?: string

  outputs?: Record<string, PortValueRef>
  failure?: NodeFailure
  skipReason?: SkipReason
}

// ---------------------------------------------------------------------------
// Node Failure (NodeArchitecture-Part05 §Failure Propagation)
// ---------------------------------------------------------------------------

export interface NodeFailure {
  readonly kind: string
  readonly message: string
  readonly retriable: boolean
  readonly at: string
}

// ---------------------------------------------------------------------------
// Node Run (ExecutionFlow-Part01 §NodeRun)
// ---------------------------------------------------------------------------

export interface NodeRun {
  readonly nodeRunId: NodeRunId
  readonly runId: WorkflowRunId
  readonly nodeId: NodeId
  readonly attempt: number
  readonly state: NodeState
  readonly readyAt?: string
  readonly dispatchedAt?: string
  readonly startedAt?: string
  readonly endedAt?: string
  readonly schedulingUnitId?: string
  readonly executionId?: string
  readonly result?: WorkflowNodeResult
  readonly skipReason?: SkipReason
  readonly failure?: NodeFailure
  readonly branchId: string
  readonly scopeId: string
  readonly notReadyReason?: string
}

// ---------------------------------------------------------------------------
// Node Metrics (WorkflowEngine-Part04 §NodeMetrics)
// ---------------------------------------------------------------------------

export interface NodeMetrics {
  readonly durationMs: number
  readonly tokensUsed: number
  readonly costUsd: number
  readonly toolCalls: number
}

// ---------------------------------------------------------------------------
// Node Result (WorkflowEngine-Part04 §NodeResult)
// ---------------------------------------------------------------------------

export type WorkflowNodeResult =
  | {
      readonly ok: true
      readonly executionId: string
      readonly outputs: Record<string, JsonValue>
      readonly metrics: NodeMetrics
    }
  | {
      readonly ok: false
      readonly executionId: string
      readonly failure: NodeFailure
      readonly metrics: NodeMetrics
    }

// ---------------------------------------------------------------------------
// Execution Request (WorkflowEngine-Part04 §The Execution Request)
// ---------------------------------------------------------------------------

export interface ExecutionRequest {
  readonly executionId: string
  readonly runId: WorkflowRunId
  readonly nodeId: NodeId
  readonly iterationIndex: number
  readonly attempt: number

  readonly kind: NodeKind
  readonly config: unknown
  readonly inputs: Record<string, JsonValue>

  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly sessionId: string
  readonly ownerRef: { readonly kind: "workflow_node"; readonly runId: string; readonly nodeId: string }

  readonly timeoutMs: number
  readonly deterministicSeed: string
  readonly mode: RunMode
}

// ---------------------------------------------------------------------------
// Admission Request/Response (WorkflowEngine-Part04 §The Admission Handshake)
// ---------------------------------------------------------------------------

export type AdmissionReason =
  | "concurrency_limit"
  | "resource_busy"
  | "rate_limited"
  | "budget_pressure"

export type RejectionReason =
  | "budget_exhausted"
  | "resource_unavailable_permanently"
  | "workspace_suspended"

export interface AdmissionCandidate {
  readonly nodeId: NodeId
  readonly iterationIndex: number
  readonly kind: NodeKind
  readonly topoRank: number
  readonly estimatedCost: EstimatedCost
  readonly requiredResources: readonly ResourceClaim[]
}

export interface EstimatedCost {
  readonly expectedDurationMs: number
  readonly expectedTokens: number
  readonly expectedCostUsd: number
  readonly spawnsWorker: boolean
  readonly spawnsProcess: boolean
}

export interface ResourceClaim {
  readonly kind: "worker_slot" | "process_slot" | "provider_rate" | "file_lock" | "mcp_session"
  readonly resourceId: string
  readonly mode: "shared" | "exclusive"
}

export interface AdmissionRequest {
  readonly runId: WorkflowRunId
  readonly workspaceId: WorkspaceId
  readonly projectId: string
  readonly candidates: readonly AdmissionCandidate[]
  readonly runPriority: "low" | "normal" | "high" | "critical"
}

export interface DeferredNode {
  readonly key: string
  readonly reason: AdmissionReason
  readonly retryAfterMs: number
}

export interface RejectedNode {
  readonly key: string
  readonly reason: RejectionReason
  readonly message: string
}

export interface AdmissionResponse {
  readonly admitted: readonly string[]
  readonly deferred: readonly DeferredNode[]
  readonly rejected: readonly RejectedNode[]
}

// ---------------------------------------------------------------------------
// Workflow Engine Error (for Result pattern)
// ---------------------------------------------------------------------------

export type WorkflowError =
  | { readonly kind: "run_not_found"; readonly runId: string }
  | { readonly kind: "snapshot_missing"; readonly snapshotId: string }
  | { readonly kind: "snapshot_corrupt"; readonly snapshotId: string }
  | { readonly kind: "graph_invalid"; readonly nodeIds: readonly string[]; readonly message: string }
  | { readonly kind: "node_state_missing"; readonly nodeId: string }
  | { readonly kind: "node_changed_concurrently"; readonly nodeId: string }
  | { readonly kind: "run_changed_concurrently"; readonly runId: string }
  | { readonly kind: "persistence_failed"; readonly message: string }
  | { readonly kind: "unknown_node_kind"; readonly nodeKind: string }
  | { readonly kind: "port_unsatisfied"; readonly nodeId: string; readonly portId: string }
  | { readonly kind: "output_schema_violation"; readonly nodeId: string; readonly portId: string }
  | { readonly kind: "scheduler_unavailable"; readonly consecutiveFailures: number }
  | { readonly kind: "execution_engine_unavailable"; readonly nodeId: string }
  | { readonly kind: "negative_remaining_deps"; readonly edgeId: string }
  | { readonly kind: "illegal_node_transition"; readonly nodeId: string; readonly from: string; readonly to: string }
  | { readonly kind: "context_write_conflict"; readonly key: string }
  | { readonly kind: "result_for_unknown_execution"; readonly executionId: string }
  | { readonly kind: "result_for_non_running_node"; readonly nodeId: string }

// ---------------------------------------------------------------------------
// Workflow Manager Config
// ---------------------------------------------------------------------------

export interface WorkflowEngineConfig {
  readonly schedulerAdmitTimeoutMs: number
  readonly tickTimerIntervalMs: number
  readonly maxSchedulerFailures: number
  readonly determinismSeedLength: number
  readonly defaultRunBudget: RunBudget
}
