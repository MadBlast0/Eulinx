use std::collections::HashMap;

use crate::error::AppError;
use crate::scheduler::budgets::BudgetPool;
use crate::scheduler::concurrency::ConcurrencyLimiter;
use crate::scheduler::dead_queue::DeadQueue;
use crate::scheduler::events::{
    SchedulerEventEmitter, SchedulerPausedPayload, SchedulerResumedPayload,
    SchedulerStartedPayload, SchedulerStoppedPayload, SchedulerUnitBlockedPayload,
    SchedulerUnitCancelledPayload, SchedulerUnitCompletedPayload, SchedulerUnitEventPayload,
    SchedulerUnitFailedPayload, SchedulerUnitRetryScheduledPayload,
};
use crate::scheduler::fairness::{compute_aged_priority, ConcurrencyTracker, RoundRobinDistributor};
use crate::scheduler::metrics::{build_queue_snapshot, MetricsCollector};
use crate::scheduler::queue::JobQueue;
use crate::scheduler::rate_limiter::RateLimiter;
use crate::scheduler::readiness::partition_by_readiness;
use crate::scheduler::retries::RetryQueue;
use crate::scheduler::time_utils::{now_iso, rfc3339_to_millis};
use crate::scheduler::types::{
    BlockerKind, BudgetPoolConfig, ConcurrencyConfig, ConcurrencyPolicy, DeadEntry, FailureCategory, QueueKind,
    QueueSnapshotEntry, RateLimitConfig, ReadinessContext, RetryPolicy, SchedulerConfig,
    SchedulerLifecycleState, SchedulerMetrics, SchedulerQueueSnapshot, SchedulingState,
    SchedulingUnit, SchedulingUnitKind, TickResultJson, TokenBucketConfig, TokenBucketState,
};
use crate::scheduler::types::SchedulerEvent as SimpleEvent;
use crate::scheduler::events::SchedulerEvent as DetailedEvent;

fn get_wait_queue_for_blocker(kind: &BlockerKind) -> QueueKind {
    match crate::scheduler::readiness::blocker_to_wait_queue(kind) {
        "dependency_wait" => QueueKind::DependencyWait,
        "permission_wait" => QueueKind::PermissionWait,
        "approval_wait" => QueueKind::ApprovalWait,
        "lock_wait" => QueueKind::LockWait,
        "budget_wait" => QueueKind::BudgetWait,
        "incoming" => QueueKind::Incoming,
        "runnable" => QueueKind::Runnable,
        _ => QueueKind::DependencyWait,
    }
}

fn get_wait_state_for_blocker(kind: &BlockerKind) -> SchedulingState {
    match crate::scheduler::readiness::blocker_to_wait_state(kind) {
        "waiting_for_dependencies" => SchedulingState::WaitingForDependencies,
        "waiting_for_permission" => SchedulingState::WaitingForPermission,
        "waiting_for_approval" => SchedulingState::WaitingForApproval,
        "waiting_for_lock" => SchedulingState::WaitingForLock,
        "waiting_for_budget" => SchedulingState::WaitingForBudget,
        "queued" => SchedulingState::Queued,
        "ready" => SchedulingState::Ready,
        _ => SchedulingState::Queued,
    }
}

fn default_rate_limit_config() -> RateLimitConfig {
    RateLimitConfig {
        global: TokenBucketConfig {
            capacity: 100_000.0,
            refill_rate: 10_000.0,
        },
        per_group: None,
    }
}

pub struct Scheduler {
    config: SchedulerConfig,
    lifecycle_state: SchedulerLifecycleState,
    queues: HashMap<QueueKind, JobQueue>,
    concurrency: ConcurrencyLimiter,
    budget: BudgetPool,
    retry_queue: RetryQueue,
    dead_queue: DeadQueue,
    rate_limiter: RateLimiter,
    metrics: MetricsCollector,
    event_emitter: SchedulerEventEmitter,
    event_receiver: crossbeam_channel::Receiver<DetailedEvent>,
    fairness: ConcurrencyTracker,
    group_distributor: RoundRobinDistributor<SchedulingUnit>,
    readiness_provider: Option<Box<dyn Fn() -> ReadinessContext + Send>>,
}

impl Scheduler {
    pub fn new(config: SchedulerConfig) -> Self {
        let mut queues = HashMap::new();
        queues.insert(QueueKind::Incoming, JobQueue::new());
        queues.insert(QueueKind::DependencyWait, JobQueue::new());
        queues.insert(QueueKind::PermissionWait, JobQueue::new());
        queues.insert(QueueKind::ApprovalWait, JobQueue::new());
        queues.insert(QueueKind::LockWait, JobQueue::new());
        queues.insert(QueueKind::BudgetWait, JobQueue::new());
        queues.insert(QueueKind::Runnable, JobQueue::new());
        queues.insert(QueueKind::Running, JobQueue::new());
        queues.insert(QueueKind::Retry, JobQueue::new());
        queues.insert(QueueKind::Cancelled, JobQueue::new());
        queues.insert(QueueKind::Completed, JobQueue::new());
        queues.insert(QueueKind::Failed, JobQueue::new());

        let concurrency_config = ConcurrencyConfig {
            max_concurrent: config.max_concurrency,
            max_per_kind: None,
        };

        let (emitter, rx) = SchedulerEventEmitter::new();

        // Initialize the round-robin distributor with all unit kind groups
        let mut group_distributor: RoundRobinDistributor<SchedulingUnit> = RoundRobinDistributor::new();
        for kind in [
            SchedulingUnitKind::WorkflowNode,
            SchedulingUnitKind::Task,
            SchedulingUnitKind::WorkerSpawn,
            SchedulingUnitKind::ToolInvocation,
            SchedulingUnitKind::Verification,
            SchedulingUnitKind::Merge,
            SchedulingUnitKind::BackgroundJob,
        ] {
            group_distributor.register(kind.as_str().to_string(), Vec::new());
        }

        Self {
            lifecycle_state: SchedulerLifecycleState::Idle,
            queues,
            concurrency: ConcurrencyLimiter::new(concurrency_config),
            budget: BudgetPool::new(config.budget.clone()),
            retry_queue: RetryQueue::new_with_default(),
            dead_queue: DeadQueue::new(),
            rate_limiter: RateLimiter::new(&default_rate_limit_config()),
            metrics: MetricsCollector::new(),
            event_emitter: emitter,
            event_receiver: rx,
            fairness: ConcurrencyTracker::new(),
            group_distributor: RoundRobinDistributor::new(),
            readiness_provider: None,
            config,
        }
    }

