use tauri::State;

use crate::managers::scheduler_manager::{BudgetInfo, ConcurrencyInfo, SchedulerManager};
use crate::scheduler::types::{
    DeadEntry, FailureCategory, QueueKind, SchedulerLifecycleState, SchedulerMetrics,
    SchedulerQueueSnapshot, SchedulingPriority, SchedulingUnitKind, SchedulingUnitJson,
    TickResultJson, TokenBucketState,
};

#[tauri::command]
pub fn scheduler_init(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.initialize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_start(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.start().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_stop(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.stop().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_pause(
    manager: State<'_, SchedulerManager>,
    reason: String,
) -> Result<(), String> {
    manager.pause(reason).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_resume(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.resume().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_state(
    manager: State<'_, SchedulerManager>,
) -> Result<SchedulerLifecycleState, String> {
    manager.state().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_enqueue(
    manager: State<'_, SchedulerManager>,
    unit: SchedulingUnitJson,
) -> Result<(), String> {
    manager.enqueue(unit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_tick(
    manager: State<'_, SchedulerManager>,
) -> Result<TickResultJson, String> {
    manager.tick().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_cancel(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
    reason: String,
) -> Result<(), String> {
    manager.cancel(unit_id, reason).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_complete(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<(), String> {
    manager.complete(unit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_fail(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
    error: String,
    category: FailureCategory,
) -> Result<(), String> {
    manager
        .fail(unit_id, error, category)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_unit(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<Option<SchedulingUnitJson>, String> {
    manager.get_unit(unit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_running_units(
    manager: State<'_, SchedulerManager>,
) -> Result<Vec<SchedulingUnitJson>, String> {
    manager.get_running_units().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_queue_snapshot(
    manager: State<'_, SchedulerManager>,
) -> Result<SchedulerQueueSnapshot, String> {
    manager.get_queue_snapshot().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_metrics(
    manager: State<'_, SchedulerManager>,
) -> Result<SchedulerMetrics, String> {
    manager.get_metrics().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_dead_queue(
    manager: State<'_, SchedulerManager>,
) -> Result<Vec<DeadEntry>, String> {
    manager.get_dead_queue().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_rate_limit_state(
    manager: State<'_, SchedulerManager>,
) -> Result<(TokenBucketState, Option<TokenBucketState>), String> {
    manager.get_rate_limit_state().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_budget_info(
    manager: State<'_, SchedulerManager>,
) -> Result<BudgetInfo, String> {
    manager.get_budget_info().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_get_concurrency_info(
    manager: State<'_, SchedulerManager>,
) -> Result<ConcurrencyInfo, String> {
    manager.get_concurrency_info().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_dead_queue_get(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<Option<DeadEntry>, String> {
    manager.dead_queue_get(unit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_dead_queue_remove(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<Option<DeadEntry>, String> {
    manager.dead_queue_remove(unit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_dead_queue_len(
    manager: State<'_, SchedulerManager>,
) -> Result<usize, String> {
    manager.dead_queue_len().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_dead_queue_clear(
    manager: State<'_, SchedulerManager>,
) -> Result<(), String> {
    manager.dead_queue_clear().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_dead_queue_get_by_category(
    manager: State<'_, SchedulerManager>,
    category: FailureCategory,
) -> Result<Vec<DeadEntry>, String> {
    manager
        .dead_queue_get_by_category(category)
        .map_err(|e| e.to_string())
}

// --- Fairness subsystem commands ---

#[tauri::command]
pub fn scheduler_fairness_group_count(
    manager: State<'_, SchedulerManager>,
    group: String,
) -> Result<u32, String> {
    manager.fairness_group_count(group).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_fairness_workspace_count(
    manager: State<'_, SchedulerManager>,
    workspace_id: String,
) -> Result<u32, String> {
    manager.fairness_workspace_count(workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_fairness_reset(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.fairness_reset().map_err(|e| e.to_string())
}

// --- Budget subsystem commands ---

#[tauri::command]
pub fn scheduler_budget_reset(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.budget_reset().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_budget_clear_breach(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.budget_clear_breach().map_err(|e| e.to_string())
}

// --- Concurrency subsystem commands ---

#[tauri::command]
pub fn scheduler_concurrency_is_running(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<bool, String> {
    manager.concurrency_is_running(unit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_concurrency_get_kind(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<Option<String>, String> {
    manager.concurrency_get_kind(unit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_concurrency_reset(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.concurrency_reset().map_err(|e| e.to_string())
}

// --- Metrics subsystem commands ---

#[tauri::command]
pub fn scheduler_metrics_reset(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.metrics_reset().map_err(|e| e.to_string())
}

// --- Rate limiter subsystem commands ---

#[tauri::command]
pub fn scheduler_rate_limiter_reset(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.rate_limiter_reset().map_err(|e| e.to_string())
}

// --- Retry queue subsystem commands ---

#[tauri::command]
pub fn scheduler_retry_len(manager: State<'_, SchedulerManager>) -> Result<usize, String> {
    manager.retry_len().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_retry_clear(manager: State<'_, SchedulerManager>) -> Result<(), String> {
    manager.retry_clear().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_dead_queue_contains(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<bool, String> {
    manager.dead_queue_contains(unit_id).map_err(|e| e.to_string())
}

// --- Budget subsystem (additional) ---

#[tauri::command]
pub fn scheduler_budget_get_reservation(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
) -> Result<Option<serde_json::Value>, String> {
    manager.budget_get_reservation_json(unit_id).map_err(|e| e.to_string())
}

// --- Concurrency subsystem (additional) ---

#[tauri::command]
pub fn scheduler_concurrency_running_count_direct(
    manager: State<'_, SchedulerManager>,
) -> Result<usize, String> {
    manager.concurrency_running_count_direct().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_concurrency_get_kind_count(
    manager: State<'_, SchedulerManager>,
    kind: SchedulingUnitKind,
) -> Result<usize, String> {
    manager.concurrency_get_kind_count(kind).map_err(|e| e.to_string())
}

// --- Retry queue subsystem (additional) ---

#[tauri::command]
pub fn scheduler_retry_is_eligible(
    manager: State<'_, SchedulerManager>,
    unit_id: String,
    now: u64,
) -> Result<bool, String> {
    manager.retry_is_eligible(unit_id, now).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_retry_get_all(
    manager: State<'_, SchedulerManager>,
) -> Result<Vec<serde_json::Value>, String> {
    let entries = manager.retry_get_all().map_err(|e| e.to_string())?;
    Ok(entries.into_iter().map(|e| serde_json::to_value(e).unwrap_or_default()).collect())
}

// --- Queue subsystem ---

#[tauri::command]
pub fn scheduler_queue_peek(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
) -> Result<Option<SchedulingUnitJson>, String> {
    manager.queue_peek(kind).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_queue_is_empty(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
) -> Result<bool, String> {
    manager.queue_is_empty(kind).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_queue_contains(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
    unit_id: String,
) -> Result<bool, String> {
    manager.queue_contains(kind, unit_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_queue_size(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
) -> Result<usize, String> {
    manager.queue_size(kind).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_queue_clear(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
) -> Result<(), String> {
    manager.queue_clear(kind).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_queue_find_by_kind(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
    unit_kind: SchedulingUnitKind,
) -> Result<Vec<SchedulingUnitJson>, String> {
    manager.queue_find_by_kind(kind, unit_kind).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_queue_find_by_priority(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
    priority: SchedulingPriority,
) -> Result<Vec<SchedulingUnitJson>, String> {
    manager.queue_find_by_priority(kind, priority).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn scheduler_queue_find_highest_priority(
    manager: State<'_, SchedulerManager>,
    kind: QueueKind,
) -> Result<Option<SchedulingUnitJson>, String> {
    manager.queue_find_highest_priority(kind).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires Tauri runtime"]
    fn test_scheduler_commands_exist() {
        assert!(true);
    }
}
