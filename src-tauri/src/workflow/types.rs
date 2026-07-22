use std::collections::HashMap;

use std::fmt;

use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

// ---------------------------------------------------------------------------
// Type aliases
// ---------------------------------------------------------------------------

pub type WorkflowRunId = String;
pub type NodeId = String;
pub type EdgeId = String;
pub type SnapshotId = String;
pub type NodeRunId = String;
pub type DeterminismSeed = String;

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeKind {
    Worker,
    Orchestrator,
    Tool,
    Builder,
    Verifier,
    Condition,
    Loop,
    Merge,
    Artifact,
    Memory,
    Mcp,
    Input,
    Output,
    Delay,
    HumanApproval,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum NodeState {
    Pending,
    Ready,
    Running,
    Succeeded,
    Failed,
    Skipped,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SkipReason {
    BranchNotTaken,
    UpstreamFailed,
    UpstreamSkipped,
    LoopExited,
    RunCancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PortValueType {
    Text,
    Number,
    Boolean,
    Json,
    ArtifactRef,
    WorkerHandle,
    ToolHandle,
    Bytes,
    Any,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PortCardinality {
    Single,
    Many,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BackoffStrategy {
    None,
    Fixed,
    Exponential,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FailurePolicy {
    FailRun,
    FailBranch,
    Continue,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EdgeKind {
    Control,
    Data,
    Conditional,
    Error,
    LoopBack,
    Artifact,
    Memory,
    Event,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "mode", rename_all = "snake_case")]
pub enum ActivationPolicy {
    All,
    Any,
    Count { n: u32 },
    Quorum { numerator: u32, denominator: u32 },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EdgeRuntimeState {
    Inactive,
    Pending,
    GuardBlocked,
    TypeRejected,
    Traversed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum EdgeCardinality {
    Single,
    Many,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TriggerKind {
    UserManual,
    OrchestratorPlan,
    ParentWorkflowNode,
    ScheduleCron,
    FileWatch,
    EventSubscription,
    ApiCall,
    RetryOfRun,
    Replay,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RunMode {
    Normal,
    DryRun,
    Replay,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RunFailureKind {
    GraphInvalid,
    NodeFailedFatal,
    UnknownNodeKind,
    PortUnsatisfied,
    ContextWriteConflict,
    IterationLimitExceeded,
    SchedulerUnavailable,
    ExecutionEngineUnavailable,
    PersistenceFailed,
    RecoveryImpossible,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum WorkflowRunState {
    Created,
    Validating,
    Running,
    Pausing,
    Paused,
    Cancelling,
    Cancelled,
    Succeeded,
    Failed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GuardOnError {
    Block,
    Traverse,
    FailNode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TransformKind {
    JsonPath,
    StringFormat,
    TypeCoerce,
    ArrayFlatten,
    ArrayMap,
    DefaultValue,
    Concat,
    CustomScript,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "src", rename_all = "snake_case")]
pub enum GuardOperand {
    Literal { value: JsonValue },
    SourceOutput { port_id: String, path: Option<String> },
    NodeStatus { node_id: String },
    WorkflowInput { key: String },
    LoopCounter { loop_node_id: String },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "op", rename_all = "snake_case")]
pub enum GuardExpr {
    Always,
    Never,
    Eq { left: GuardOperand, right: GuardOperand },
    Neq { left: GuardOperand, right: GuardOperand },
    Lt { left: GuardOperand, right: GuardOperand },
    Lte { left: GuardOperand, right: GuardOperand },
    Gt { left: GuardOperand, right: GuardOperand },
    Gte { left: GuardOperand, right: GuardOperand },
    #[serde(rename = "in")]
    In { needle: GuardOperand, haystack: GuardOperand },
    HasKey { obj: GuardOperand, key: String },
    Matches { value: GuardOperand, pattern: String },
    And { terms: Vec<GuardExpr> },
    Or { terms: Vec<GuardExpr> },
    Not { term: Box<GuardExpr> },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "ok")]
pub enum WorkflowNodeResult {
    #[serde(rename = "true")]
    Success {
        #[serde(rename = "executionId")]
        execution_id: String,
        outputs: HashMap<String, JsonValue>,
        metrics: NodeMetrics,
    },
    #[serde(rename = "false")]
    Failure {
        #[serde(rename = "executionId")]
        execution_id: String,
        failure: NodeFailure,
        metrics: NodeMetrics,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum WorkflowError {
    RunNotFound { run_id: String },
    SnapshotMissing { snapshot_id: String },
    SnapshotCorrupt { snapshot_id: String },
    GraphInvalid { node_ids: Vec<String>, message: String },
    NodeStateMissing { node_id: String },
    NodeChangedConcurrently { node_id: String },
    RunChangedConcurrently { run_id: String },
    PersistenceFailed { message: String },
    UnknownNodeKind { node_kind: String },
    PortUnsatisfied { node_id: String, port_id: String },
    OutputSchemaViolation { node_id: String, port_id: String },
    SchedulerUnavailable { consecutive_failures: u32 },
    ExecutionEngineUnavailable { node_id: String },
    NegativeRemainingDeps { edge_id: String },
    IllegalNodeTransition { node_id: String, from: String, to: String },
    ContextWriteConflict { key: String },
    ResultForUnknownExecution { execution_id: String },
    ResultForNonRunningNode { node_id: String },
    InternalError { message: String },
}

impl fmt::Display for WorkflowError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

// ---------------------------------------------------------------------------
// Structs
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct PortDefinition {
    #[serde(rename = "portId")]
    pub port_id: String,
    pub direction: String,
    #[serde(rename = "valueType")]
    pub value_type: PortValueType,
    pub cardinality: PortCardinality,
    pub required: bool,
    #[serde(rename = "defaultValue")]
    pub default_value: Option<JsonValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct PortValueRef {
    #[serde(rename = "storageKey")]
    pub storage_key: String,
    #[serde(rename = "valueType")]
    pub value_type: PortValueType,
    #[serde(rename = "sizeBytes")]
    pub size_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RetryPolicy {
    #[serde(rename = "maxAttempts")]
    pub max_attempts: u32,
    pub backoff: BackoffStrategy,
    #[serde(rename = "delayMs")]
    pub delay_ms: u64,
    #[serde(rename = "retryableErrors")]
    pub retryable_errors: Vec<String>,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_attempts: 1,
            backoff: BackoffStrategy::None,
            delay_ms: 0,
            retryable_errors: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct EdgeGuard {
    #[serde(rename = "guardId")]
    pub guard_id: String,
    pub expr: GuardExpr,
    #[serde(rename = "onError")]
    pub on_error: GuardOnError,
    #[serde(rename = "timeoutMs")]
    pub timeout_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TransformSpec {
    #[serde(rename = "transformId")]
    pub transform_id: String,
    pub kind: TransformKind,
    pub config: JsonValue,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct EdgeOrigin {
    #[serde(rename = "authorKind")]
    pub author_kind: String,
    #[serde(rename = "authorId")]
    pub author_id: String,
    pub trusted: bool,
    #[serde(rename = "artifactId")]
    pub artifact_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct EdgeValidationRecord {
    pub valid: bool,
    #[serde(rename = "checkedAt")]
    pub checked_at: String,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NodeLayout {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NodeDefinition {
    #[serde(rename = "nodeId")]
    pub node_id: NodeId,
    pub kind: NodeKind,
    pub label: String,
    pub config: JsonValue,
    #[serde(rename = "inputPorts")]
    pub input_ports: Vec<PortDefinition>,
    #[serde(rename = "outputPorts")]
    pub output_ports: Vec<PortDefinition>,
    #[serde(rename = "retryPolicy")]
    pub retry_policy: RetryPolicy,
    #[serde(rename = "timeoutMs")]
    pub timeout_ms: u64,
    pub layout: NodeLayout,
    #[serde(rename = "createdBy")]
    pub created_by: String,
    #[serde(rename = "pluginId")]
    pub plugin_id: Option<String>,
    #[serde(rename = "failurePolicy")]
    pub failure_policy: Option<FailurePolicy>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct LoopBackEdge {
    #[serde(rename = "loopNodeId")]
    pub loop_node_id: NodeId,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct EdgeDefinition {
    #[serde(rename = "edgeId")]
    pub edge_id: EdgeId,
    pub kind: EdgeKind,
    #[serde(rename = "fromNodeId")]
    pub from_node_id: NodeId,
    #[serde(rename = "fromPortId")]
    pub from_port_id: String,
    #[serde(rename = "toNodeId")]
    pub to_node_id: NodeId,
    #[serde(rename = "toPortId")]
    pub to_port_id: String,
    pub guard: Option<EdgeGuard>,
    pub transform: Option<TransformSpec>,
    pub cardinality: EdgeCardinality,
    pub ordering: u32,
    pub required: bool,
    #[serde(rename = "activationPolicy")]
    pub activation_policy: ActivationPolicy,
    pub origin: EdgeOrigin,
    pub validation: EdgeValidationRecord,
    pub label: Option<String>,
    #[serde(rename = "loopBackEdge")]
    pub loop_back_edge: Option<LoopBackEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct GraphSnapshot {
    #[serde(rename = "snapshotId")]
    pub snapshot_id: SnapshotId,
    #[serde(rename = "workflowId")]
    pub workflow_id: String,
    #[serde(rename = "workflowVersion")]
    pub workflow_version: u32,
    pub nodes: Vec<NodeDefinition>,
    pub edges: Vec<EdgeDefinition>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "contentHash")]
    pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RunTrigger {
    #[serde(rename = "triggerId")]
    pub trigger_id: String,
    pub kind: TriggerKind,
    #[serde(rename = "firedAt")]
    pub fired_at: String,
    #[serde(rename = "firedBy")]
    pub fired_by: String,
    pub payload: HashMap<String, JsonValue>,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RunBudget {
    #[serde(rename = "maxWallClockMs")]
    pub max_wall_clock_ms: u64,
    #[serde(rename = "maxNodeRuns")]
    pub max_node_runs: u32,
    #[serde(rename = "maxCostUsd")]
    pub max_cost_usd: f64,
    #[serde(rename = "maxTokens")]
    pub max_tokens: u64,
    #[serde(rename = "maxConcurrentNodes")]
    pub max_concurrent_nodes: u32,
    #[serde(rename = "maxDepth")]
    pub max_depth: u32,
}

impl Default for RunBudget {
    fn default() -> Self {
        DEFAULT_RUN_BUDGET
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RunBudgetSpent {
    #[serde(rename = "wallClockMs")]
    pub wall_clock_ms: u64,
    #[serde(rename = "nodeRuns")]
    pub node_runs: u32,
    #[serde(rename = "costUsd")]
    pub cost_usd: f64,
    pub tokens: u64,
}

impl Default for RunBudgetSpent {
    fn default() -> Self {
        Self {
            wall_clock_ms: 0,
            node_runs: 0,
            cost_usd: 0.0,
            tokens: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RunFailure {
    pub kind: RunFailureKind,
    #[serde(rename = "failedNodeIds")]
    pub failed_node_ids: Vec<NodeId>,
    pub message: String,
    pub at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WorkflowRun {
    #[serde(rename = "runId")]
    pub run_id: WorkflowRunId,
    #[serde(rename = "workflowId")]
    pub workflow_id: String,
    #[serde(rename = "workflowVersion")]
    pub workflow_version: u32,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    pub state: WorkflowRunState,
    #[serde(rename = "runSeq")]
    pub run_seq: u32,
    pub trigger: RunTrigger,
    pub mode: RunMode,
    #[serde(rename = "graphSnapshotId")]
    pub graph_snapshot_id: SnapshotId,
    #[serde(rename = "contextId")]
    pub context_id: String,
    #[serde(rename = "startedAt")]
    pub started_at: String,
    #[serde(rename = "endedAt")]
    pub ended_at: Option<String>,
    #[serde(rename = "pausedAt")]
    pub paused_at: Option<String>,
    #[serde(rename = "nodeCount")]
    pub node_count: u32,
    #[serde(rename = "completedNodeCount")]
    pub completed_node_count: u32,
    #[serde(rename = "failedNodeCount")]
    pub failed_node_count: u32,
    #[serde(rename = "skippedNodeCount")]
    pub skipped_node_count: u32,
    pub failure: Option<RunFailure>,
    #[serde(rename = "restartGeneration")]
    pub restart_generation: u32,
    #[serde(rename = "determinismSeed")]
    pub determinism_seed: DeterminismSeed,
    #[serde(rename = "budgetSpent")]
    pub budget_spent: RunBudgetSpent,
    #[serde(rename = "nodeRuns")]
    pub node_runs: Vec<NodeRun>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NodeRuntimeState {
    #[serde(rename = "runId")]
    pub run_id: WorkflowRunId,
    #[serde(rename = "nodeId")]
    pub node_id: NodeId,
    #[serde(rename = "iterationIndex")]
    pub iteration_index: u32,
    pub state: NodeState,
    #[serde(rename = "remainingDeps")]
    pub remaining_deps: u32,
    pub attempt: u32,
    #[serde(rename = "executionId")]
    pub execution_id: Option<String>,
    #[serde(rename = "startedAt")]
    pub started_at: Option<String>,
    #[serde(rename = "endedAt")]
    pub ended_at: Option<String>,
    pub outputs: Option<HashMap<String, PortValueRef>>,
    pub failure: Option<NodeFailure>,
    #[serde(rename = "skipReason")]
    pub skip_reason: Option<SkipReason>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NodeFailure {
    pub kind: String,
    pub message: String,
    pub retriable: bool,
    pub at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NodeRun {
    #[serde(rename = "nodeRunId")]
    pub node_run_id: NodeRunId,
    #[serde(rename = "runId")]
    pub run_id: WorkflowRunId,
    #[serde(rename = "nodeId")]
    pub node_id: NodeId,
    pub attempt: u32,
    pub state: NodeState,
    #[serde(rename = "readyAt")]
    pub ready_at: Option<String>,
    #[serde(rename = "dispatchedAt")]
    pub dispatched_at: Option<String>,
    #[serde(rename = "startedAt")]
    pub started_at: Option<String>,
    #[serde(rename = "endedAt")]
    pub ended_at: Option<String>,
    #[serde(rename = "schedulingUnitId")]
    pub scheduling_unit_id: Option<String>,
    #[serde(rename = "executionId")]
    pub execution_id: Option<String>,
    pub result: Option<WorkflowNodeResult>,
    #[serde(rename = "skipReason")]
    pub skip_reason: Option<SkipReason>,
    pub failure: Option<NodeFailure>,
    #[serde(rename = "branchId")]
    pub branch_id: String,
    #[serde(rename = "scopeId")]
    pub scope_id: String,
    #[serde(rename = "notReadyReason")]
    pub not_ready_reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NodeMetrics {
    #[serde(rename = "durationMs")]
    pub duration_ms: u64,
    #[serde(rename = "tokensUsed")]
    pub tokens_used: u64,
    #[serde(rename = "costUsd")]
    pub cost_usd: f64,
    #[serde(rename = "toolCalls")]
    pub tool_calls: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct OwnerRef {
    pub kind: String,
    #[serde(rename = "runId")]
    pub run_id: String,
    #[serde(rename = "nodeId")]
    pub node_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ExecutionRequest {
    #[serde(rename = "executionId")]
    pub execution_id: String,
    #[serde(rename = "runId")]
    pub run_id: WorkflowRunId,
    #[serde(rename = "nodeId")]
    pub node_id: NodeId,
    #[serde(rename = "iterationIndex")]
    pub iteration_index: u32,
    pub attempt: u32,
    pub kind: NodeKind,
    pub config: JsonValue,
    pub inputs: HashMap<String, JsonValue>,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    #[serde(rename = "sessionId")]
    pub session_id: String,
    #[serde(rename = "ownerRef")]
    pub owner_ref: OwnerRef,
    #[serde(rename = "timeoutMs")]
    pub timeout_ms: u64,
    #[serde(rename = "deterministicSeed")]
    pub deterministic_seed: String,
    pub mode: RunMode,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct EstimatedCost {
    #[serde(rename = "expectedDurationMs")]
    pub expected_duration_ms: u64,
    #[serde(rename = "expectedTokens")]
    pub expected_tokens: u64,
    #[serde(rename = "expectedCostUsd")]
    pub expected_cost_usd: f64,
    #[serde(rename = "spawnsWorker")]
    pub spawns_worker: bool,
    #[serde(rename = "spawnsProcess")]
    pub spawns_process: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ResourceClaim {
    pub kind: String,
    #[serde(rename = "resourceId")]
    pub resource_id: String,
    pub mode: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct AdmissionCandidate {
    #[serde(rename = "nodeId")]
    pub node_id: NodeId,
    #[serde(rename = "iterationIndex")]
    pub iteration_index: u32,
    pub kind: NodeKind,
    #[serde(rename = "topoRank")]
    pub topo_rank: u32,
    #[serde(rename = "estimatedCost")]
    pub estimated_cost: EstimatedCost,
    #[serde(rename = "requiredResources")]
    pub required_resources: Vec<ResourceClaim>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct AdmissionRequest {
    #[serde(rename = "runId")]
    pub run_id: WorkflowRunId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    #[serde(rename = "projectId")]
    pub project_id: String,
    pub candidates: Vec<AdmissionCandidate>,
    #[serde(rename = "runPriority")]
    pub run_priority: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DeferredNode {
    pub key: String,
    pub reason: String,
    #[serde(rename = "retryAfterMs")]
    pub retry_after_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RejectedNode {
    pub key: String,
    pub reason: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct AdmissionResponse {
    pub admitted: Vec<String>,
    pub deferred: Vec<DeferredNode>,
    pub rejected: Vec<RejectedNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WorkflowEngineConfig {
    #[serde(rename = "schedulerAdmitTimeoutMs")]
    pub scheduler_admit_timeout_ms: u64,
    #[serde(rename = "tickTimerIntervalMs")]
    pub tick_timer_interval_ms: u64,
    #[serde(rename = "maxSchedulerFailures")]
    pub max_scheduler_failures: u32,
    #[serde(rename = "determinismSeedLength")]
    pub determinism_seed_length: u32,
    #[serde(rename = "defaultRunBudget")]
    pub default_run_budget: RunBudget,
}

impl Default for WorkflowEngineConfig {
    fn default() -> Self {
        DEFAULT_ENGINE_CONFIG
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

pub const NODE_STATE_TERMINAL: &[NodeState] = &[
    NodeState::Succeeded,
    NodeState::Failed,
    NodeState::Skipped,
    NodeState::Cancelled,
];

pub const RUN_STATE_TERMINAL: &[WorkflowRunState] = &[
    WorkflowRunState::Succeeded,
    WorkflowRunState::Failed,
    WorkflowRunState::Cancelled,
];

pub fn is_node_terminal(state: &NodeState) -> bool {
    NODE_STATE_TERMINAL.contains(state)
}

pub fn is_run_terminal(state: &WorkflowRunState) -> bool {
    RUN_STATE_TERMINAL.contains(state)
}

pub const DEFAULT_RETRY_POLICY: RetryPolicy = RetryPolicy {
    max_attempts: 1,
    backoff: BackoffStrategy::None,
    delay_ms: 0,
    retryable_errors: Vec::new(),
};

pub const DEFAULT_RUN_BUDGET: RunBudget = RunBudget {
    max_wall_clock_ms: 86400000,
    max_node_runs: 10000,
    max_cost_usd: 100.0,
    max_tokens: 10_000_000,
    max_concurrent_nodes: 16,
    max_depth: 50,
};

pub const DEFAULT_ENGINE_CONFIG: WorkflowEngineConfig = WorkflowEngineConfig {
    scheduler_admit_timeout_ms: 5000,
    tick_timer_interval_ms: 100,
    max_scheduler_failures: 3,
    determinism_seed_length: 32,
    default_run_budget: RunBudget {
        max_wall_clock_ms: 86400000,
        max_node_runs: 10000,
        max_cost_usd: 100.0,
        max_tokens: 10_000_000,
        max_concurrent_nodes: 16,
        max_depth: 50,
    },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_port_def() -> PortDefinition {
        PortDefinition {
            port_id: "in-1".into(),
            direction: "in".into(),
            value_type: PortValueType::Text,
            cardinality: PortCardinality::Single,
            required: true,
            default_value: None,
        }
    }

    fn sample_retry_policy() -> RetryPolicy {
        RetryPolicy {
            max_attempts: 3,
            backoff: BackoffStrategy::Exponential,
            delay_ms: 1000,
            retryable_errors: vec!["timeout".into(), "ratelimit".into()],
        }
    }

    fn sample_estimated_cost() -> EstimatedCost {
        EstimatedCost {
            expected_duration_ms: 5000,
            expected_tokens: 1000,
            expected_cost_usd: 0.01,
            spawns_worker: false,
            spawns_process: false,
        }
    }

    fn sample_resource_claim() -> ResourceClaim {
        ResourceClaim {
            kind: "memory".into(),
            resource_id: "mem-pool-1".into(),
            mode: "shared".into(),
        }
    }

    fn sample_guard_operand() -> GuardOperand {
        GuardOperand::Literal {
            value: JsonValue::String("hello".into()),
        }
    }

    fn sample_guard_expr() -> GuardExpr {
        GuardExpr::Eq {
            left: sample_guard_operand(),
            right: GuardOperand::Literal {
                value: JsonValue::String("hello".into()),
            },
        }
    }

    // -----------------------------------------------------------------------
    // Enum serialization tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_node_kind_serialization() {
        let kinds = [
            (NodeKind::Worker, "\"worker\""),
            (NodeKind::Orchestrator, "\"orchestrator\""),
            (NodeKind::Tool, "\"tool\""),
            (NodeKind::Builder, "\"builder\""),
            (NodeKind::Verifier, "\"verifier\""),
            (NodeKind::Condition, "\"condition\""),
            (NodeKind::Loop, "\"loop\""),
            (NodeKind::Merge, "\"merge\""),
            (NodeKind::Artifact, "\"artifact\""),
            (NodeKind::Memory, "\"memory\""),
            (NodeKind::Mcp, "\"mcp\""),
            (NodeKind::Input, "\"input\""),
            (NodeKind::Output, "\"output\""),
            (NodeKind::Delay, "\"delay\""),
            (NodeKind::HumanApproval, "\"human_approval\""),
        ];
        for (variant, expected) in &kinds {
            let json = serde_json::to_string(variant).unwrap();
            assert_eq!(json, *expected);
            let deserialized: NodeKind = serde_json::from_str(&json).unwrap();
            assert_eq!(*variant, deserialized);
        }
    }

    #[test]
    fn test_node_state_serialization() {
        let states = [
            (NodeState::Pending, "\"pending\""),
            (NodeState::Ready, "\"ready\""),
            (NodeState::Running, "\"running\""),
            (NodeState::Succeeded, "\"succeeded\""),
            (NodeState::Failed, "\"failed\""),
            (NodeState::Skipped, "\"skipped\""),
            (NodeState::Cancelled, "\"cancelled\""),
        ];
        for (state, expected) in &states {
            let json = serde_json::to_string(state).unwrap();
            assert_eq!(json, *expected);
            let deserialized: NodeState = serde_json::from_str(&json).unwrap();
            assert_eq!(*state, deserialized);
        }
    }

    #[test]
    fn test_skip_reason_serialization() {
        let reasons = [
            (SkipReason::BranchNotTaken, "\"branch_not_taken\""),
            (SkipReason::UpstreamFailed, "\"upstream_failed\""),
            (SkipReason::UpstreamSkipped, "\"upstream_skipped\""),
            (SkipReason::LoopExited, "\"loop_exited\""),
            (SkipReason::RunCancelled, "\"run_cancelled\""),
        ];
        for (reason, expected) in &reasons {
            let json = serde_json::to_string(reason).unwrap();
            assert_eq!(json, *expected);
            let deserialized: SkipReason = serde_json::from_str(&json).unwrap();
            assert_eq!(*reason, deserialized);
        }
    }

    #[test]
    fn test_port_value_type_serialization() {
        let types = [
            (PortValueType::Text, "\"text\""),
            (PortValueType::Number, "\"number\""),
            (PortValueType::Boolean, "\"boolean\""),
            (PortValueType::Json, "\"json\""),
            (PortValueType::ArtifactRef, "\"artifact_ref\""),
            (PortValueType::WorkerHandle, "\"worker_handle\""),
            (PortValueType::ToolHandle, "\"tool_handle\""),
            (PortValueType::Bytes, "\"bytes\""),
            (PortValueType::Any, "\"any\""),
        ];
        for (typ, expected) in &types {
            let json = serde_json::to_string(typ).unwrap();
            assert_eq!(json, *expected);
            let deserialized: PortValueType = serde_json::from_str(&json).unwrap();
            assert_eq!(*typ, deserialized);
        }
    }

    #[test]
    fn test_port_cardinality_serialization() {
        let vals = [
            (PortCardinality::Single, "\"single\""),
            (PortCardinality::Many, "\"many\""),
        ];
        for (v, expected) in &vals {
            let json = serde_json::to_string(v).unwrap();
            assert_eq!(json, *expected);
            let deserialized: PortCardinality = serde_json::from_str(&json).unwrap();
            assert_eq!(*v, deserialized);
        }
    }

    #[test]
    fn test_backoff_strategy_serialization() {
        let vals = [
            (BackoffStrategy::None, "\"none\""),
            (BackoffStrategy::Fixed, "\"fixed\""),
            (BackoffStrategy::Exponential, "\"exponential\""),
        ];
        for (v, expected) in &vals {
            let json = serde_json::to_string(v).unwrap();
            assert_eq!(json, *expected);
            let deserialized: BackoffStrategy = serde_json::from_str(&json).unwrap();
            assert_eq!(*v, deserialized);
        }
    }

    #[test]
    fn test_failure_policy_serialization() {
        let vals = [
            (FailurePolicy::FailRun, "\"fail_run\""),
            (FailurePolicy::FailBranch, "\"fail_branch\""),
            (FailurePolicy::Continue, "\"continue\""),
        ];
        for (v, expected) in &vals {
            let json = serde_json::to_string(v).unwrap();
            assert_eq!(json, *expected);
            let deserialized: FailurePolicy = serde_json::from_str(&json).unwrap();
            assert_eq!(*v, deserialized);
        }
    }

    #[test]
    fn test_edge_kind_serialization() {
        let kinds = [
            (EdgeKind::Control, "\"control\""),
            (EdgeKind::Data, "\"data\""),
            (EdgeKind::Conditional, "\"conditional\""),
            (EdgeKind::Error, "\"error\""),
            (EdgeKind::LoopBack, "\"loop_back\""),
            (EdgeKind::Artifact, "\"artifact\""),
            (EdgeKind::Memory, "\"memory\""),
            (EdgeKind::Event, "\"event\""),
        ];
        for (kind, expected) in &kinds {
            let json = serde_json::to_string(kind).unwrap();
            assert_eq!(json, *expected);
            let deserialized: EdgeKind = serde_json::from_str(&json).unwrap();
            assert_eq!(*kind, deserialized);
        }
    }

    #[test]
    fn test_activation_policy_serialization() {
        // All
        let json = serde_json::to_string(&ActivationPolicy::All).unwrap();
        assert_eq!(json, "{\"mode\":\"all\"}");
        let deserialized: ActivationPolicy = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, ActivationPolicy::All);

        // Any
        let json = serde_json::to_string(&ActivationPolicy::Any).unwrap();
        assert_eq!(json, "{\"mode\":\"any\"}");
        let deserialized: ActivationPolicy = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, ActivationPolicy::Any);

        // Count
        let count = ActivationPolicy::Count { n: 3 };
        let json = serde_json::to_string(&count).unwrap();
        assert_eq!(json, "{\"mode\":\"count\",\"n\":3}");
        let deserialized: ActivationPolicy = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, count);

        // Quorum
        let quorum = ActivationPolicy::Quorum {
            numerator: 2,
            denominator: 3,
        };
        let json = serde_json::to_string(&quorum).unwrap();
        assert_eq!(json, "{\"mode\":\"quorum\",\"numerator\":2,\"denominator\":3}");
        let deserialized: ActivationPolicy = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, quorum);
    }

    #[test]
    fn test_edge_runtime_state_serialization() {
        let states = [
            (EdgeRuntimeState::Inactive, "\"inactive\""),
            (EdgeRuntimeState::Pending, "\"pending\""),
            (EdgeRuntimeState::GuardBlocked, "\"guard_blocked\""),
            (EdgeRuntimeState::TypeRejected, "\"type_rejected\""),
            (EdgeRuntimeState::Traversed, "\"traversed\""),
            (EdgeRuntimeState::Cancelled, "\"cancelled\""),
        ];
        for (state, expected) in &states {
            let json = serde_json::to_string(state).unwrap();
            assert_eq!(json, *expected);
            let deserialized: EdgeRuntimeState = serde_json::from_str(&json).unwrap();
            assert_eq!(*state, deserialized);
        }
    }

    #[test]
    fn test_edge_cardinality_serialization() {
        let vals = [
            (EdgeCardinality::Single, "\"single\""),
            (EdgeCardinality::Many, "\"many\""),
        ];
        for (v, expected) in &vals {
            let json = serde_json::to_string(v).unwrap();
            assert_eq!(json, *expected);
            let deserialized: EdgeCardinality = serde_json::from_str(&json).unwrap();
            assert_eq!(*v, deserialized);
        }
    }

    #[test]
    fn test_trigger_kind_serialization() {
        let kinds = [
            (TriggerKind::UserManual, "\"user_manual\""),
            (TriggerKind::OrchestratorPlan, "\"orchestrator_plan\""),
            (TriggerKind::ParentWorkflowNode, "\"parent_workflow_node\""),
            (TriggerKind::ScheduleCron, "\"schedule_cron\""),
            (TriggerKind::FileWatch, "\"file_watch\""),
            (TriggerKind::EventSubscription, "\"event_subscription\""),
            (TriggerKind::ApiCall, "\"api_call\""),
            (TriggerKind::RetryOfRun, "\"retry_of_run\""),
            (TriggerKind::Replay, "\"replay\""),
        ];
        for (kind, expected) in &kinds {
            let json = serde_json::to_string(kind).unwrap();
            assert_eq!(json, *expected);
            let deserialized: TriggerKind = serde_json::from_str(&json).unwrap();
            assert_eq!(*kind, deserialized);
        }
    }

    #[test]
    fn test_run_mode_serialization() {
        let modes = [
            (RunMode::Normal, "\"normal\""),
            (RunMode::DryRun, "\"dry_run\""),
            (RunMode::Replay, "\"replay\""),
        ];
        for (mode, expected) in &modes {
            let json = serde_json::to_string(mode).unwrap();
            assert_eq!(json, *expected);
            let deserialized: RunMode = serde_json::from_str(&json).unwrap();
            assert_eq!(*mode, deserialized);
        }
    }

    #[test]
    fn test_run_failure_kind_serialization() {
        let kinds = [
            (RunFailureKind::GraphInvalid, "\"graph_invalid\""),
            (RunFailureKind::NodeFailedFatal, "\"node_failed_fatal\""),
            (RunFailureKind::UnknownNodeKind, "\"unknown_node_kind\""),
            (RunFailureKind::PortUnsatisfied, "\"port_unsatisfied\""),
            (
                RunFailureKind::ContextWriteConflict,
                "\"context_write_conflict\"",
            ),
            (
                RunFailureKind::IterationLimitExceeded,
                "\"iteration_limit_exceeded\"",
            ),
            (
                RunFailureKind::SchedulerUnavailable,
                "\"scheduler_unavailable\"",
            ),
            (
                RunFailureKind::ExecutionEngineUnavailable,
                "\"execution_engine_unavailable\"",
            ),
            (
                RunFailureKind::PersistenceFailed,
                "\"persistence_failed\"",
            ),
            (
                RunFailureKind::RecoveryImpossible,
                "\"recovery_impossible\"",
            ),
        ];
        for (kind, expected) in &kinds {
            let json = serde_json::to_string(kind).unwrap();
            assert_eq!(json, *expected);
            let deserialized: RunFailureKind = serde_json::from_str(&json).unwrap();
            assert_eq!(*kind, deserialized);
        }
    }

    #[test]
    fn test_workflow_run_state_serialization() {
        let states = [
            (WorkflowRunState::Created, "\"created\""),
            (WorkflowRunState::Validating, "\"validating\""),
            (WorkflowRunState::Running, "\"running\""),
            (WorkflowRunState::Pausing, "\"pausing\""),
            (WorkflowRunState::Paused, "\"paused\""),
            (WorkflowRunState::Cancelling, "\"cancelling\""),
            (WorkflowRunState::Cancelled, "\"cancelled\""),
            (WorkflowRunState::Succeeded, "\"succeeded\""),
            (WorkflowRunState::Failed, "\"failed\""),
        ];
        for (state, expected) in &states {
            let json = serde_json::to_string(state).unwrap();
            assert_eq!(json, *expected);
            let deserialized: WorkflowRunState = serde_json::from_str(&json).unwrap();
            assert_eq!(*state, deserialized);
        }
    }

    #[test]
    fn test_guard_on_error_serialization() {
        let vals = [
            (GuardOnError::Block, "\"block\""),
            (GuardOnError::Traverse, "\"traverse\""),
            (GuardOnError::FailNode, "\"fail_node\""),
        ];
        for (v, expected) in &vals {
            let json = serde_json::to_string(v).unwrap();
            assert_eq!(json, *expected);
            let deserialized: GuardOnError = serde_json::from_str(&json).unwrap();
            assert_eq!(*v, deserialized);
        }
    }

    #[test]
    fn test_transform_kind_serialization() {
        let kinds = [
            (TransformKind::JsonPath, "\"json_path\""),
            (TransformKind::StringFormat, "\"string_format\""),
            (TransformKind::TypeCoerce, "\"type_coerce\""),
            (TransformKind::ArrayFlatten, "\"array_flatten\""),
            (TransformKind::ArrayMap, "\"array_map\""),
            (TransformKind::DefaultValue, "\"default_value\""),
            (TransformKind::Concat, "\"concat\""),
            (TransformKind::CustomScript, "\"custom_script\""),
        ];
        for (kind, expected) in &kinds {
            let json = serde_json::to_string(kind).unwrap();
            assert_eq!(json, *expected);
            let deserialized: TransformKind = serde_json::from_str(&json).unwrap();
            assert_eq!(*kind, deserialized);
        }
    }

    #[test]
    fn test_guard_operand_serialization() {
        let literal = GuardOperand::Literal {
            value: JsonValue::Number(42.into()),
        };
        let json = serde_json::to_string(&literal).unwrap();
        assert_eq!(json, "{\"src\":\"literal\",\"value\":42}");
        let deserialized: GuardOperand = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, literal);

        let source = GuardOperand::SourceOutput {
            port_id: "out-1".into(),
            path: Some("$.data".into()),
        };
        let json = serde_json::to_string(&source).unwrap();
        assert_eq!(
            json,
            "{\"src\":\"source_output\",\"port_id\":\"out-1\",\"path\":\"$.data\"}"
        );
        let deserialized: GuardOperand = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, source);

        let node_st = GuardOperand::NodeStatus {
            node_id: "n-1".into(),
        };
        let json = serde_json::to_string(&node_st).unwrap();
        assert_eq!(json, "{\"src\":\"node_status\",\"node_id\":\"n-1\"}");
        let deserialized: GuardOperand = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, node_st);

        let wi = GuardOperand::WorkflowInput {
            key: "user_msg".into(),
        };
        let json = serde_json::to_string(&wi).unwrap();
        assert_eq!(json, "{\"src\":\"workflow_input\",\"key\":\"user_msg\"}");
        let deserialized: GuardOperand = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, wi);

        let lc = GuardOperand::LoopCounter {
            loop_node_id: "loop-1".into(),
        };
        let json = serde_json::to_string(&lc).unwrap();
        assert_eq!(
            json,
            "{\"src\":\"loop_counter\",\"loop_node_id\":\"loop-1\"}"
        );
        let deserialized: GuardOperand = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, lc);
    }

    #[test]
    fn test_guard_expr_serialization() {
        let always = GuardExpr::Always;
        let json = serde_json::to_string(&always).unwrap();
        assert_eq!(json, "{\"op\":\"always\"}");

        let eq = GuardExpr::Eq {
            left: GuardOperand::Literal {
                value: JsonValue::String("a".into()),
            },
            right: GuardOperand::Literal {
                value: JsonValue::String("b".into()),
            },
        };
        let json = serde_json::to_string(&eq).unwrap();
        assert!(json.contains("\"op\":\"eq\""));

        let and_expr = GuardExpr::And {
            terms: vec![
                GuardExpr::Always,
                GuardExpr::Never,
            ],
        };
        let json = serde_json::to_string(&and_expr).unwrap();
        assert!(json.contains("\"op\":\"and\""));

        let not_expr = GuardExpr::Not {
            term: Box::new(GuardExpr::Never),
        };
        let json = serde_json::to_string(&not_expr).unwrap();
        assert!(json.contains("\"op\":\"not\""));
    }

    #[test]
    fn test_workflow_node_result_serialization() {
        let success = WorkflowNodeResult::Success {
            execution_id: "exec-1".into(),
            outputs: HashMap::new(),
            metrics: NodeMetrics {
                duration_ms: 100,
                tokens_used: 500,
                cost_usd: 0.005,
                tool_calls: 2,
            },
        };
        let json = serde_json::to_string(&success).unwrap();
        assert_eq!(
            serde_json::from_str::<WorkflowNodeResult>(&json).unwrap(),
            success
        );

        let failure = WorkflowNodeResult::Failure {
            execution_id: "exec-2".into(),
            failure: NodeFailure {
                kind: "timeout".into(),
                message: "exceeded time".into(),
                retriable: true,
                at: "2024-01-01T00:00:00Z".into(),
            },
            metrics: NodeMetrics {
                duration_ms: 60000,
                tokens_used: 100,
                cost_usd: 0.001,
                tool_calls: 0,
            },
        };
        let json = serde_json::to_string(&failure).unwrap();
        assert_eq!(
            serde_json::from_str::<WorkflowNodeResult>(&json).unwrap(),
            failure
        );
    }

    #[test]
    fn test_workflow_error_serialization() {
        let err = WorkflowError::RunNotFound {
            run_id: "run-1".into(),
        };
        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(
            json,
            "{\"kind\":\"run_not_found\",\"run_id\":\"run-1\"}"
        );
        let deserialized: WorkflowError = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, err);

        let err2 = WorkflowError::GraphInvalid {
            node_ids: vec!["n1".into()],
            message: "cycle detected".into(),
        };
        let json2 = serde_json::to_string(&err2).unwrap();
        let deserialized2: WorkflowError = serde_json::from_str(&json2).unwrap();
        assert_eq!(deserialized2, err2);
    }

    // -----------------------------------------------------------------------
    // Struct roundtrip tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_port_definition_roundtrip() {
        let port = PortDefinition {
            port_id: "in-1".into(),
            direction: "in".into(),
            value_type: PortValueType::Number,
            cardinality: PortCardinality::Single,
            required: false,
            default_value: Some(JsonValue::Number(42.into())),
        };
        let json = serde_json::to_string(&port).unwrap();
        let deserialized: PortDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(port, deserialized);
    }

    #[test]
    fn test_port_value_ref_roundtrip() {
        let val = PortValueRef {
            storage_key: "sk-1".into(),
            value_type: PortValueType::Json,
            size_bytes: 1024,
        };
        let json = serde_json::to_string(&val).unwrap();
        let deserialized: PortValueRef = serde_json::from_str(&json).unwrap();
        assert_eq!(val, deserialized);
    }

    #[test]
    fn test_retry_policy_roundtrip() {
        let policy = sample_retry_policy();
        let json = serde_json::to_string(&policy).unwrap();
        let deserialized: RetryPolicy = serde_json::from_str(&json).unwrap();
        assert_eq!(policy, deserialized);
    }

    #[test]
    fn test_edge_guard_roundtrip() {
        let guard = EdgeGuard {
            guard_id: "g-1".into(),
            expr: sample_guard_expr(),
            on_error: GuardOnError::Block,
            timeout_ms: 5000,
        };
        let json = serde_json::to_string(&guard).unwrap();
        let deserialized: EdgeGuard = serde_json::from_str(&json).unwrap();
        assert_eq!(guard, deserialized);
    }

    #[test]
    fn test_transform_spec_roundtrip() {
        let spec = TransformSpec {
            transform_id: "t-1".into(),
            kind: TransformKind::JsonPath,
            config: serde_json::json!({"path": "$.data.name"}),
        };
        let json = serde_json::to_string(&spec).unwrap();
        let deserialized: TransformSpec = serde_json::from_str(&json).unwrap();
        assert_eq!(spec, deserialized);
    }

    #[test]
    fn test_edge_origin_roundtrip() {
        let origin = EdgeOrigin {
            author_kind: "user".into(),
            author_id: "user-1".into(),
            trusted: true,
            artifact_id: Some("art-1".into()),
        };
        let json = serde_json::to_string(&origin).unwrap();
        let deserialized: EdgeOrigin = serde_json::from_str(&json).unwrap();
        assert_eq!(origin, deserialized);
    }

    #[test]
    fn test_edge_validation_record_roundtrip() {
        let record = EdgeValidationRecord {
            valid: true,
            checked_at: "2024-01-01T00:00:00Z".into(),
            errors: vec![],
        };
        let json = serde_json::to_string(&record).unwrap();
        let deserialized: EdgeValidationRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(record, deserialized);
    }

    #[test]
    fn test_node_layout_roundtrip() {
        let layout = NodeLayout { x: 100.0, y: 200.0 };
        let json = serde_json::to_string(&layout).unwrap();
        let deserialized: NodeLayout = serde_json::from_str(&json).unwrap();
        assert_eq!(layout, deserialized);
    }

    #[test]
    fn test_node_definition_roundtrip() {
        let node = NodeDefinition {
            node_id: "n-1".into(),
            kind: NodeKind::Worker,
            label: "My Worker".into(),
            config: serde_json::json!({"model": "gpt-4"}),
            input_ports: vec![sample_port_def()],
            output_ports: vec![],
            retry_policy: sample_retry_policy(),
            timeout_ms: 30000,
            layout: NodeLayout { x: 0.0, y: 0.0 },
            created_by: "user-1".into(),
            plugin_id: None,
            failure_policy: Some(FailurePolicy::FailRun),
        };
        let json = serde_json::to_string(&node).unwrap();
        let deserialized: NodeDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(node, deserialized);
    }

    #[test]
    fn test_loop_back_edge_roundtrip() {
        let lbe = LoopBackEdge {
            loop_node_id: "loop-1".into(),
        };
        let json = serde_json::to_string(&lbe).unwrap();
        let deserialized: LoopBackEdge = serde_json::from_str(&json).unwrap();
        assert_eq!(lbe, deserialized);
    }

    #[test]
    fn test_edge_definition_roundtrip() {
        let edge = EdgeDefinition {
            edge_id: "e-1".into(),
            kind: EdgeKind::Data,
            from_node_id: "n-1".into(),
            from_port_id: "out-1".into(),
            to_node_id: "n-2".into(),
            to_port_id: "in-1".into(),
            guard: None,
            transform: None,
            cardinality: EdgeCardinality::Single,
            ordering: 1,
            required: true,
            activation_policy: ActivationPolicy::All,
            origin: EdgeOrigin {
                author_kind: "user".into(),
                author_id: "user-1".into(),
                trusted: true,
                artifact_id: None,
            },
            validation: EdgeValidationRecord {
                valid: true,
                checked_at: "2024-01-01T00:00:00Z".into(),
                errors: vec![],
            },
            label: Some("my edge".into()),
            loop_back_edge: None,
        };
        let json = serde_json::to_string(&edge).unwrap();
        let deserialized: EdgeDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(edge, deserialized);
    }

    #[test]
    fn test_graph_snapshot_roundtrip() {
        let snap = GraphSnapshot {
            snapshot_id: "ss-1".into(),
            workflow_id: "wf-1".into(),
            workflow_version: 1,
            nodes: vec![],
            edges: vec![],
            created_at: "2024-01-01T00:00:00Z".into(),
            content_hash: "abc123".into(),
        };
        let json = serde_json::to_string(&snap).unwrap();
        let deserialized: GraphSnapshot = serde_json::from_str(&json).unwrap();
        assert_eq!(snap, deserialized);
    }

    #[test]
    fn test_run_trigger_roundtrip() {
        let trigger = RunTrigger {
            trigger_id: "trig-1".into(),
            kind: TriggerKind::UserManual,
            fired_at: "2024-01-01T00:00:00Z".into(),
            fired_by: "user-1".into(),
            payload: HashMap::new(),
            idempotency_key: None,
        };
        let json = serde_json::to_string(&trigger).unwrap();
        let deserialized: RunTrigger = serde_json::from_str(&json).unwrap();
        assert_eq!(trigger, deserialized);
    }

    #[test]
    fn test_run_budget_roundtrip() {
        let budget = RunBudget {
            max_wall_clock_ms: 60000,
            max_node_runs: 100,
            max_cost_usd: 10.0,
            max_tokens: 100000,
            max_concurrent_nodes: 4,
            max_depth: 10,
        };
        let json = serde_json::to_string(&budget).unwrap();
        let deserialized: RunBudget = serde_json::from_str(&json).unwrap();
        assert_eq!(budget, deserialized);
    }

    #[test]
    fn test_run_budget_spent_roundtrip() {
        let spent = RunBudgetSpent {
            wall_clock_ms: 5000,
            node_runs: 10,
            cost_usd: 0.05,
            tokens: 5000,
        };
        let json = serde_json::to_string(&spent).unwrap();
        let deserialized: RunBudgetSpent = serde_json::from_str(&json).unwrap();
        assert_eq!(spent, deserialized);
    }

    #[test]
    fn test_run_failure_roundtrip() {
        let failure = RunFailure {
            kind: RunFailureKind::GraphInvalid,
            failed_node_ids: vec!["n-1".into()],
            message: "cycle detected".into(),
            at: "2024-01-01T00:00:00Z".into(),
        };
        let json = serde_json::to_string(&failure).unwrap();
        let deserialized: RunFailure = serde_json::from_str(&json).unwrap();
        assert_eq!(failure, deserialized);
    }

    #[test]
    fn test_workflow_run_roundtrip() {
        let run = WorkflowRun {
            run_id: "run-1".into(),
            workflow_id: "wf-1".into(),
            workflow_version: 1,
            workspace_id: "ws-1".into(),
            project_id: "proj-1".into(),
            session_id: "sess-1".into(),
            state: WorkflowRunState::Created,
            run_seq: 1,
            trigger: RunTrigger {
                trigger_id: "trig-1".into(),
                kind: TriggerKind::UserManual,
                fired_at: "2024-01-01T00:00:00Z".into(),
                fired_by: "user-1".into(),
                payload: HashMap::new(),
                idempotency_key: None,
            },
            mode: RunMode::Normal,
            graph_snapshot_id: "ss-1".into(),
            context_id: "ctx-1".into(),
            started_at: "2024-01-01T00:00:00Z".into(),
            ended_at: None,
            paused_at: None,
            node_count: 5,
            completed_node_count: 0,
            failed_node_count: 0,
            skipped_node_count: 0,
            failure: None,
            restart_generation: 0,
            determinism_seed: "seed-1".into(),
            budget_spent: RunBudgetSpent::default(),
            node_runs: Vec::new(),
        };
        let json = serde_json::to_string(&run).unwrap();
        let deserialized: WorkflowRun = serde_json::from_str(&json).unwrap();
        assert_eq!(run, deserialized);
    }

    #[test]
    fn test_node_runtime_state_roundtrip() {
        let state = NodeRuntimeState {
            run_id: "run-1".into(),
            node_id: "n-1".into(),
            iteration_index: 0,
            state: NodeState::Running,
            remaining_deps: 2,
            attempt: 1,
            execution_id: Some("exec-1".into()),
            started_at: Some("2024-01-01T00:00:00Z".into()),
            ended_at: None,
            outputs: None,
            failure: None,
            skip_reason: None,
        };
        let json = serde_json::to_string(&state).unwrap();
        let deserialized: NodeRuntimeState = serde_json::from_str(&json).unwrap();
        assert_eq!(state, deserialized);
    }

    #[test]
    fn test_node_failure_roundtrip() {
        let failure = NodeFailure {
            kind: "timeout".into(),
            message: "timed out".into(),
            retriable: true,
            at: "2024-01-01T00:00:00Z".into(),
        };
        let json = serde_json::to_string(&failure).unwrap();
        let deserialized: NodeFailure = serde_json::from_str(&json).unwrap();
        assert_eq!(failure, deserialized);
    }

    #[test]
    fn test_node_run_roundtrip() {
        let node_run = NodeRun {
            node_run_id: "nr-1".into(),
            run_id: "run-1".into(),
            node_id: "n-1".into(),
            attempt: 1,
            state: NodeState::Running,
            ready_at: None,
            dispatched_at: None,
            started_at: None,
            ended_at: None,
            scheduling_unit_id: None,
            execution_id: None,
            result: None,
            skip_reason: None,
            failure: None,
            branch_id: "main".into(),
            scope_id: "scope-1".into(),
            not_ready_reason: None,
        };
        let json = serde_json::to_string(&node_run).unwrap();
        let deserialized: NodeRun = serde_json::from_str(&json).unwrap();
        assert_eq!(node_run, deserialized);
    }

    #[test]
    fn test_execution_request_roundtrip() {
        let req = ExecutionRequest {
            execution_id: "exec-1".into(),
            run_id: "run-1".into(),
            node_id: "n-1".into(),
            iteration_index: 0,
            attempt: 1,
            kind: NodeKind::Tool,
            config: serde_json::json!({}),
            inputs: HashMap::new(),
            workspace_id: "ws-1".into(),
            project_id: "proj-1".into(),
            session_id: "sess-1".into(),
            owner_ref: OwnerRef {
                kind: "workflow".into(),
                run_id: "run-1".into(),
                node_id: "n-1".into(),
            },
            timeout_ms: 30000,
            deterministic_seed: "seed-1".into(),
            mode: RunMode::Normal,
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: ExecutionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req, deserialized);
    }

    #[test]
    fn test_admission_candidate_roundtrip() {
        let candidate = AdmissionCandidate {
            node_id: "n-1".into(),
            iteration_index: 0,
            kind: NodeKind::Worker,
            topo_rank: 1,
            estimated_cost: sample_estimated_cost(),
            required_resources: vec![sample_resource_claim()],
        };
        let json = serde_json::to_string(&candidate).unwrap();
        let deserialized: AdmissionCandidate = serde_json::from_str(&json).unwrap();
        assert_eq!(candidate, deserialized);
    }

    #[test]
    fn test_admission_request_roundtrip() {
        let req = AdmissionRequest {
            run_id: "run-1".into(),
            workspace_id: "ws-1".into(),
            project_id: "proj-1".into(),
            candidates: vec![],
            run_priority: "normal".into(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let deserialized: AdmissionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req, deserialized);
    }

    #[test]
    fn test_deferred_node_roundtrip() {
        let d = DeferredNode {
            key: "n-1".into(),
            reason: "budget_exhausted".into(),
            retry_after_ms: 5000,
        };
        let json = serde_json::to_string(&d).unwrap();
        let deserialized: DeferredNode = serde_json::from_str(&json).unwrap();
        assert_eq!(d, deserialized);
    }

    #[test]
    fn test_rejected_node_roundtrip() {
        let r = RejectedNode {
            key: "n-1".into(),
            reason: "invalid_kind".into(),
            message: "cannot run".into(),
        };
        let json = serde_json::to_string(&r).unwrap();
        let deserialized: RejectedNode = serde_json::from_str(&json).unwrap();
        assert_eq!(r, deserialized);
    }

    #[test]
    fn test_admission_response_roundtrip() {
        let resp = AdmissionResponse {
            admitted: vec!["n-1".into()],
            deferred: vec![DeferredNode {
                key: "n-2".into(),
                reason: "budget_exhausted".into(),
                retry_after_ms: 5000,
            }],
            rejected: vec![],
        };
        let json = serde_json::to_string(&resp).unwrap();
        let deserialized: AdmissionResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(resp, deserialized);
    }

    #[test]
    fn test_workflow_engine_config_roundtrip() {
        let config = WorkflowEngineConfig {
            scheduler_admit_timeout_ms: 5000,
            tick_timer_interval_ms: 100,
            max_scheduler_failures: 3,
            determinism_seed_length: 32,
            default_run_budget: DEFAULT_RUN_BUDGET.clone(),
        };
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: WorkflowEngineConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config, deserialized);
    }

    // -----------------------------------------------------------------------
    // Constant tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_default_retry_policy_values() {
        assert_eq!(DEFAULT_RETRY_POLICY.max_attempts, 1);
        assert_eq!(DEFAULT_RETRY_POLICY.backoff, BackoffStrategy::None);
        assert_eq!(DEFAULT_RETRY_POLICY.delay_ms, 0);
        assert!(DEFAULT_RETRY_POLICY.retryable_errors.is_empty());
    }

    #[test]
    fn test_default_run_budget_values() {
        assert_eq!(DEFAULT_RUN_BUDGET.max_wall_clock_ms, 86400000);
        assert_eq!(DEFAULT_RUN_BUDGET.max_node_runs, 10000);
        assert_eq!(DEFAULT_RUN_BUDGET.max_cost_usd, 100.0);
        assert_eq!(DEFAULT_RUN_BUDGET.max_tokens, 10_000_000);
        assert_eq!(DEFAULT_RUN_BUDGET.max_concurrent_nodes, 16);
        assert_eq!(DEFAULT_RUN_BUDGET.max_depth, 50);
    }

    #[test]
    fn test_default_engine_config_values() {
        assert_eq!(DEFAULT_ENGINE_CONFIG.scheduler_admit_timeout_ms, 5000);
        assert_eq!(DEFAULT_ENGINE_CONFIG.tick_timer_interval_ms, 100);
        assert_eq!(DEFAULT_ENGINE_CONFIG.max_scheduler_failures, 3);
        assert_eq!(DEFAULT_ENGINE_CONFIG.determinism_seed_length, 32);
    }

    #[test]
    fn test_terminal_state_constants() {
        assert!(NODE_STATE_TERMINAL.contains(&NodeState::Succeeded));
        assert!(NODE_STATE_TERMINAL.contains(&NodeState::Failed));
        assert!(NODE_STATE_TERMINAL.contains(&NodeState::Skipped));
        assert!(NODE_STATE_TERMINAL.contains(&NodeState::Cancelled));

        assert!(RUN_STATE_TERMINAL.contains(&WorkflowRunState::Succeeded));
        assert!(RUN_STATE_TERMINAL.contains(&WorkflowRunState::Failed));
        assert!(RUN_STATE_TERMINAL.contains(&WorkflowRunState::Cancelled));
    }

    // -----------------------------------------------------------------------
    // Terminal state function tests
    // -----------------------------------------------------------------------

    #[test]
    fn test_is_node_terminal() {
        assert!(is_node_terminal(&NodeState::Succeeded));
        assert!(is_node_terminal(&NodeState::Failed));
        assert!(is_node_terminal(&NodeState::Skipped));
        assert!(is_node_terminal(&NodeState::Cancelled));
        assert!(!is_node_terminal(&NodeState::Pending));
        assert!(!is_node_terminal(&NodeState::Ready));
        assert!(!is_node_terminal(&NodeState::Running));
    }

    #[test]
    fn test_is_run_terminal() {
        assert!(is_run_terminal(&WorkflowRunState::Succeeded));
        assert!(is_run_terminal(&WorkflowRunState::Failed));
        assert!(is_run_terminal(&WorkflowRunState::Cancelled));
        assert!(!is_run_terminal(&WorkflowRunState::Created));
        assert!(!is_run_terminal(&WorkflowRunState::Validating));
        assert!(!is_run_terminal(&WorkflowRunState::Running));
        assert!(!is_run_terminal(&WorkflowRunState::Pausing));
        assert!(!is_run_terminal(&WorkflowRunState::Paused));
        assert!(!is_run_terminal(&WorkflowRunState::Cancelling));
    }

    // -----------------------------------------------------------------------
    // Default trait test
    // -----------------------------------------------------------------------

    #[test]
    fn test_retry_policy_default_impl() {
        let policy = RetryPolicy::default();
        assert_eq!(policy, DEFAULT_RETRY_POLICY);
    }

    // -----------------------------------------------------------------------
    // Deny unknown fields test
    // -----------------------------------------------------------------------

    #[test]
    fn test_deny_unknown_fields() {
        let json = r#"{"portId":"p-1","direction":"in","valueType":"text","cardinality":"single","required":true,"unknownField":"bad"}"#;
        let result: Result<PortDefinition, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    // -----------------------------------------------------------------------
    // Empty collections test
    // -----------------------------------------------------------------------

    #[test]
    fn test_empty_collections() {
        let empty_port = PortDefinition {
            port_id: "p-1".into(),
            direction: "in".into(),
            value_type: PortValueType::Any,
            cardinality: PortCardinality::Single,
            required: false,
            default_value: None,
        };
        let json = serde_json::to_string(&empty_port).unwrap();
        let deserialized: PortDefinition = serde_json::from_str(&json).unwrap();
        assert_eq!(empty_port, deserialized);
    }

    // -----------------------------------------------------------------------
    // Owned struct access test
    // -----------------------------------------------------------------------

    #[test]
    fn test_owned_struct_access() {
        let cost = sample_estimated_cost();
        let claim = sample_resource_claim();
        let candidate = AdmissionCandidate {
            node_id: "n-1".into(),
            iteration_index: 0,
            kind: NodeKind::Worker,
            topo_rank: 1,
            estimated_cost: cost,
            required_resources: vec![claim],
        };
        assert_eq!(candidate.node_id, "n-1");
        assert_eq!(candidate.kind, NodeKind::Worker);
        assert!(!candidate.estimated_cost.spawns_worker);
    }
}