    pub fn event_receiver(&self) -> &crossbeam_channel::Receiver<DetailedEvent> {
        &self.event_receiver
    }

    pub fn start(&mut self) -> Result<(), AppError> {
        if self.lifecycle_state != SchedulerLifecycleState::Idle
            && self.lifecycle_state != SchedulerLifecycleState::Stopped
        {
            return Err(AppError::InvalidInput(
                "Cannot start scheduler from current state".to_string(),
            ));
        }
        self.lifecycle_state = SchedulerLifecycleState::Running;
        self.event_emitter
            .emit(DetailedEvent::Started(SchedulerStartedPayload {
                max_concurrency: self.config.max_concurrency,
                timestamp: now_iso(),
            }));
        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), AppError> {
        if self.lifecycle_state != SchedulerLifecycleState::Running
            && self.lifecycle_state != SchedulerLifecycleState::Paused
        {
            return Err(AppError::InvalidInput(
                "Scheduler is not running or paused".to_string(),
            ));
        }
        self.lifecycle_state = SchedulerLifecycleState::Stopped;
        self.event_emitter
            .emit(DetailedEvent::Stopped(SchedulerStoppedPayload {
                reason: "user_request".to_string(),
                timestamp: now_iso(),
            }));
        Ok(())
    }

    pub fn pause(&mut self, reason: &str) -> Result<(), AppError> {
        if self.lifecycle_state != SchedulerLifecycleState::Running {
            return Err(AppError::InvalidInput(
                "Scheduler is not running".to_string(),
            ));
        }
        self.lifecycle_state = SchedulerLifecycleState::Paused;
        self.event_emitter
            .emit(DetailedEvent::Paused(SchedulerPausedPayload {
                reason: reason.to_string(),
                timestamp: now_iso(),
            }));
        Ok(())
    }

    pub fn resume(&mut self) -> Result<(), AppError> {
        if self.lifecycle_state != SchedulerLifecycleState::Paused {
            return Err(AppError::InvalidInput(
                "Scheduler is not paused".to_string(),
            ));
        }
        self.lifecycle_state = SchedulerLifecycleState::Running;
        self.event_emitter
            .emit(DetailedEvent::Resumed(SchedulerResumedPayload {
                timestamp: now_iso(),
            }));
        Ok(())
    }

    pub fn state(&self) -> &SchedulerLifecycleState {
        &self.lifecycle_state
    }

    pub fn set_readiness_provider<F>(&mut self, provider: F)
    where
        F: Fn() -> ReadinessContext + Send + 'static,
    {
        self.readiness_provider = Some(Box::new(provider));
    }

    pub fn enqueue(&mut self, mut unit: SchedulingUnit) -> Result<(), AppError> {
        unit.state = SchedulingState::Queued;
        unit.updated_at = now_iso();

        // Add unit to the round-robin distributor for group-fair dispatch
        let group = unit.kind.as_str().to_string();
        self.group_distributor
            .add_item(group, unit.clone());

        self.queues
            .get_mut(&QueueKind::Incoming)
            .unwrap()
            .enqueue(unit.clone());

        self.event_emitter
            .emit(DetailedEvent::UnitEnqueued(SchedulerUnitEventPayload {
                unit_id: unit.id.clone(),
                kind: unit.kind,
                priority: unit.priority,
                state: SchedulingState::Queued,
                workspace_id: unit.workspace_id,
                timestamp: now_iso(),
            }));

        Ok(())
    }

    pub fn tick(&mut self) -> Result<TickResultJson, AppError> {
        if self.lifecycle_state != SchedulerLifecycleState::Running {
            return Err(AppError::InvalidInput(
                "Scheduler is not running".to_string(),
            ));
        }

        let mut events: Vec<SimpleEvent> = Vec::new();
        let mut dispatched: Vec<String> = Vec::new();
        let mut retried: Vec<String> = Vec::new();

        let ctx = self.get_readiness_context();

        // Apply priority aging to units in wait queues (if enabled)
        if self.config.enable_aging {
            self.apply_aging();
        }

        let blocked_ids = self.process_incoming(&ctx, &mut events);
        self.reevaluate_blocked(&ctx, &mut events);
        let dispatched_ids = self.dispatch_ready(&mut events);
        dispatched.extend(dispatched_ids);
        self.process_retries(&mut events, &mut retried);
        self.update_metrics();

        Ok(TickResultJson::new(
            dispatched,
            Vec::new(),
            Vec::new(),
            blocked_ids,
            retried,
            events,
        ))
    }

    pub fn cancel(&mut self, unit_id: &str, reason: &str) -> Result<(), AppError> {
        let unit = self
            .remove_from_all_queues(unit_id)
            .ok_or_else(|| AppError::NotFound(format!("Unit {} not found", unit_id)))?;

        self.concurrency.release(unit_id);
        self.budget.release(unit_id);
        self.rate_limiter
            .return_tokens(Some(&unit.workspace_id), 1.0);
        self.metrics.increment_cancellation();

        // Release fairness slot and remove from round-robin distributor
        let group = unit.kind.as_str();
        self.fairness
            .release(Some(group), Some(&unit.workspace_id));
        self.group_distributor.remove_item(group, |u| u.id == unit_id);

        let mut unit = unit;
        unit.state = SchedulingState::Cancelled;
        unit.updated_at = now_iso();
        self.queues
            .get_mut(&QueueKind::Cancelled)
            .unwrap()
            .enqueue(unit.clone());

        self.event_emitter
            .emit(DetailedEvent::UnitCancelled(SchedulerUnitCancelledPayload {
                unit_id: unit_id.to_string(),
                kind: unit.kind,
                priority: unit.priority,
                reason: reason.to_string(),
                requested_by: "user".to_string(),
                timestamp: now_iso(),
            }));

        Ok(())
    }

