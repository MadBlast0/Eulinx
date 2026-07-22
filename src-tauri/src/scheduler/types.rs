use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Scheduling Unit Kind
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SchedulingUnitKind {
    WorkflowNode,
    Task,
    WorkerSpawn,
    ToolInvocation,
    Verification,
    Merge,
    BackgroundJob,
}

impl SchedulingUnitKind {
    pub fn as_str(&self) -> &'static str {
        match self {
            SchedulingUnitKind::WorkflowNode => "workflow_node",
            SchedulingUnitKind::Task => "task",
            SchedulingUnitKind::WorkerSpawn => "worker_spawn",
            SchedulingUnitKind::ToolInvocation => "tool_invocation",
            SchedulingUnitKind::Verification => "verification",
            SchedulingUnitKind::Merge => "merge",
            SchedulingUnitKind::BackgroundJob => "background_job",
        }
    }
}

// ---------------------------------------------------------------------------
// Scheduling State
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SchedulingState {
    Created,
    Queued,
    WaitingForDependencies,
    WaitingForPermission,
    WaitingForLock,
    WaitingForBudget,
    WaitingForApproval,
    Ready,
    Scheduled,
    Running,
    Completed,
    Failed,
    Cancelled,
    Skipped,
}

// ---------------------------------------------------------------------------
// Scheduling Priority
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SchedulingPriority {
    Critical,
    High,
    Normal,
    Low,
    Background,
}

pub fn priority_numeric(p: &SchedulingPriority) -> u32 {
    match p {
        SchedulingPriority::Critical => 0,
        SchedulingPriority::High => 1,
        SchedulingPriority::Normal => 2,
        SchedulingPriority::Low => 3,
        SchedulingPriority::Background => 4,
    }
}

// ---------------------------------------------------------------------------
// Dependency Type
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DependencyType {
    UnitCompleted,
    ArtifactAvailable,
    ApprovalGranted,
    LockReleased,
    ToolAvailable,
    BudgetAvailable,
    EventReceived,
}

// ---------------------------------------------------------------------------
// Blocker Kind
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BlockerKind {
    Dependency,
    Permission,
    Approval,
    Lock,
    Budget,
    RuntimeState,
    Resource,
    ToolUnavailable,
    WorkspaceUnavailable,
}

// ---------------------------------------------------------------------------
// Safety Gate Kind
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SafetyGateKind {
    RuntimeState,
    Dependency,
    Permission,
    Approval,
    Lock,
    Budget,
    Resource,
}

// ---------------------------------------------------------------------------
// Budget Confidence
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BudgetConfidence {
    Low,
    Medium,
    High,
}

// ---------------------------------------------------------------------------
// Backoff Strategy
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BackoffStrategy {
    None,
    Fixed,
    Exponential,
}

// ---------------------------------------------------------------------------
// Failure Category
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FailureCategory {
    DependencyFailed,
    PermissionDenied,
    ApprovalRejected,
    LockTimeout,
    BudgetExhausted,
    ToolUnavailable,
    WorkerFailed,
    RuntimeUnsafe,
    Timeout,
    UnknownError,
}

// ---------------------------------------------------------------------------
// Concurrency Policy
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConcurrencyPolicy {
    Fifo,
    Priority,
    Fair,
}

// ---------------------------------------------------------------------------
// Queue Kind
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Hash, Eq)]
#[serde(rename_all = "snake_case")]
pub enum QueueKind {
    Incoming,
    DependencyWait,
    PermissionWait,
    ApprovalWait,
    LockWait,
    BudgetWait,
    Runnable,
    Running,
    Retry,
    Cancelled,
    Completed,
    Failed,
}

// ---------------------------------------------------------------------------
// Scheduler Lifecycle State
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SchedulerLifecycleState {
    Idle,
    Running,
    Paused,
    Stopped,
}

