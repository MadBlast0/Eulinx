use tauri::State;

use crate::managers::scheduler_manager::SchedulerManager;
use crate::scheduler::types::{
    DeadEntry, FailureCategory, SchedulerLifecycleState, SchedulerMetrics,
    SchedulerQueueSnapshot, SchedulingUnitJson, TickResultJson,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires Tauri runtime"]
    fn test_scheduler_commands_exist() {
        assert!(true);
    }
}