    pub fn complete(&mut self, unit_id: &str) -> Result<(), AppError> {
        let mut unit = self
            .queues
            .get_mut(&QueueKind::Running)
            .and_then(|q| q.remove(unit_id))
            .ok_or_else(|| AppError::NotFound(format!("Unit {} not found in running", unit_id)))?;

        self.concurrency.release(unit_id);
        self.budget.release(unit_id);
        self.rate_limiter
            .return_tokens(Some(&unit.workspace_id), 1.0);
        self.metrics.record_completed();

        // Record run time (time from creation to completion)
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        if let Some(created_ms) = rfc3339_to_millis(&unit.created_at) {
            let run_ms = (now_ms as i64 - created_ms).max(0) as f64;
            self.metrics.record_run_time(run_ms);
        }

        // Release fairness slot and remove from round-robin distributor
        let group = unit.kind.as_str();
        self.fairness
            .release(Some(group), Some(&unit.workspace_id));
        self.group_distributor.remove_item(group, |u| u.id == unit_id);
        unit.updated_at = now_iso();
        self.queues
            .get_mut(&QueueKind::Completed)
            .unwrap()
            .enqueue(unit.clone());

        self.event_emitter
            .emit(DetailedEvent::UnitCompleted(SchedulerUnitCompletedPayload {
                unit_id: unit_id.to_string(),
                kind: unit.kind,
                priority: unit.priority,
                duration_ms: 0,
                attempt: 1,
                timestamp: now_iso(),
            }));

        Ok(())
    }

    pub fn fail(
        &mut self,
        unit_id: &str,
        error: &str,
        category: FailureCategory,
    ) -> Result<(), AppError> {
        let unit = self
            .queues
            .get_mut(&QueueKind::Running)
            .and_then(|q| q.remove(unit_id))
            .or_else(|| self.remove_from_all_queues(unit_id))
            .ok_or_else(|| AppError::NotFound(format!("Unit {} not found", unit_id)))?;

        self.concurrency.release(unit_id);
        self.budget.release(unit_id);
        self.rate_limiter
            .return_tokens(Some(&unit.workspace_id), 1.0);
        self.metrics.increment_retry();

        // Release fairness slot
        let group = unit.kind.as_str();
        self.fairness
            .release(Some(group), Some(&unit.workspace_id));
        self.group_distributor.remove_item(group, |u| u.id == unit_id);

        let attempt = self
            .retry_queue
            .get_entry(unit_id)
            .map(|e| e.attempt)
            .unwrap_or(0);

        let mut unit = unit;
        let ts = now_iso();
        let unit_kind = unit.kind.clone();
        let unit_priority = unit.priority.clone();

        if let Some(retry_entry) = self.retry_queue.schedule_retry(
            unit_id,
            attempt + 1,
            error,
            category.clone(),
            false,
            false,
        ) {
            unit.state = SchedulingState::Queued;
            unit.updated_at = ts.clone();
            self.queues
                .get_mut(&QueueKind::Retry)
                .unwrap()
                .enqueue(unit);

            self.event_emitter
                .emit(DetailedEvent::UnitFailed(SchedulerUnitFailedPayload {
                    unit_id: unit_id.to_string(),
                    kind: unit_kind.clone(),
                    priority: unit_priority.clone(),
                    failure_category: category,
                    error: error.to_string(),
                    attempt: retry_entry.attempt,
                    will_retry: true,
                    timestamp: ts.clone(),
                }));

            let default_policy = RetryPolicy::default();
            self.event_emitter.emit(DetailedEvent::RetryScheduled(
                SchedulerUnitRetryScheduledPayload {
                    unit_id: unit_id.to_string(),
                    kind: unit_kind,
                    attempt: retry_entry.attempt,
                    max_attempts: default_policy.max_attempts,
                    delay_ms: retry_entry.next_eligible_at,
                    next_eligible_at: now_iso(),
                    timestamp: ts,
                },
            ));

            return Ok(());
        }

        unit.state = SchedulingState::Failed;
        unit.updated_at = ts.clone();
        self.queues
            .get_mut(&QueueKind::Failed)
            .unwrap()
            .enqueue(unit.clone());

        self.dead_queue.add(DeadEntry {
            unit_id: unit_id.to_string(),
            kind: unit.kind.clone(),
            priority: unit.priority.clone(),
            last_error: error.to_string(),
            failure_category: category.clone(),
            attempt_count: attempt + 1,
            entered_at: ts.clone(),
            created_at: unit.created_at,
        });

        self.event_emitter
            .emit(DetailedEvent::UnitFailed(SchedulerUnitFailedPayload {
                unit_id: unit_id.to_string(),
                kind: unit.kind,
                priority: unit.priority,
                failure_category: category,
                error: error.to_string(),
                attempt: attempt + 1,
                will_retry: false,
                timestamp: ts,
            }));

        Ok(())
    }

    pub fn get_unit(&self, unit_id: &str) -> Option<&SchedulingUnit> {
        for queue in self.queues.values() {
            if let Some(unit) = queue.get(unit_id) {
                return Some(unit);
            }
        }
        None
    }

    pub fn get_running_units(&self) -> Vec<SchedulingUnit> {
        self.queues
            .get(&QueueKind::Running)
            .map(|q| q.to_vec())
            .unwrap_or_default()
    }