// ---------------------------------------------------------------------------
// Scheduling Unit
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SchedulingUnit {
    pub id: String,
    pub kind: SchedulingUnitKind,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    #[serde(rename = "sessionId")]
    pub session_id: Option<String>,
    #[serde(rename = "executionId")]
    pub execution_id: Option<String>,
    #[serde(rename = "workflowId")]
    pub workflow_id: Option<String>,
    #[serde(rename = "nodeId")]
    pub node_id: Option<String>,
    #[serde(rename = "taskId")]
    pub task_id: Option<String>,
    pub priority: SchedulingPriority,
    pub dependencies: Vec<String>,
    #[serde(rename = "requiredPermissions")]
    pub required_permissions: Vec<String>,
    #[serde(rename = "requiredLocks")]
    pub required_locks: Vec<String>,
    #[serde(rename = "budgetEstimate")]
    pub budget_estimate: Option<BudgetEstimate>,
    pub state: SchedulingState,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

// ---------------------------------------------------------------------------
// Scheduling Dependency
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SchedulingDependency {
    pub id: String,
    #[serde(rename = "unitId")]
    pub unit_id: String,
    #[serde(rename = "dependencyType")]
    pub dependency_type: DependencyType,
    #[serde(rename = "targetId")]
    pub target_id: String,
    pub required: bool,
}

// ---------------------------------------------------------------------------
// Readiness Blocker
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ReadinessBlocker {
    pub kind: BlockerKind,
    pub message: String,
    #[serde(rename = "blockingObjectId")]
    pub blocking_object_id: Option<String>,
    pub recoverable: bool,
}

// ---------------------------------------------------------------------------
// Readiness Result
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ReadinessResult {
    #[serde(rename = "unitId")]
    pub unit_id: String,
    pub ready: bool,
    pub blockers: Vec<ReadinessBlocker>,
    #[serde(rename = "checkedAt")]
    pub checked_at: String,
}

// ---------------------------------------------------------------------------
// Safety Gate Result
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SafetyGateResult {
    #[serde(rename = "unitId")]
    pub unit_id: String,
    pub gate: SafetyGateKind,
    pub passed: bool,
    pub blocker: Option<String>,
    #[serde(rename = "checkedAt")]
    pub checked_at: String,
}

// ---------------------------------------------------------------------------
// Budget Estimate
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct BudgetEstimate {
    #[serde(rename = "estimatedRuntimeMs")]
    pub estimated_runtime_ms: Option<u64>,
    #[serde(rename = "estimatedTokens")]
    pub estimated_tokens: Option<u32>,
    #[serde(rename = "estimatedCostMicroUsd")]
    pub estimated_cost_micro_usd: Option<f64>,
    #[serde(rename = "estimatedWorkers")]
    pub estimated_workers: Option<u32>,
    #[serde(rename = "estimatedToolInvocations")]
    pub estimated_tool_invocations: Option<u32>,
    #[serde(rename = "estimatedFileWrites")]
    pub estimated_file_writes: Option<u32>,
    pub confidence: BudgetConfidence,
}

// ---------------------------------------------------------------------------
// Budget Reservation
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct BudgetReservation {
    #[serde(rename = "unitId")]
    pub unit_id: String,
    #[serde(rename = "reservedAt")]
    pub reserved_at: String,
    #[serde(rename = "runtimeMs")]
    pub runtime_ms: Option<u64>,
    pub tokens: Option<u32>,
    #[serde(rename = "costMicroUsd")]
    pub cost_micro_usd: Option<f64>,
    pub workers: Option<u32>,
    #[serde(rename = "toolInvocations")]
    pub tool_invocations: Option<u32>,
    #[serde(rename = "fileWrites")]
    pub file_writes: Option<u32>,
}

// ---------------------------------------------------------------------------
// Retry Policy
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RetryPolicy {
    #[serde(rename = "maxAttempts")]
    pub max_attempts: u32,
    pub backoff: BackoffStrategy,
    #[serde(rename = "delayMs")]
    pub delay_ms: Option<u64>,
    #[serde(rename = "retryOn")]
    pub retry_on: Vec<String>,
    #[serde(rename = "requireRevalidation")]
    pub require_revalidation: bool,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            backoff: BackoffStrategy::Exponential,
            delay_ms: Some(1000),
            retry_on: vec![
                "lock_conflict".to_string(),
                "merge_conflict".to_string(),
                "timeout".to_string(),
                "tool_unavailable".to_string(),
            ],
            require_revalidation: true,
        }
    }
}

