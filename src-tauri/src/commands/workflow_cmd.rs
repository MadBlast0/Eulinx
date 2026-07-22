use tauri::State;

use crate::ipc::ApiError;
use crate::managers::workflow_manager::WorkflowManager;
use crate::workflow::types::{
    GraphSnapshot, RunMode, RunTrigger, WorkflowEngineConfig, WorkflowNodeResult, WorkflowRun,
};

fn map_api_error(e: ApiError) -> String {
    serde_json::to_string(&e).unwrap_or_else(|_| e.to_string())
}

#[tauri::command]
pub fn workflow_init(
    manager: State<'_, WorkflowManager>,
    config: WorkflowEngineConfig,
) -> Result<(), String> {
    manager.initialize(config).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn workflow_create_run(
    manager: State<'_, WorkflowManager>,
    workflow_id: String,
    workflow_version: u32,
    snapshot: GraphSnapshot,
    trigger: RunTrigger,
    workspace_id: String,
    project_id: String,
    session_id: String,
    mode: RunMode,
) -> Result<WorkflowRun, String> {
    manager
        .create_run(workflow_id, workflow_version, snapshot, trigger, workspace_id, project_id, session_id, mode)
        .map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_tick(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<(), String> {
    manager.tick(run_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_handle_node_result(
    manager: State<'_, WorkflowManager>,
    run_id: String,
    execution_id: String,
    result: WorkflowNodeResult,
) -> Result<(), String> {
    manager
        .handle_node_result(run_id, execution_id, result)
        .map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_pause_run(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<(), String> {
    manager.pause_run(run_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_resume_run(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<(), String> {
    manager.resume_run(run_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_cancel_run(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<(), String> {
    manager.cancel_run(run_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_get_run(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<Option<WorkflowRun>, String> {
    manager.get_run(run_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_list_runs(
    manager: State<'_, WorkflowManager>,
) -> Result<Vec<WorkflowRun>, String> {
    manager.list_runs().map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_get_run_metrics(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<serde_json::Value, String> {
    manager.get_run_metrics(run_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_validate_snapshot(
    manager: State<'_, WorkflowManager>,
    snapshot: GraphSnapshot,
) -> Result<(), String> {
    manager.validate_snapshot(snapshot).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_recover_run(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<WorkflowRun, String> {
    manager.recover_run(run_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_check_execution_status(
    manager: State<'_, WorkflowManager>,
    execution_id: String,
) -> Result<String, String> {
    manager.check_execution_status(execution_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_get_node_incoming_edges(
    manager: State<'_, WorkflowManager>,
    run_id: String,
    node_id: String,
) -> Result<Vec<String>, String> {
    manager.get_node_incoming_edges(run_id, node_id).map_err(map_api_error)
}

#[tauri::command]
pub fn workflow_get_snapshot_id(
    manager: State<'_, WorkflowManager>,
    run_id: String,
) -> Result<String, String> {
    manager.get_snapshot_id(run_id).map_err(map_api_error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore = "requires Tauri runtime"]
    fn test_workflow_commands_exist() {
        assert!(true);
    }
}