    pub fn get_queue_snapshot(&self) -> SchedulerQueueSnapshot {
        let mut queue_entries = HashMap::new();
        let blocked_queues = [
            QueueKind::DependencyWait,
            QueueKind::PermissionWait,
            QueueKind::ApprovalWait,
            QueueKind::LockWait,
            QueueKind::BudgetWait,
        ];

        for (qk, queue) in &self.queues {
            let mut entries = Vec::new();
            for unit in queue.to_vec() {
                let wait_reason = if blocked_queues.contains(qk) {
                    match qk {
                        QueueKind::DependencyWait => Some(BlockerKind::Dependency),
                        QueueKind::PermissionWait => Some(BlockerKind::Permission),
                        QueueKind::ApprovalWait => Some(BlockerKind::Approval),
                        QueueKind::LockWait => Some(BlockerKind::Lock),
                        QueueKind::BudgetWait => Some(BlockerKind::Budget),
                        _ => None,
                    }
                } else {
                    None
                };

                entries.push(QueueSnapshotEntry {
                    unit_id: unit.id,
                    kind: unit.kind,
                    priority: unit.priority,
                    state: unit.state,
                    wait_reason,
                    queued_at: unit.created_at,
                    age_ms: 0,
                });
            }
            queue_entries.insert(qk.clone(), entries);
        }

        let total_blocked: u32 = blocked_queues
            .iter()
            .map(|qk| self.queues.get(qk).map_or(0, |q| q.len() as u32))
            .sum();

        let running_count = self
            .queues
            .get(&QueueKind::Running)
            .map_or(0, |q| q.len() as u32);

        build_queue_snapshot(queue_entries, running_count, total_blocked, now_iso())
    }

    pub fn get_metrics(&self) -> SchedulerMetrics {
        self.metrics.get_metrics()
    }

    pub fn get_dead_queue(&self) -> &DeadQueue {
        &self.dead_queue
    }

    fn get_readiness_context(&self) -> ReadinessContext {
        if let Some(ref provider) = self.readiness_provider {
            return provider();
        }
        ReadinessContext {
            runtime_ready: true,
            completed_unit_ids: self
                .queues
                .get(&QueueKind::Completed)
                .map(|q| q.to_vec().into_iter().map(|u| u.id).collect())
                .unwrap_or_default(),
            held_lock_ids: Default::default(),
            approved_permissions: Default::default(),
            approved_unit_ids: Default::default(),
            running_count: self
                .queues
                .get(&QueueKind::Running)
                .map_or(0, |q| q.len() as u32),
            max_concurrency: self.config.max_concurrency,
            total_budget_cost_micro_usd: self.budget.get_consumption().cost_micro_usd,
            max_budget_cost_micro_usd: self.config.budget.max_cost_micro_usd,
        }
    }

    fn process_incoming(
        &mut self,
        ctx: &ReadinessContext,
        events: &mut Vec<SimpleEvent>,
    ) -> Vec<String> {
        let mut blocked_ids = Vec::new();
        let incoming: Vec<SchedulingUnit> = self
            .queues
            .get_mut(&QueueKind::Incoming)
            .map(|q| {
                let mut units = Vec::new();
                while let Some(unit) = q.dequeue() {
                    units.push(unit);
                }
                units
            })
            .unwrap_or_default();

        let (ready, blocked) = partition_by_readiness(&incoming, ctx);

        // Sort ready units by fairness score (lower score = higher priority) for optimal dispatch
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        let mut sorted_ready: Vec<SchedulingUnit> = ready;
        sorted_ready.sort_by(|a, b| {
            let score_a = crate::scheduler::fairness::compute_fairness_score(a, now_ms, &self.config.fairness);
            let score_b = crate::scheduler::fairness::compute_fairness_score(b, now_ms, &self.config.fairness);
            score_a.partial_cmp(&score_b).unwrap_or(std::cmp::Ordering::Equal)
        });

        for mut unit in sorted_ready {
            unit.state = SchedulingState::Ready;
            unit.updated_at = now_iso();
            self.queues
                .get_mut(&QueueKind::Runnable)
                .unwrap()
                .enqueue(unit);
            events.push(SimpleEvent::UnitReady);
        }

        for (mut unit, result) in blocked {
            let unit_kind = unit.kind.clone();
            let unit_priority = unit.priority.clone();
            let _unit_workspace = unit.workspace_id.clone();
            let blocker = &result.blockers[0];

            // Build structured dependency records and safety gate results
            let _structured_deps = crate::scheduler::readiness::build_unit_dependencies(&unit);
            let gate_results = crate::scheduler::readiness::evaluate_all_safety_gate_results(&unit, ctx);

            let target_queue = get_wait_queue_for_blocker(&blocker.kind);
            let target_state = get_wait_state_for_blocker(&blocker.kind);
            unit.state = target_state;
            unit.updated_at = now_iso();
            self.queues
                .get_mut(&target_queue)
                .unwrap()
                .enqueue(unit);

            blocked_ids.push(result.unit_id.clone());
            events.push(SimpleEvent::UnitBlocked);
            self.metrics.increment_blocked();

            // Emit detailed safety gate analysis for this blocked unit
            let gate_analysis = gate_results
                .iter()
                .map(|gr| format!("{:?}={}", gr.gate, if gr.passed { "pass" } else { gr.blocker.as_deref().unwrap_or("fail") }))
                .collect::<Vec<_>>()
                .join(", ");

            self.event_emitter
                .emit(DetailedEvent::UnitBlocked(SchedulerUnitBlockedPayload {
                    unit_id: result.unit_id,
                    kind: unit_kind,
                    priority: unit_priority,
                    blocker_kind: blocker.kind.clone(),
                    blocker_message: format!("{} [gates: {}]", blocker.message, gate_analysis),
                    blocking_object_id: blocker.blocking_object_id.clone(),
                    recoverable: blocker.recoverable,
                    timestamp: now_iso(),
                }));
        }

        blocked_ids
    }

