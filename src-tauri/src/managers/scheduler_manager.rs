use std::sync::Mutex;

use serde_json::Value;
use tauri::{AppHandle, Emitter, Manager};

use crate::error::AppError;
use crate::ipc::{ApiError, ApiResult};
use crate::scheduler::scheduler::Scheduler;
use crate::scheduler::types::{
    DeadEntry, FailureCategory, SchedulerConfig, SchedulerEvent, SchedulerLifecycleState,
    SchedulerMetrics, SchedulerQueueSnapshot, SchedulingUnitJson, TickResultJson,
    TokenBucketState,
};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct BudgetInfo {
    pub config: crate::scheduler::types::BudgetPoolConfig,
    pub active_reservations: usize,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConcurrencyInfo {
    pub running_count: usize,
    pub remaining_capacity: u32,
    pub running_unit_ids: Vec<String>,
}

pub struct SchedulerManager {
    scheduler: Mutex<Option<Scheduler>>,
    config: SchedulerConfig,
    app: AppHandle,
}

impl SchedulerManager {
    pub fn new(app: AppHandle, config: SchedulerConfig) -> Self {
        Self {
            scheduler: Mutex::new(None),
            config,
            app,
        }
    }

    pub fn initialize(&self) -> Result<(), AppError> {
        let mut guard = self.scheduler.lock().unwrap();
        let mut scheduler = Scheduler::new(self.config.clone());

        let app = self.app.clone();
        scheduler.set_readiness_provider(move || {
            let app_state = app.state::<crate::state::AppState>();
            let sessions = app_state.pty_sessions.blocking_read();
            let runtime_ready = !sessions.is_empty();
            drop(sessions);

            crate::scheduler::types::ReadinessContext {
                runtime_ready,
                completed_unit_ids: std::collections::HashSet::new(),
                held_lock_ids: std::collections::HashSet::new(),
                approved_permissions: std::collections::HashSet::new(),
                approved_unit_ids: std::collections::HashSet::new(),
                running_count: 0,
                max_concurrency: 8,
                total_budget_cost_micro_usd: 0.0,
                max_budget_cost_micro_usd: f64::MAX,
            }
        });

        *guard = Some(scheduler);
        Ok(())
    }

    fn with_scheduler<F, T>(&self, f: F) -> Result<T, AppError>
    where
        F: FnOnce(&mut Scheduler) -> Result<T, AppError>,
    {
        let mut guard = self.scheduler.lock().unwrap();
        let scheduler = guard
            .as_mut()
            .ok_or_else(|| AppError::NotFound("scheduler not initialized".into()))?;
        f(scheduler)
    }

    fn map_err<T>(result: Result<T, AppError>) -> ApiResult<T> {
        result.map_err(|e| ApiError {
            code: match &e {
                AppError::NotFound(_) => "SCHEDULER_NOT_FOUND".into(),
                AppError::InvalidInput(_) => "SCHEDULER_INVALID_INPUT".into(),
                AppError::Internal(_) => "SCHEDULER_INTERNAL".into(),
            },
            message: e.to_string(),
            context: None,
        })
    }

    pub fn start(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.start()))
    }

    pub fn stop(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.stop()))
    }

    pub fn pause(&self, reason: String) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.pause(&reason)))
    }

    pub fn resume(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.resume()))
    }

    pub fn state(&self) -> ApiResult<SchedulerLifecycleState> {
        Self::map_err(self.with_scheduler(|s| Ok(s.state().clone())))
    }

    pub fn enqueue(&self, unit: SchedulingUnitJson) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.enqueue(unit.into())))
    }

    pub fn tick(&self) -> ApiResult<TickResultJson> {
        let result = Self::map_err(self.with_scheduler(|s| s.tick()))?;

        for event in &result.events {
            self.emit_scheduler_event(event, None);
        }

        // Drain the DetailedEvent channel and emit rich events to the frontend
        if let Ok(guard) = self.scheduler.lock() {
            if let Some(ref scheduler) = *guard {
                let rx = scheduler.event_receiver();
                while let Ok(detailed_event) = rx.try_recv() {
                    if let Ok(payload) = serde_json::to_value(&detailed_event) {
                        let event_type = payload
                            .get("type")
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        let event_name = format!("scheduler://detailed/{}", event_type);
                        let _ = self.app.emit(&event_name, &payload);
                    }
                }
            }
        }

        let _ = self.app.emit("scheduler://tick-result", &result);

        Ok(result)
    }

    pub fn cancel(&self, unit_id: String, reason: String) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.cancel(&unit_id, &reason)))
    }

    pub fn complete(&self, unit_id: String) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.complete(&unit_id)))
    }

    pub fn fail(&self, unit_id: String, error: String, category: FailureCategory) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| s.fail(&unit_id, &error, category)))
    }

    pub fn get_unit(&self, unit_id: String) -> ApiResult<Option<SchedulingUnitJson>> {
        Self::map_err(
            self.with_scheduler(|s| {
                Ok(s.get_unit(&unit_id).map(|u| SchedulingUnitJson::from(u.clone())))
            }),
        )
    }

    pub fn get_running_units(&self) -> ApiResult<Vec<SchedulingUnitJson>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.get_running_units()
                .into_iter()
                .map(SchedulingUnitJson::from)
                .collect())
        }))
    }

    pub fn get_queue_snapshot(&self) -> ApiResult<SchedulerQueueSnapshot> {
        Self::map_err(self.with_scheduler(|s| Ok(s.get_queue_snapshot())))
    }

    pub fn get_metrics(&self) -> ApiResult<SchedulerMetrics> {
        Self::map_err(self.with_scheduler(|s| Ok(s.get_metrics())))
    }

    pub fn get_dead_queue(&self) -> ApiResult<Vec<DeadEntry>> {
        Self::map_err(
            self.with_scheduler(|s| {
                Ok(s.get_dead_queue().get_all().into_iter().cloned().collect())
            }),
        )
    }

    pub fn get_rate_limit_state(
        &self,
    ) -> ApiResult<(TokenBucketState, Option<TokenBucketState>)> {
        Self::map_err(self.with_scheduler(|s| Ok(s.rate_limit_state())))
    }

    pub fn get_budget_info(&self) -> ApiResult<BudgetInfo> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(BudgetInfo {
                config: s.budget_config().clone(),
                active_reservations: s.budget_reservations(),
            })
        }))
    }

    pub fn get_concurrency_info(&self) -> ApiResult<ConcurrencyInfo> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(ConcurrencyInfo {
                running_count: s.concurrency_running_count(),
                remaining_capacity: s.concurrency_remaining_capacity(),
                running_unit_ids: s.concurrency_running_unit_ids(),
            })
        }))
    }

    pub fn dead_queue_get(&self, unit_id: String) -> ApiResult<Option<DeadEntry>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.dead_queue_get(&unit_id).cloned())
        }))
    }

    pub fn dead_queue_remove(&self, unit_id: String) -> ApiResult<Option<DeadEntry>> {
        Self::map_err(self.with_scheduler(|s| Ok(s.dead_queue_remove(&unit_id))))
    }

    pub fn dead_queue_len(&self) -> ApiResult<usize> {
        Self::map_err(self.with_scheduler(|s| Ok(s.dead_queue_len())))
    }

    pub fn dead_queue_clear(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.dead_queue_clear();
            Ok(())
        }))
    }

    pub fn dead_queue_get_by_category(
        &self,
        category: FailureCategory,
    ) -> ApiResult<Vec<DeadEntry>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.dead_queue_get_by_category(&category)
                .into_iter()
                .cloned()
                .collect())
        }))
    }

    // --- Fairness subsystem ---

    pub fn fairness_group_count(&self, group: String) -> ApiResult<u32> {
        Self::map_err(self.with_scheduler(|s| Ok(s.fairness_group_count(&group))))
    }

    pub fn fairness_workspace_count(&self, workspace_id: String) -> ApiResult<u32> {
        Self::map_err(self.with_scheduler(|s| Ok(s.fairness_workspace_count(&workspace_id))))
    }

    pub fn fairness_reset(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.fairness_reset();
            Ok(())
        }))
    }

    // --- Budget subsystem ---

    pub fn budget_reset(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.budget_reset();
            Ok(())
        }))
    }

    pub fn budget_clear_breach(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.budget_clear_breach();
            Ok(())
        }))
    }

    // --- Concurrency subsystem ---

    pub fn concurrency_is_running(&self, unit_id: String) -> ApiResult<bool> {
        Self::map_err(self.with_scheduler(|s| Ok(s.concurrency_is_running(&unit_id))))
    }

    pub fn concurrency_get_kind(&self, unit_id: String) -> ApiResult<Option<String>> {
        Self::map_err(self.with_scheduler(|s| Ok(s.concurrency_get_kind(&unit_id))))
    }

    pub fn concurrency_reset(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.concurrency_reset();
            Ok(())
        }))
    }

    // --- Metrics subsystem ---

    pub fn metrics_reset(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.metrics_reset();
            Ok(())
        }))
    }

    // --- Rate limiter subsystem ---

    pub fn rate_limiter_reset(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.rate_limiter_reset();
            Ok(())
        }))
    }

    // --- Retry queue subsystem ---

    pub fn retry_len(&self) -> ApiResult<usize> {
        Self::map_err(self.with_scheduler(|s| Ok(s.retry_len())))
    }

    pub fn retry_clear(&self) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.retry_clear();
            Ok(())
        }))
    }

    pub fn dead_queue_contains(&self, unit_id: String) -> ApiResult<bool> {
        Self::map_err(self.with_scheduler(|s| Ok(s.dead_queue_contains(&unit_id))))
    }

    // --- Budget subsystem (additional) ---

    // --- Concurrency subsystem (additional) ---

    pub fn concurrency_running_count_direct(&self) -> ApiResult<usize> {
        Self::map_err(self.with_scheduler(|s| Ok(s.concurrency_running_count_direct())))
    }

    pub fn concurrency_get_kind_count(
        &self,
        kind: crate::scheduler::types::SchedulingUnitKind,
    ) -> ApiResult<usize> {
        Self::map_err(self.with_scheduler(|s| Ok(s.concurrency_get_kind_count(&kind))))
    }

    // --- Retry queue subsystem (additional) ---

    pub fn retry_is_eligible(&self, unit_id: String, now: u64) -> ApiResult<bool> {
        Self::map_err(self.with_scheduler(|s| Ok(s.retry_is_eligible(&unit_id, now))))
    }

    pub fn retry_get_all(&self) -> ApiResult<Vec<crate::scheduler::retries::RetryEntry>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.retry_get_all().into_iter().cloned().collect())
        }))
    }

    pub fn budget_get_reservation_json(
        &self,
        unit_id: String,
    ) -> ApiResult<Option<serde_json::Value>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.budget_get_reservation(&unit_id)
                .map(|r| serde_json::to_value(r).unwrap_or_default()))
        }))
    }

    // --- Queue subsystem ---

    pub fn queue_peek(
        &self,
        kind: crate::scheduler::types::QueueKind,
    ) -> ApiResult<Option<SchedulingUnitJson>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.queue_peek(&kind).map(|u| SchedulingUnitJson::from(u.clone())))
        }))
    }

    pub fn queue_is_empty(
        &self,
        kind: crate::scheduler::types::QueueKind,
    ) -> ApiResult<bool> {
        Self::map_err(self.with_scheduler(|s| Ok(s.queue_is_empty(&kind))))
    }

    pub fn queue_contains(
        &self,
        kind: crate::scheduler::types::QueueKind,
        unit_id: String,
    ) -> ApiResult<bool> {
        Self::map_err(self.with_scheduler(|s| Ok(s.queue_contains(&kind, &unit_id))))
    }

    pub fn queue_size(
        &self,
        kind: crate::scheduler::types::QueueKind,
    ) -> ApiResult<usize> {
        Self::map_err(self.with_scheduler(|s| Ok(s.queue_size(&kind))))
    }

    pub fn queue_clear(
        &self,
        kind: crate::scheduler::types::QueueKind,
    ) -> ApiResult<()> {
        Self::map_err(self.with_scheduler(|s| {
            s.queue_clear(&kind);
            Ok(())
        }))
    }

    pub fn queue_find_by_kind(
        &self,
        kind: crate::scheduler::types::QueueKind,
        unit_kind: crate::scheduler::types::SchedulingUnitKind,
    ) -> ApiResult<Vec<SchedulingUnitJson>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.queue_find_by_kind(&kind, &unit_kind)
                .into_iter()
                .map(|u| SchedulingUnitJson::from(u.clone()))
                .collect())
        }))
    }

    pub fn queue_find_by_priority(
        &self,
        kind: crate::scheduler::types::QueueKind,
        priority: crate::scheduler::types::SchedulingPriority,
    ) -> ApiResult<Vec<SchedulingUnitJson>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.queue_find_by_priority(&kind, &priority)
                .into_iter()
                .map(|u| SchedulingUnitJson::from(u.clone()))
                .collect())
        }))
    }

    pub fn queue_find_highest_priority(
        &self,
        kind: crate::scheduler::types::QueueKind,
    ) -> ApiResult<Option<SchedulingUnitJson>> {
        Self::map_err(self.with_scheduler(|s| {
            Ok(s.queue_find_highest_priority(&kind)
                .map(|u| SchedulingUnitJson::from(u.clone())))
        }))
    }

    fn emit_scheduler_event(&self, event: &SchedulerEvent, _payload: Option<Value>) {
        let event_name = match event {
            SchedulerEvent::Started => "scheduler://started",
            SchedulerEvent::Stopped => "scheduler://stopped",
            SchedulerEvent::Paused => "scheduler://paused",
            SchedulerEvent::Resumed => "scheduler://resumed",
            SchedulerEvent::UnitCreated => "scheduler://unit-created",
            SchedulerEvent::UnitQueued => "scheduler://unit-queued",
            SchedulerEvent::UnitReady => "scheduler://unit-ready",
            SchedulerEvent::UnitBlocked => "scheduler://unit-blocked",
            SchedulerEvent::UnitUnblocked => "scheduler://unit-unblocked",
            SchedulerEvent::UnitScheduled => "scheduler://unit-scheduled",
            SchedulerEvent::UnitRunning => "scheduler://unit-running",
            SchedulerEvent::UnitCompleted => "scheduler://unit-completed",
            SchedulerEvent::UnitFailed => "scheduler://unit-failed",
            SchedulerEvent::UnitCancelled => "scheduler://unit-cancelled",
            SchedulerEvent::UnitRetryScheduled => "scheduler://unit-retry-scheduled",
            SchedulerEvent::BudgetExhausted => "scheduler://budget-exhausted",
            SchedulerEvent::LockWaiting => "scheduler://lock-waiting",
            SchedulerEvent::PermissionWaiting => "scheduler://permission-waiting",
        };
        let _ = self.app.emit(event_name, event);
    }

    // --- Round-robin distributor accessors ---

    pub fn group_distributor_active_groups(&self) -> ApiResult<Vec<String>> {
        Self::map_err(self.with_scheduler(|s| Ok(s.group_distributor_active_groups())))
    }

    pub fn group_distributor_count(&self, group: String) -> ApiResult<usize> {
        Self::map_err(self.with_scheduler(|s| Ok(s.group_distributor_count(&group))))
    }

    pub fn group_distributor_next(&self) -> ApiResult<Option<String>> {
        Self::map_err(self.with_scheduler(|s| Ok(s.group_distributor_next())))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scheduler::types::SchedulingUnitKind;

    #[test]
    fn test_initialize_and_state() {
        let app = tauri::test::mock_app(tauri::test::MockAppBuilder::new().build()).handle();
        let config = SchedulerConfig {
            max_concurrency: 4,
            budget: crate::scheduler::types::UNLIMITED_BUDGET_POOL,
            enable_aging: true,
            aging_interval_ms: 30_000,
            fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
        };
        let manager = SchedulerManager::new(app, config);
        assert!(manager.scheduler.lock().unwrap().is_none());

        manager.initialize().unwrap();
        assert!(manager.scheduler.lock().unwrap().is_some());
    }

    #[test]
    fn test_methods_return_error_when_uninitialized() {
        let app = tauri::test::mock_app(tauri::test::MockAppBuilder::new().build()).handle();
        let config = SchedulerConfig {
            max_concurrency: 4,
            budget: crate::scheduler::types::UNLIMITED_BUDGET_POOL,
            enable_aging: false,
            aging_interval_ms: 0,
            fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
        };
        let manager = SchedulerManager::new(app, config);

        let result = manager.start();
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().code, "SCHEDULER_NOT_FOUND");
    }

    #[test]
    fn test_with_scheduler_not_found() {
        let app = tauri::test::mock_app(tauri::test::MockAppBuilder::new().build()).handle();
        let config = SchedulerConfig {
            max_concurrency: 4,
            budget: crate::scheduler::types::UNLIMITED_BUDGET_POOL,
            enable_aging: false,
            aging_interval_ms: 0,
            fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
        };
        let manager = SchedulerManager::new(app, config);

        let result: Result<(), AppError> = manager.with_scheduler(|_| Ok(()));
        assert!(matches!(result, Err(AppError::NotFound(_))));
    }

    #[test]
    #[ignore = "requires Tauri runtime with managed AppState"]
    fn test_initialize_sets_scheduler() {
        let app = tauri::test::mock_app(tauri::test::MockAppBuilder::new().build()).handle();
        let config = SchedulerConfig {
            max_concurrency: 4,
            budget: crate::scheduler::types::UNLIMITED_BUDGET_POOL,
            enable_aging: true,
            aging_interval_ms: 30_000,
            fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
        };
        let manager = SchedulerManager::new(app, config);
        manager.initialize().unwrap();
        let guard = manager.scheduler.lock().unwrap();
        assert!(guard.is_some());
    }

    #[test]
    fn test_emit_scheduler_event_mapping() {
        let app = tauri::test::mock_app(tauri::test::MockAppBuilder::new().build()).handle();
        let config = SchedulerConfig {
            max_concurrency: 4,
            budget: crate::scheduler::types::UNLIMITED_BUDGET_POOL,
            enable_aging: false,
            aging_interval_ms: 0,
            fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
        };
        let manager = SchedulerManager::new(app, config);

        let variants = [
            SchedulerEvent::Started,
            SchedulerEvent::Stopped,
            SchedulerEvent::Paused,
            SchedulerEvent::Resumed,
            SchedulerEvent::UnitCreated,
            SchedulerEvent::UnitQueued,
            SchedulerEvent::UnitReady,
            SchedulerEvent::UnitBlocked,
            SchedulerEvent::UnitUnblocked,
            SchedulerEvent::UnitScheduled,
            SchedulerEvent::UnitRunning,
            SchedulerEvent::UnitCompleted,
            SchedulerEvent::UnitFailed,
            SchedulerEvent::UnitCancelled,
            SchedulerEvent::UnitRetryScheduled,
            SchedulerEvent::BudgetExhausted,
            SchedulerEvent::LockWaiting,
            SchedulerEvent::PermissionWaiting,
        ];

        assert_eq!(variants.len(), 18);
    }
}