// ---------------------------------------------------------------------------
// Concurrency Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ConcurrencyConfig {
    #[serde(rename = "maxConcurrent")]
    pub max_concurrent: u32,
    #[serde(rename = "maxPerKind")]
    pub max_per_kind: Option<HashMap<String, u32>>,
}

// ---------------------------------------------------------------------------
// Token Bucket Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TokenBucketConfig {
    pub capacity: f64,
    #[serde(rename = "refillRate")]
    pub refill_rate: f64,
}

// ---------------------------------------------------------------------------
// Token Bucket State
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TokenBucketState {
    pub tokens: f64,
    #[serde(rename = "lastRefillAt")]
    pub last_refill_at: u64,
}

// ---------------------------------------------------------------------------
// Rate Limit Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RateLimitConfig {
    pub global: TokenBucketConfig,
    #[serde(rename = "perGroup")]
    pub per_group: Option<TokenBucketConfig>,
}

// ---------------------------------------------------------------------------
// Fairness Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct FairnessConfig {
    #[serde(rename = "maxPerGroup")]
    pub max_per_group: u32,
    #[serde(rename = "maxPerWorkspace")]
    pub max_per_workspace: u32,
    #[serde(rename = "agingIntervalMs")]
    pub aging_interval_ms: u64,
    #[serde(rename = "maxAgingLevels")]
    pub max_aging_levels: u32,
}

// ---------------------------------------------------------------------------
// Readiness Context
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ReadinessContext {
    #[serde(rename = "runtimeReady")]
    pub runtime_ready: bool,
    #[serde(rename = "completedUnitIds")]
    pub completed_unit_ids: HashSet<String>,
    #[serde(rename = "heldLockIds")]
    pub held_lock_ids: HashSet<String>,
    #[serde(rename = "approvedPermissions")]
    pub approved_permissions: HashSet<String>,
    #[serde(rename = "approvedUnitIds")]
    pub approved_unit_ids: HashSet<String>,
    #[serde(rename = "runningCount")]
    pub running_count: u32,
    #[serde(rename = "maxConcurrency")]
    pub max_concurrency: u32,
    #[serde(rename = "totalBudgetCostMicroUsd")]
    pub total_budget_cost_micro_usd: f64,
    #[serde(rename = "maxBudgetCostMicroUsd")]
    pub max_budget_cost_micro_usd: f64,
}

// ---------------------------------------------------------------------------
// Queue Snapshot Entry
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct QueueSnapshotEntry {
    #[serde(rename = "unitId")]
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    pub state: SchedulingState,
    #[serde(rename = "waitReason")]
    pub wait_reason: Option<BlockerKind>,
    #[serde(rename = "queuedAt")]
    pub queued_at: String,
    #[serde(rename = "ageMs")]
    pub age_ms: u64,
}

// ---------------------------------------------------------------------------
// Scheduler Queue Snapshot
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SchedulerQueueSnapshot {
    pub queues: HashMap<QueueKind, Vec<QueueSnapshotEntry>>,
    #[serde(rename = "runningCount")]
    pub running_count: u32,
    #[serde(rename = "totalBlocked")]
    pub total_blocked: u32,
    pub timestamp: String,
}