    fn reevaluate_blocked(&mut self, ctx: &ReadinessContext, events: &mut Vec<SimpleEvent>) {
        let wait_queues = [
            QueueKind::DependencyWait,
            QueueKind::PermissionWait,
            QueueKind::ApprovalWait,
            QueueKind::LockWait,
            QueueKind::BudgetWait,
        ];

        let mut to_reevaluate = Vec::new();
        for qk in &wait_queues {
            if let Some(queue) = self.queues.get_mut(qk) {
                while let Some(unit) = queue.dequeue() {
                    to_reevaluate.push(unit);
                }
            }
        }

        let (ready, blocked) = partition_by_readiness(&to_reevaluate, ctx);

        for mut unit in ready {
            unit.state = SchedulingState::Ready;
            unit.updated_at = now_iso();
            self.queues
                .get_mut(&QueueKind::Runnable)
                .unwrap()
                .enqueue(unit);
            events.push(SimpleEvent::UnitUnblocked);
            self.metrics.decrement_blocked();
        }

        for (mut unit, result) in blocked {
            let blocker = &result.blockers[0];
            let target_queue = get_wait_queue_for_blocker(&blocker.kind);
            let target_state = get_wait_state_for_blocker(&blocker.kind);
            unit.state = target_state;
            unit.updated_at = now_iso();
            self.queues
                .get_mut(&target_queue)
                .unwrap()
                .enqueue(unit);
        }
    }

    fn dispatch_ready(&mut self, events: &mut Vec<SimpleEvent>) -> Vec<String> {
        let mut dispatched = Vec::new();
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        loop {
            // Peek at the next runnable unit to check capacity with the correct kind
            let next_kind = self
                .queues
                .get(&QueueKind::Runnable)
                .and_then(|q| q.peek())
                .map(|u| u.kind.clone());

            let kind = match next_kind {
                Some(k) => k,
                None => break,
            };

            let has_capacity = if self.config.fairness.max_per_group < u32::MAX
                || self.config.fairness.max_per_workspace < u32::MAX
            {
                self.concurrency
                    .can_acquire_with_policy(&kind, &ConcurrencyPolicy::Fair)
            } else {
                self.concurrency.can_acquire(&kind)
            };
            if !has_capacity {
                break;
            }

            let unit = self
                .queues
                .get_mut(&QueueKind::Runnable)
                .and_then(|q| q.dequeue());

            let unit = match unit {
                Some(u) => u,
                None => break,
            };

            let unit_id = unit.id.clone();
            let workspace_id = unit.workspace_id.clone();

            // Fairness check: per-group and per-workspace limits
            let group = unit.kind.as_str();
            if !self.fairness.can_schedule(
                Some(group),
                Some(&workspace_id),
                &self.config.fairness,
            ) {
                self.queues
                    .get_mut(&QueueKind::Runnable)
                    .unwrap()
                    .enqueue(unit);
                break;
            }

            // Rate limit check
            if !self.rate_limiter.is_allowed(Some(&workspace_id), 1.0) {
                self.queues
                    .get_mut(&QueueKind::Runnable)
                    .unwrap()
                    .enqueue(unit);
                break;
            }

            // Budget reservation check
            if let Some(ref estimate) = unit.budget_estimate {
                if !self.budget.can_reserve(estimate) {
                    self.rate_limiter.return_tokens(Some(&workspace_id), 1.0);
                    let mut unit = unit;
                    unit.state = SchedulingState::Queued;
                    unit.updated_at = now_iso();
                    self.queues
                        .get_mut(&QueueKind::BudgetWait)
                        .unwrap()
                        .enqueue(unit);
                    events.push(SimpleEvent::UnitBlocked);
                    self.metrics.increment_blocked();
                    continue;
                }
                self.budget.reserve(&unit_id, estimate);
            }

            let acquired = self.concurrency.acquire(unit_id.clone(), kind.clone());
            if !acquired {
                self.rate_limiter.return_tokens(Some(&workspace_id), 1.0);
                if unit.budget_estimate.is_some() {
                    self.budget.release(&unit_id);
                }
                self.queues
                    .get_mut(&QueueKind::Runnable)
                    .unwrap()
                    .enqueue(unit);
                break;
            }

            // Record wait time (time from creation to dispatch)
            if let Some(created_ms) = rfc3339_to_millis(&unit.created_at) {
                let wait_ms = (now_ms as i64 - created_ms).max(0) as f64;
                self.metrics.record_wait_time(wait_ms);
            }

            // Acquire fairness slot with proper group (unit kind) and workspace
            self.fairness.acquire(Some(group), Some(&workspace_id));

            let mut unit = unit;
            unit.state = SchedulingState::Running;
            unit.updated_at = now_iso();
            self.queues
                .get_mut(&QueueKind::Running)
                .unwrap()
                .enqueue(unit);

            dispatched.push(unit_id);
            events.push(SimpleEvent::UnitScheduled);
            events.push(SimpleEvent::UnitRunning);

            self.metrics.record_scheduled();

            // Advance the round-robin distributor cursor after each dispatch
            // to track which group was served for fairness reporting
            let _ = self.group_distributor.next();
        }

        dispatched
    }

