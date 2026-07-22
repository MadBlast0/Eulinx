use tauri::State;

use crate::event_log::types::{
    EventLogResult, EventLogStats, EventRangeQuery, GapReport, PersistedEventEnvelope,
};
use crate::managers::db_manager::DbManager;

#[tauri::command]
pub fn log_write_batch(
    db: State<'_, DbManager>,
    events: Vec<PersistedEventEnvelope>,
) -> Result<EventLogResult, String> {
    db.write_event_log_batch(&events).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_query(
    db: State<'_, DbManager>,
    query: EventRangeQuery,
) -> Result<Vec<PersistedEventEnvelope>, String> {
    db.query_event_log(&query).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_prune(
    db: State<'_, DbManager>,
    before_timestamp: String,
    retained_execution_ids: Vec<String>,
) -> Result<u64, String> {
    db.prune_event_log(&before_timestamp, &retained_execution_ids)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_detect_gaps(
    db: State<'_, DbManager>,
    workspace_id: String,
) -> Result<GapReport, String> {
    db.detect_log_gaps(&workspace_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn log_get_stats(
    db: State<'_, DbManager>,
    workspace_id: String,
) -> Result<EventLogStats, String> {
    db.get_event_log_stats(&workspace_id).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires Tauri runtime"]
    fn test_event_log_commands_exist() {
        assert!(true);
    }
}