// ---------------------------------------------------------------------------
// Scheduler Metrics
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SchedulerMetrics {
    #[serde(rename = "queueLengths")]
    pub queue_lengths: HashMap<String, u32>,
    #[serde(rename = "averageWaitTimeMs")]
    pub average_wait_time_ms: f64,
    #[serde(rename = "averageRunTimeMs")]
    pub average_run_time_ms: f64,
    #[serde(rename = "blockedCount")]
    pub blocked_count: u32,
    #[serde(rename = "retryCount")]
    pub retry_count: u32,
    #[serde(rename = "cancellationCount")]
    pub cancellation_count: u32,
    #[serde(rename = "throughputPerMinute")]
    pub throughput_per_minute: u32,
    #[serde(rename = "runningCount")]
    pub running_count: u32,
    #[serde(rename = "totalProcessed")]
    pub total_processed: u32,
}

// ---------------------------------------------------------------------------
// Dead Entry
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DeadEntry {
    #[serde(rename = "unitId")]
    pub unit_id: String,
    pub kind: SchedulingUnitKind,
    pub priority: SchedulingPriority,
    #[serde(rename = "lastError")]
    pub last_error: String,
    #[serde(rename = "failureCategory")]
    pub failure_category: FailureCategory,
    #[serde(rename = "attemptCount")]
    pub attempt_count: u32,
    #[serde(rename = "enteredAt")]
    pub entered_at: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

// ---------------------------------------------------------------------------
// Budget Pool Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct BudgetPoolConfig {
    #[serde(rename = "maxCostMicroUsd")]
    pub max_cost_micro_usd: f64,
    #[serde(rename = "maxWorkers")]
    pub max_workers: u32,
    #[serde(rename = "maxToolInvocations")]
    pub max_tool_invocations: u32,
    #[serde(rename = "maxFileWrites")]
    pub max_file_writes: u32,
    #[serde(rename = "maxTokens")]
    pub max_tokens: u32,
    #[serde(rename = "maxRuntimeMs")]
    pub max_runtime_ms: u64,
}

// ---------------------------------------------------------------------------
// Scheduler Config
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SchedulerConfig {
    #[serde(rename = "maxConcurrency")]
    pub max_concurrency: u32,
    pub budget: BudgetPoolConfig,
    #[serde(rename = "enableAging")]
    pub enable_aging: bool,
    #[serde(rename = "agingIntervalMs")]
    pub aging_interval_ms: u64,
    pub fairness: FairnessConfig,
}

impl Default for SchedulerConfig {
    fn default() -> Self {
        Self {
            max_concurrency: 8,
            budget: UNLIMITED_BUDGET_POOL,
            enable_aging: true,
            aging_interval_ms: 30_000,
            fairness: DEFAULT_FAIRNESS_CONFIG,
        }
    }
}

// ---------------------------------------------------------------------------
// Scheduler Event
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SchedulerEvent {
    Started,
    Stopped,
    Paused,
    Resumed,
    UnitCreated,
    UnitQueued,
    UnitReady,
    UnitBlocked,
    UnitUnblocked,
    UnitScheduled,
    UnitRunning,
    UnitCompleted,
    UnitFailed,
    UnitCancelled,
    UnitRetryScheduled,
    BudgetExhausted,
    LockWaiting,
    PermissionWaiting,
}