    fn process_retries(
        &mut self,
        events: &mut Vec<SimpleEvent>,
        retried_ids: &mut Vec<String>,
    ) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let eligible = self.retry_queue.get_eligible(now);
        for entry in eligible {
            let unit = self
                .queues
                .get_mut(&QueueKind::Retry)
                .and_then(|q| q.remove(&entry.unit_id));

            if let Some(mut unit) = unit {
                unit.state = SchedulingState::Queued;
                unit.updated_at = now_iso();
                self.queues
                    .get_mut(&QueueKind::Incoming)
                    .unwrap()
                    .enqueue(unit);

                self.retry_queue.remove(&entry.unit_id);
                retried_ids.push(entry.unit_id);
                events.push(SimpleEvent::UnitRetryScheduled);
            }
        }
    }

    fn remove_from_all_queues(&mut self, unit_id: &str) -> Option<SchedulingUnit> {
        for queue in self.queues.values_mut() {
            if let Some(unit) = queue.remove(unit_id) {
                return Some(unit);
            }
        }
        None
    }

    fn update_metrics(&mut self) {
        for (qk, queue) in &self.queues {
            let name = format!("{:?}", qk).to_lowercase();
            self.metrics.set_queue_length(&name, queue.len() as u32);
        }
        let running_count = self
            .queues
            .get(&QueueKind::Running)
            .map_or(0, |q| q.len() as u64);
        self.metrics.set_running_count(running_count);
    }

    /// Apply priority aging to units in wait queues.
    /// Units that have waited long enough get their priority promoted by one level.
    fn apply_aging(&mut self) {
        let now_ms = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;

        let wait_queues = [
            QueueKind::DependencyWait,
            QueueKind::PermissionWait,
            QueueKind::ApprovalWait,
            QueueKind::LockWait,
            QueueKind::BudgetWait,
        ];

        for qk in &wait_queues {
            if let Some(queue) = self.queues.get_mut(qk) {
                // Collect all units, apply aging, re-enqueue
                let mut units: Vec<SchedulingUnit> = Vec::new();
                while let Some(unit) = queue.dequeue() {
                    units.push(unit);
                }
                for mut unit in units {
                    if let Some(created_ms) = rfc3339_to_millis(&unit.created_at) {
                        let wait_ms = (now_ms as i64 - created_ms).max(0) as u64;
                        let aged_priority = compute_aged_priority(
                            &unit.priority,
                            wait_ms,
                            &self.config.fairness,
                        );
                        if aged_priority != unit.priority {
                            unit.priority = aged_priority;
                            unit.updated_at = now_iso();
                        }
                    }
                    queue.enqueue(unit);
                }
            }
        }
    }

    pub fn rate_limit_state(&self) -> (TokenBucketState, Option<TokenBucketState>) {
        let global = self.rate_limiter.get_global_state();
        let per_group = self
            .rate_limiter
            .get_group_state("default")
            .or_else(|| self.rate_limiter.get_group_state(""));
        (global, per_group)
    }

    pub fn budget_config(&self) -> &BudgetPoolConfig {
        self.budget.get_config()
    }

    pub fn budget_reservations(&self) -> usize {
        self.budget.active_reservations()
    }

    pub fn concurrency_running_count(&self) -> usize {
        self.queues
            .get(&QueueKind::Running)
            .map_or(0, |q| q.len())
    }

    pub fn concurrency_remaining_capacity(&self) -> u32 {
        self.concurrency.remaining_capacity()
    }

    pub fn concurrency_running_unit_ids(&self) -> Vec<String> {
        self.concurrency.get_running_unit_ids()
    }

    pub fn dead_queue_get(&self, unit_id: &str) -> Option<&DeadEntry> {
        self.dead_queue.get(unit_id)
    }

    pub fn dead_queue_remove(&mut self, unit_id: &str) -> Option<DeadEntry> {
        self.dead_queue.remove(unit_id)
    }

    pub fn dead_queue_len(&self) -> usize {
        self.dead_queue.len()
    }

    pub fn dead_queue_clear(&mut self) {
        self.dead_queue.clear()
    }

    pub fn dead_queue_get_by_category(&self, category: &FailureCategory) -> Vec<&DeadEntry> {
        self.dead_queue.get_by_category(category)
    }

    // --- Fairness subsystem accessors ---

    pub fn fairness_group_count(&self, group: &str) -> u32 {
        self.fairness.get_group_count(group)
    }

    pub fn fairness_workspace_count(&self, workspace_id: &str) -> u32 {
        self.fairness.get_workspace_count(workspace_id)
    }

    pub fn fairness_reset(&mut self) {
        self.fairness.reset();
    }

    // --- Budget subsystem accessors ---

    pub fn budget_get_reservation(&self, unit_id: &str) -> Option<&crate::scheduler::types::BudgetReservation> {
        self.budget.get_reservation(unit_id)
    }

    pub fn budget_clear_breach(&mut self) {
        self.budget.clear_breach();
    }

    pub fn budget_reset(&mut self) {
        self.budget.reset();
    }

    // --- Concurrency subsystem accessors ---

    pub fn concurrency_is_running(&self, unit_id: &str) -> bool {
        self.concurrency.is_running(unit_id)
    }

    pub fn concurrency_get_kind(&self, unit_id: &str) -> Option<String> {
        self.concurrency.get_kind(unit_id)
    }

    pub fn concurrency_running_count_direct(&self) -> usize {
        self.concurrency.running_count()
    }

    pub fn concurrency_get_kind_count(&self, kind: &crate::scheduler::types::SchedulingUnitKind) -> usize {
        self.concurrency.get_kind_count(kind)
    }

    pub fn concurrency_reset(&mut self) {
        self.concurrency.reset();
    }

    // --- Metrics subsystem accessors ---

    pub fn metrics_reset(&mut self) {
        self.metrics.reset();
    }

    // --- Rate limiter subsystem accessors ---

    pub fn rate_limiter_reset(&mut self) {
        self.rate_limiter.reset();
    }

    // --- Retry queue subsystem accessors ---

    pub fn retry_is_eligible(&self, unit_id: &str, now: u64) -> bool {
        self.retry_queue.is_eligible(unit_id, now)
    }

    pub fn retry_len(&self) -> usize {
        self.retry_queue.len()
    }

    pub fn retry_get_all(&self) -> Vec<&crate::scheduler::retries::RetryEntry> {
        self.retry_queue.get_all()
    }

    pub fn retry_clear(&mut self) {
        self.retry_queue.clear();
    }

    // --- Dead queue subsystem accessors ---

    pub fn dead_queue_contains(&self, unit_id: &str) -> bool {
        self.dead_queue.contains(unit_id)
    }

    // --- Queue subsystem accessors ---

    pub fn queue_peek(&self, kind: &QueueKind) -> Option<&SchedulingUnit> {
        self.queues.get(kind).and_then(|q| q.peek())
    }

    pub fn queue_is_empty(&self, kind: &QueueKind) -> bool {
        self.queues.get(kind).map_or(true, |q| q.is_empty())
    }

    pub fn queue_contains(&self, kind: &QueueKind, unit_id: &str) -> bool {
        self.queues.get(kind).map_or(false, |q| q.contains(unit_id))
    }

    pub fn queue_size(&self, kind: &QueueKind) -> usize {
        self.queues.get(kind).map_or(0, |q| q.size())
    }

    pub fn queue_clear(&mut self, kind: &QueueKind) {
        if let Some(q) = self.queues.get_mut(kind) {
            q.clear();
        }
    }

    pub fn queue_find_by_kind(&self, kind: &QueueKind, unit_kind: &crate::scheduler::types::SchedulingUnitKind) -> Vec<&SchedulingUnit> {
        self.queues.get(kind).map_or_else(Vec::new, |q| q.find_by_kind(unit_kind))
    }

    pub fn queue_find_by_priority(&self, kind: &QueueKind, priority: &crate::scheduler::types::SchedulingPriority) -> Vec<&SchedulingUnit> {
        self.queues.get(kind).map_or_else(Vec::new, |q| q.find_by_priority(priority))
    }

    pub fn queue_find_highest_priority(&self, kind: &QueueKind) -> Option<&SchedulingUnit> {
        self.queues.get(kind).and_then(|q| q.find_highest_priority())
    }

    // --- Group distributor accessors ---

    pub fn group_distributor_active_groups(&self) -> Vec<String> {
        self.group_distributor
            .get_active_groups()
            .into_iter()
            .cloned()
            .collect()
    }

    pub fn group_distributor_count(&self, group: &str) -> usize {
        self.group_distributor.get_count(group)
    }

    pub fn group_distributor_next(&mut self) -> Option<String> {
        self.group_distributor
            .next()
            .map(|u| u.id.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::time_utils::now_iso;
    use crate::scheduler::types::{BudgetPoolConfig, SchedulingPriority, SchedulingUnitKind};

    fn make_config() -> SchedulerConfig {
        SchedulerConfig {
            max_concurrency: 10,
            budget: UNLIMITED_BUDGET_POOL,
            enable_aging: false,
            aging_interval_ms: 30_000,
            fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
        }
    }

    fn make_unit(
        id: &str,
        kind: SchedulingUnitKind,
        priority: SchedulingPriority,
    ) -> SchedulingUnit {
        SchedulingUnit {
            id: id.to_string(),
            kind,
            workspace_id: "ws-1".to_string(),
            session_id: None,
            execution_id: None,
            workflow_id: None,
            node_id: None,
            task_id: None,
            priority,
            dependencies: vec![],
            required_permissions: vec![],
            required_locks: vec![],
            budget_estimate: None,
            state: SchedulingState::Created,
            created_at: now_iso(),
            updated_at: now_iso(),
        }
    }

    #[test]
    fn test_construction_with_default_config() {
        let scheduler = Scheduler::new(make_config());
        assert_eq!(*scheduler.state(), SchedulerLifecycleState::Idle);
        assert_eq!(scheduler.queues.len(), 12);
        for qk in &[
            QueueKind::Incoming,
            QueueKind::DependencyWait,
            QueueKind::PermissionWait,
            QueueKind::ApprovalWait,
            QueueKind::LockWait,
            QueueKind::BudgetWait,
            QueueKind::Runnable,
            QueueKind::Running,
            QueueKind::Retry,
            QueueKind::Cancelled,
            QueueKind::Completed,
            QueueKind::Failed,
        ] {
            assert!(
                scheduler.queues.contains_key(qk),
                "Missing queue {:?}",
                qk
            );
        }
    }

    #[test]
    fn test_lifecycle_start_stop_pause_resume() {
        let mut scheduler = Scheduler::new(make_config());

        assert!(scheduler.start().is_ok());
        assert_eq!(*scheduler.state(), SchedulerLifecycleState::Running);

        assert!(scheduler.pause("testing").is_ok());
        assert_eq!(*scheduler.state(), SchedulerLifecycleState::Paused);

        assert!(scheduler.resume().is_ok());
        assert_eq!(*scheduler.state(), SchedulerLifecycleState::Running);

        assert!(scheduler.stop().is_ok());
        assert_eq!(*scheduler.state(), SchedulerLifecycleState::Stopped);
    }

    #[test]
    fn test_lifecycle_invalid_transitions() {
        let mut scheduler = Scheduler::new(make_config());
        assert!(scheduler.pause("test").is_err());
        assert!(scheduler.resume().is_err());

        scheduler.start().unwrap();
        assert!(scheduler.start().is_err());

        scheduler.stop().unwrap();
        assert!(scheduler.pause("test").is_err());
        assert!(scheduler.resume().is_err());
    }

    #[test]
    fn test_enqueue_and_tick_basic_flow() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();

        assert_eq!(
            scheduler.queues.get(&QueueKind::Incoming).unwrap().len(),
            1
        );

        let result = scheduler.tick().unwrap();
        assert!(!result.dispatched.is_empty());
        assert_eq!(result.dispatched[0], "u1");

        assert_eq!(
            scheduler.queues.get(&QueueKind::Incoming).unwrap().len(),
            0
        );
        assert_eq!(
            scheduler.queues.get(&QueueKind::Runnable).unwrap().len(),
            0
        );
        assert_eq!(
            scheduler.queues.get(&QueueKind::Running).unwrap().len(),
            1
        );
    }

    #[test]
    fn test_tick_requires_running_state() {
        let mut scheduler = Scheduler::new(make_config());
        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();
        assert!(scheduler.tick().is_err());
    }

    #[test]
    fn test_cancel_queued_unit() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();
        scheduler.cancel("u1", "user requested").unwrap();

        assert_eq!(
            scheduler.queues.get(&QueueKind::Cancelled).unwrap().len(),
            1
        );
        assert_eq!(
            scheduler
                .queues
                .get(&QueueKind::Cancelled)
                .unwrap()
                .peek()
                .unwrap()
                .state,
            SchedulingState::Cancelled
        );
    }

    #[test]
    fn test_cancel_nonexistent_returns_error() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();
        let result = scheduler.cancel("nonexistent", "reason");
        assert!(result.is_err());
    }

    #[test]
    fn test_complete_running_unit() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();
        scheduler.tick().unwrap();

        assert_eq!(
            scheduler.queues.get(&QueueKind::Running).unwrap().len(),
            1
        );

        scheduler.complete("u1").unwrap();

        assert_eq!(
            scheduler.queues.get(&QueueKind::Running).unwrap().len(),
            0
        );
        assert_eq!(
            scheduler.queues.get(&QueueKind::Completed).unwrap().len(),
            1
        );
        assert_eq!(
            scheduler
                .queues
                .get(&QueueKind::Completed)
                .unwrap()
                .peek()
                .unwrap()
                .state,
            SchedulingState::Completed
        );
    }

    #[test]
    fn test_fail_running_unit_moves_to_retry() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();
        scheduler.tick().unwrap();

        scheduler
            .fail("u1", "timeout", FailureCategory::Timeout)
            .unwrap();

        assert_eq!(
            scheduler.queues.get(&QueueKind::Running).unwrap().len(),
            0
        );
        assert_eq!(scheduler.queues.get(&QueueKind::Retry).unwrap().len(), 1);
    }

    #[test]
    fn test_multiple_ticks_process_correctly() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let u1 = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        let u2 = make_unit("u2", SchedulingUnitKind::Task, SchedulingPriority::High);
        scheduler.enqueue(u1).unwrap();
        scheduler.enqueue(u2).unwrap();

        let result1 = scheduler.tick().unwrap();
        assert_eq!(result1.dispatched.len(), 2);

        scheduler.complete("u1").unwrap();
        scheduler.complete("u2").unwrap();

        assert_eq!(
            scheduler.queues.get(&QueueKind::Completed).unwrap().len(),
            2
        );

        let result2 = scheduler.tick().unwrap();
        assert!(result2.dispatched.is_empty());
    }

    #[test]
    fn test_metrics_available_after_operations() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();
        scheduler.tick().unwrap();
        scheduler.complete("u1").unwrap();

        let metrics = scheduler.get_metrics();
        assert_eq!(metrics.total_processed, 1);
        assert_eq!(metrics.running_count, 0);
    }

    #[test]
    fn test_queue_snapshot_reflects_state() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();
        scheduler.tick().unwrap();

        let snapshot = scheduler.get_queue_snapshot();
        assert_eq!(snapshot.running_count, 1);
        assert!(snapshot.queues.contains_key(&QueueKind::Running));
        assert!(snapshot.queues.contains_key(&QueueKind::Incoming));
    }

    #[test]
    fn test_dead_queue_receives_entries_after_max_retries() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.start().unwrap();

        let unit = make_unit("u1", SchedulingUnitKind::Task, SchedulingPriority::Normal);
        scheduler.enqueue(unit).unwrap();
        scheduler.tick().unwrap();

        scheduler
            .fail("u1", "timeout", FailureCategory::Timeout)
            .unwrap();
        scheduler.tick().unwrap();
        scheduler
            .fail("u1", "timeout", FailureCategory::Timeout)
            .unwrap();
        scheduler.tick().unwrap();
        scheduler
            .fail("u1", "timeout", FailureCategory::Timeout)
            .unwrap();

        let _dead = scheduler.get_dead_queue();
    }

    #[test]
    fn test_enqueue_and_tick_respects_concurrency_limit() {
        let config = SchedulerConfig {
            max_concurrency: 2,
            budget: UNLIMITED_BUDGET_POOL,
            enable_aging: false,
            aging_interval_ms: 30_000,
            fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
        };
        let mut scheduler = Scheduler::new(config);
        scheduler.start().unwrap();

        for i in 0..5 {
            let unit = make_unit(
                &format!("u{}", i),
                SchedulingUnitKind::Task,
                SchedulingPriority::Normal,
            );
            scheduler.enqueue(unit).unwrap();
        }

        let result = scheduler.tick().unwrap();
        assert_eq!(result.dispatched.len(), 2);
        assert_eq!(
            scheduler.queues.get(&QueueKind::Running).unwrap().len(),
            2
        );

        scheduler.complete("u0").unwrap();
        let result2 = scheduler.tick().unwrap();
        assert_eq!(result2.dispatched.len(), 1);
        assert_eq!(
            scheduler.queues.get(&QueueKind::Running).unwrap().len(),
            2
        );
    }

    #[test]
    fn test_set_readiness_provider() {
        let mut scheduler = Scheduler::new(make_config());
        scheduler.set_readiness_provider(|| ReadinessContext {
            runtime_ready: true,
            completed_unit_ids: Default::default(),
            held_lock_ids: Default::default(),
            approved_permissions: Default::default(),
            approved_unit_ids: Default::default(),
            running_count: 0,
            max_concurrency: 10,
            total_budget_cost_micro_usd: 0.0,
            max_budget_cost_micro_usd: f64::MAX,
        });
        let ctx = scheduler.get_readiness_context();
        assert!(ctx.runtime_ready);
    }

    #[test]
    fn test_event_receiver_works() {
        let mut scheduler = Scheduler::new(make_config());
        let rx = scheduler.event_receiver().clone();

        scheduler.start().unwrap();

        let event = rx.try_recv().unwrap();
        assert!(matches!(event, DetailedEvent::Started(_)));
    }
}