// ---------------------------------------------------------------------------
// IPC JSON types
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct SchedulingUnitJson {
    pub id: String,
    pub kind: SchedulingUnitKind,
    #[serde(rename = "workspaceId")]
    pub workspace_id: String,
    #[serde(rename = "sessionId")]
    pub session_id: Option<String>,
    #[serde(rename = "executionId")]
    pub execution_id: Option<String>,
    #[serde(rename = "workflowId")]
    pub workflow_id: Option<String>,
    #[serde(rename = "nodeId")]
    pub node_id: Option<String>,
    #[serde(rename = "taskId")]
    pub task_id: Option<String>,
    pub priority: SchedulingPriority,
    pub dependencies: Vec<String>,
    #[serde(rename = "requiredPermissions")]
    pub required_permissions: Vec<String>,
    #[serde(rename = "requiredLocks")]
    pub required_locks: Vec<String>,
    #[serde(rename = "budgetEstimate")]
    pub budget_estimate: Option<BudgetEstimate>,
    pub state: SchedulingState,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

impl From<SchedulingUnitJson> for SchedulingUnit {
    fn from(j: SchedulingUnitJson) -> Self {
        Self {
            id: j.id,
            kind: j.kind,
            workspace_id: j.workspace_id,
            session_id: j.session_id,
            execution_id: j.execution_id,
            workflow_id: j.workflow_id,
            node_id: j.node_id,
            task_id: j.task_id,
            priority: j.priority,
            dependencies: j.dependencies,
            required_permissions: j.required_permissions,
            required_locks: j.required_locks,
            budget_estimate: j.budget_estimate,
            state: j.state,
            created_at: j.created_at,
            updated_at: j.updated_at,
        }
    }
}

impl From<SchedulingUnit> for SchedulingUnitJson {
    fn from(u: SchedulingUnit) -> Self {
        Self {
            id: u.id,
            kind: u.kind,
            workspace_id: u.workspace_id,
            session_id: u.session_id,
            execution_id: u.execution_id,
            workflow_id: u.workflow_id,
            node_id: u.node_id,
            task_id: u.task_id,
            priority: u.priority,
            dependencies: u.dependencies,
            required_permissions: u.required_permissions,
            required_locks: u.required_locks,
            budget_estimate: u.budget_estimate,
            state: u.state,
            created_at: u.created_at,
            updated_at: u.updated_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ReadinessContextJson {
    #[serde(rename = "runtimeReady")]
    pub runtime_ready: bool,
    #[serde(rename = "completedUnitIds")]
    pub completed_unit_ids: Vec<String>,
    #[serde(rename = "heldLockIds")]
    pub held_lock_ids: Vec<String>,
    #[serde(rename = "approvedPermissions")]
    pub approved_permissions: Vec<String>,
    #[serde(rename = "approvedUnitIds")]
    pub approved_unit_ids: Vec<String>,
    #[serde(rename = "runningCount")]
    pub running_count: u32,
    #[serde(rename = "maxConcurrency")]
    pub max_concurrency: u32,
    #[serde(rename = "totalBudgetCostMicroUsd")]
    pub total_budget_cost_micro_usd: f64,
    #[serde(rename = "maxBudgetCostMicroUsd")]
    pub max_budget_cost_micro_usd: f64,
}

impl From<ReadinessContextJson> for ReadinessContext {
    fn from(j: ReadinessContextJson) -> Self {
        Self {
            runtime_ready: j.runtime_ready,
            completed_unit_ids: j.completed_unit_ids.into_iter().collect(),
            held_lock_ids: j.held_lock_ids.into_iter().collect(),
            approved_permissions: j.approved_permissions.into_iter().collect(),
            approved_unit_ids: j.approved_unit_ids.into_iter().collect(),
            running_count: j.running_count,
            max_concurrency: j.max_concurrency,
            total_budget_cost_micro_usd: j.total_budget_cost_micro_usd,
            max_budget_cost_micro_usd: j.max_budget_cost_micro_usd,
        }
    }
}

impl From<ReadinessContext> for ReadinessContextJson {
    fn from(ctx: ReadinessContext) -> Self {
        Self {
            runtime_ready: ctx.runtime_ready,
            completed_unit_ids: ctx.completed_unit_ids.into_iter().collect(),
            held_lock_ids: ctx.held_lock_ids.into_iter().collect(),
            approved_permissions: ctx.approved_permissions.into_iter().collect(),
            approved_unit_ids: ctx.approved_unit_ids.into_iter().collect(),
            running_count: ctx.running_count,
            max_concurrency: ctx.max_concurrency,
            total_budget_cost_micro_usd: ctx.total_budget_cost_micro_usd,
            max_budget_cost_micro_usd: ctx.max_budget_cost_micro_usd,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TickResultJson {
    pub dispatched: Vec<String>,
    pub completed: Vec<String>,
    pub failed: Vec<String>,
    pub blocked: Vec<String>,
    pub retried: Vec<String>,
    pub events: Vec<SchedulerEvent>,
}

impl TickResultJson {
    pub fn new(
        dispatched: Vec<String>,
        completed: Vec<String>,
        failed: Vec<String>,
        blocked: Vec<String>,
        retried: Vec<String>,
        events: Vec<SchedulerEvent>,
    ) -> Self {
        Self {
            dispatched,
            completed,
            failed,
            blocked,
            retried,
            events,
        }
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

pub const DEFAULT_FAIRNESS_CONFIG: FairnessConfig = FairnessConfig {
    max_per_group: 4,
    max_per_workspace: 8,
    aging_interval_ms: 30_000,
    max_aging_levels: 3,
};

pub const UNLIMITED_BUDGET_POOL: BudgetPoolConfig = BudgetPoolConfig {
    max_cost_micro_usd: f64::MAX,
    max_workers: u32::MAX,
    max_tool_invocations: u32::MAX,
    max_file_writes: u32::MAX,
    max_tokens: u32::MAX,
    max_runtime_ms: u64::MAX,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::time_utils::now_iso;

    #[test]
    fn test_state_serialization() {
        let states = [
            SchedulingState::Created,
            SchedulingState::Queued,
            SchedulingState::WaitingForDependencies,
            SchedulingState::WaitingForPermission,
            SchedulingState::WaitingForLock,
            SchedulingState::WaitingForBudget,
            SchedulingState::WaitingForApproval,
            SchedulingState::Ready,
            SchedulingState::Scheduled,
            SchedulingState::Running,
            SchedulingState::Completed,
            SchedulingState::Failed,
            SchedulingState::Cancelled,
            SchedulingState::Skipped,
        ];
        for state in &states {
            let json = serde_json::to_string(state).unwrap();
            let deserialized: SchedulingState = serde_json::from_str(&json).unwrap();
            assert_eq!(*state, deserialized);
        }
    }

    #[test]
    fn test_priority_ordering() {
        assert_eq!(priority_numeric(&SchedulingPriority::Critical), 0);
        assert_eq!(priority_numeric(&SchedulingPriority::High), 1);
        assert_eq!(priority_numeric(&SchedulingPriority::Normal), 2);
        assert_eq!(priority_numeric(&SchedulingPriority::Low), 3);
        assert_eq!(priority_numeric(&SchedulingPriority::Background), 4);
    }

    #[test]
    fn test_retry_policy_defaults() {
        let policy = RetryPolicy::default();
        assert_eq!(policy.max_attempts, 3);
        assert_eq!(policy.backoff, BackoffStrategy::Exponential);
        assert_eq!(policy.delay_ms, Some(1000));
        assert!(policy.retry_on.contains(&"lock_conflict".to_string()));
        assert!(policy.retry_on.contains(&"merge_conflict".to_string()));
        assert!(policy.retry_on.contains(&"timeout".to_string()));
        assert!(policy.retry_on.contains(&"tool_unavailable".to_string()));
        assert!(policy.require_revalidation);
    }

    #[test]
    fn test_scheduling_unit_construction() {
        let unit = SchedulingUnit {
            id: "test-unit-1".to_string(),
            kind: SchedulingUnitKind::Task,
            workspace_id: "ws-1".to_string(),
            session_id: Some("sess-1".to_string()),
            execution_id: None,
            workflow_id: Some("wf-1".to_string()),
            node_id: None,
            task_id: None,
            priority: SchedulingPriority::Normal,
            dependencies: vec!["dep-1".to_string()],
            required_permissions: vec!["read".to_string()],
            required_locks: vec![],
            budget_estimate: None,
            state: SchedulingState::Created,
            created_at: now_iso(),
            updated_at: now_iso(),
        };
        assert_eq!(unit.id, "test-unit-1");
        assert_eq!(unit.kind, SchedulingUnitKind::Task);
        assert_eq!(unit.workspace_id, "ws-1");
        assert_eq!(unit.session_id, Some("sess-1".to_string()));
        assert!(unit.execution_id.is_none());
        assert_eq!(unit.priority, SchedulingPriority::Normal);
        assert_eq!(unit.dependencies.len(), 1);
        assert_eq!(unit.required_permissions[0], "read");
        assert!(unit.required_locks.is_empty());
        assert!(unit.budget_estimate.is_none());
        assert_eq!(unit.state, SchedulingState::Created);
    }

    #[test]
    fn test_scheduling_unit_json_roundtrip() {
        let unit = SchedulingUnit {
            id: "rt-unit".to_string(),
            kind: SchedulingUnitKind::WorkflowNode,
            workspace_id: "ws-1".to_string(),
            session_id: None,
            execution_id: None,
            workflow_id: None,
            node_id: None,
            task_id: None,
            priority: SchedulingPriority::High,
            dependencies: vec![],
            required_permissions: vec![],
            required_locks: vec![],
            budget_estimate: None,
            state: SchedulingState::Queued,
            created_at: now_iso(),
            updated_at: now_iso(),
        };
        let json: SchedulingUnitJson = unit.clone().into();
        let back: SchedulingUnit = json.into();
        assert_eq!(unit, back);
    }

    #[test]
    fn test_readiness_context_json_roundtrip() {
        let ctx = ReadinessContext {
            runtime_ready: true,
            completed_unit_ids: HashSet::from(["u1".to_string()]),
            held_lock_ids: HashSet::new(),
            approved_permissions: HashSet::from(["perm1".to_string()]),
            approved_unit_ids: HashSet::new(),
            running_count: 2,
            max_concurrency: 8,
            total_budget_cost_micro_usd: 100.0,
            max_budget_cost_micro_usd: f64::MAX,
        };
        let json: ReadinessContextJson = ctx.clone().into();
        let back: ReadinessContext = json.into();
        assert_eq!(ctx, back);
    }

    #[test]
    fn test_default_fairness_config() {
        assert_eq!(DEFAULT_FAIRNESS_CONFIG.max_per_group, 4);
        assert_eq!(DEFAULT_FAIRNESS_CONFIG.max_per_workspace, 8);
        assert_eq!(DEFAULT_FAIRNESS_CONFIG.aging_interval_ms, 30_000);
        assert_eq!(DEFAULT_FAIRNESS_CONFIG.max_aging_levels, 3);
    }

    #[test]
    fn test_unlimited_budget_pool() {
        assert_eq!(UNLIMITED_BUDGET_POOL.max_cost_micro_usd, f64::MAX);
        assert_eq!(UNLIMITED_BUDGET_POOL.max_workers, u32::MAX);
        assert_eq!(UNLIMITED_BUDGET_POOL.max_tool_invocations, u32::MAX);
        assert_eq!(UNLIMITED_BUDGET_POOL.max_file_writes, u32::MAX);
        assert_eq!(UNLIMITED_BUDGET_POOL.max_tokens, u32::MAX);
        assert_eq!(UNLIMITED_BUDGET_POOL.max_runtime_ms, u64::MAX);
    }

    #[test]
    fn test_all_enums_serialize_snake_case() {
        let kind = SchedulingUnitKind::WorkflowNode;
        assert_eq!(serde_json::to_string(&kind).unwrap(), "\"workflow_node\"");

        let state = SchedulingState::WaitingForDependencies;
        assert_eq!(
            serde_json::to_string(&state).unwrap(),
            "\"waiting_for_dependencies\""
        );

        let blocker = BlockerKind::ToolUnavailable;
        assert_eq!(
            serde_json::to_string(&blocker).unwrap(),
            "\"tool_unavailable\""
        );

        let gate = SafetyGateKind::RuntimeState;
        assert_eq!(serde_json::to_string(&gate).unwrap(), "\"runtime_state\"");
    }
}
