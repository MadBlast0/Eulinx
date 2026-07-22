use std::sync::Mutex;

use tauri::{AppHandle, Emitter};

use crate::error::AppError;
use crate::ipc::{ApiError, ApiResult};
use crate::workflow::engine::{
    ExecutionEngineAdapter, PersistenceAdapter, SchedulerAdapter, WorkflowEngine,
};
use crate::workflow::types::{
    AdmissionRequest, AdmissionResponse, ExecutionRequest, GraphSnapshot, NodeRuntimeState,
    RunMode, RunTrigger, WorkflowEngineConfig, WorkflowError, WorkflowNodeResult, WorkflowRun,
};

pub struct WorkflowManager {
    engine: Mutex<Option<WorkflowEngine>>,
    app: AppHandle,
}

impl WorkflowManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            engine: Mutex::new(None),
            app,
        }
    }

    pub fn initialize(&self, config: WorkflowEngineConfig) -> Result<(), AppError> {
        let mut guard = self.engine.lock().unwrap();

        let app = self.app.clone();
        let engine = WorkflowEngine::new(
            config,
            Box::new(StubPersistenceAdapter),
            Box::new(StubSchedulerAdapter),
            Box::new(StubExecutionEngineAdapter),
            Box::new(move |event, payload| {
                let _ = app.emit(&format!("workflow://{event}"), payload);
            }),
        );

        *guard = Some(engine);
        Ok(())
    }

    fn with_engine<F, T>(&self, f: F) -> Result<T, AppError>
    where
        F: FnOnce(&mut WorkflowEngine) -> Result<T, WorkflowError>,
    {
        let mut guard = self.engine.lock().unwrap();
        let engine = guard
            .as_mut()
            .ok_or_else(|| AppError::NotFound("workflow engine not initialized".into()))?;
        f(engine).map_err(|e| AppError::Internal(e.to_string()))
    }

    fn map_err<T>(result: Result<T, AppError>) -> ApiResult<T> {
        result.map_err(|e| ApiError {
            code: match &e {
                AppError::NotFound(_) => "WORKFLOW_NOT_FOUND".into(),
                AppError::InvalidInput(_) => "WORKFLOW_INVALID_INPUT".into(),
                AppError::Internal(_) => "WORKFLOW_INTERNAL".into(),
            },
            message: e.to_string(),
            context: None,
        })
    }

    pub fn create_run(
        &self,
        workflow_id: String,
        workflow_version: u32,
        snapshot: GraphSnapshot,
        trigger: RunTrigger,
        workspace_id: String,
        project_id: String,
        session_id: String,
        mode: RunMode,
    ) -> ApiResult<WorkflowRun> {
        Self::map_err(self.with_engine(|engine| {
            engine.create_run(
                workflow_id,
                workflow_version,
                snapshot,
                trigger,
                workspace_id,
                project_id,
                session_id,
                mode,
            )
        }))
    }

    pub fn tick(&self, run_id: String) -> ApiResult<()> {
        Self::map_err(self.with_engine(|engine| engine.tick(&run_id)))?;
        let _ = self.app.emit("workflow://tick", serde_json::json!({ "run_id": run_id }));
        Ok(())
    }

    pub fn handle_node_result(
        &self,
        run_id: String,
        execution_id: String,
        result: WorkflowNodeResult,
    ) -> ApiResult<()> {
        let result = Self::map_err(self.with_engine(|engine| {
            engine.handle_node_result(&run_id, &execution_id, &result)
        }))?;
        let _ = self.app.emit(
            "workflow://node-result",
            serde_json::json!({ "run_id": run_id, "execution_id": execution_id }),
        );
        Ok(result)
    }

    pub fn pause_run(&self, run_id: String) -> ApiResult<()> {
        let result = Self::map_err(self.with_engine(|engine| engine.pause_run(&run_id)))?;
        let _ = self.app.emit("workflow://paused", serde_json::json!({ "run_id": run_id }));
        Ok(result)
    }

    pub fn resume_run(&self, run_id: String) -> ApiResult<()> {
        let result = Self::map_err(self.with_engine(|engine| engine.resume_run(&run_id)))?;
        let _ = self.app.emit("workflow://resumed", serde_json::json!({ "run_id": run_id }));
        Ok(result)
    }

    pub fn cancel_run(&self, run_id: String) -> ApiResult<()> {
        let result = Self::map_err(self.with_engine(|engine| engine.cancel_run(&run_id)))?;
        let _ = self.app.emit("workflow://cancelled", serde_json::json!({ "run_id": run_id }));
        Ok(result)
    }

    pub fn get_run(&self, run_id: String) -> ApiResult<Option<WorkflowRun>> {
        Self::map_err(self.with_engine(|engine| engine.get_run(&run_id)))
    }

    pub fn list_runs(&self) -> ApiResult<Vec<WorkflowRun>> {
        Self::map_err(self.with_engine(|engine| engine.list_runs()))
    }

    pub fn get_run_metrics(&self, run_id: String) -> ApiResult<serde_json::Value> {
        Self::map_err(self.with_engine(|engine| engine.get_run_metrics(&run_id)))
    }

    pub fn validate_snapshot(&self, snapshot: GraphSnapshot) -> ApiResult<()> {
        Self::map_err(self.with_engine(|engine| engine.validate_snapshot(snapshot)))
    }

    pub fn recover_run(&self, run_id: String) -> ApiResult<WorkflowRun> {
        Self::map_err(self.with_engine(|engine| engine.recover_run(&run_id)))
    }

    pub fn check_execution_status(&self, execution_id: String) -> ApiResult<String> {
        Self::map_err(self.with_engine(|engine| engine.check_execution_status(&execution_id)))
    }

    pub fn get_node_incoming_edges(
        &self,
        run_id: String,
        node_id: String,
    ) -> ApiResult<Vec<String>> {
        Self::map_err(self.with_engine(|engine| engine.get_node_incoming_edges(&run_id, &node_id)))
    }

    pub fn get_snapshot_id(&self, run_id: String) -> ApiResult<String> {
        Self::map_err(self.with_engine(|engine| engine.get_snapshot_id(&run_id)))
    }
}

// ---------------------------------------------------------------------------
// Stub adapters — replaced with real implementations once the backing services
// (PersistenceAdapter, SchedulerAdapter, ExecutionEngineAdapter) are wired.
// ---------------------------------------------------------------------------

struct StubPersistenceAdapter;

impl PersistenceAdapter for StubPersistenceAdapter {
    fn save_run(&self, _run: &WorkflowRun) -> Result<(), String> {
        Ok(())
    }

    fn load_run(&self, _run_id: &str) -> Result<Option<WorkflowRun>, String> {
        Ok(None)
    }

    fn load_snapshot(&self, _snapshot_id: &str) -> Result<Option<GraphSnapshot>, String> {
        Ok(None)
    }

    fn save_node_state(&self, _state: &NodeRuntimeState) -> Result<(), String> {
        Ok(())
    }

    fn load_node_states(&self, _run_id: &str) -> Result<Vec<NodeRuntimeState>, String> {
        Ok(Vec::new())
    }
}

struct StubSchedulerAdapter;

impl SchedulerAdapter for StubSchedulerAdapter {
    fn admit(&self, _request: &AdmissionRequest) -> Result<AdmissionResponse, String> {
        Ok(AdmissionResponse {
            admitted: _request.candidates.iter().map(|c| c.node_id.clone()).collect(),
            deferred: vec![],
            rejected: vec![],
        })
    }
}

struct StubExecutionEngineAdapter;

impl ExecutionEngineAdapter for StubExecutionEngineAdapter {
    fn execute(&self, _request: &ExecutionRequest) -> Result<WorkflowNodeResult, String> {
        Err("stub: execution engine not connected".to_string())
    }

    fn status(&self, _execution_id: &str) -> Result<String, String> {
        Ok("unknown".to_string())
    }

    fn cancel(&self, _execution_id: &str) -> Result<(), String> {
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    fn mock_app_handle() -> AppHandle {
        tauri::test::mock_app(tauri::test::MockAppBuilder::new().build()).handle()
    }

    #[test]
    fn test_new_returns_uninitialized() {
        let app = mock_app_handle();
        let manager = WorkflowManager::new(app);
        assert!(manager.engine.lock().unwrap().is_none());
    }

    #[test]
    fn test_initialize_sets_engine() {
        let app = mock_app_handle();
        let manager = WorkflowManager::new(app);

        let config = WorkflowEngineConfig::default();
        manager.initialize(config).unwrap();

        assert!(manager.engine.lock().unwrap().is_some());
    }

    #[test]
    fn test_methods_return_error_when_uninitialized() {
        let app = mock_app_handle();
        let manager = WorkflowManager::new(app);

        let result = manager.tick("run-1".into());
        assert!(result.is_err());
        assert_eq!(result.unwrap_err().code, "WORKFLOW_NOT_FOUND");
    }

    #[test]
    fn test_double_initialize_replaces_engine() {
        let app = mock_app_handle();
        let manager = WorkflowManager::new(app);

        let config = WorkflowEngineConfig::default();
        manager.initialize(config).unwrap();
        manager.initialize(WorkflowEngineConfig::default()).unwrap();

        assert!(manager.engine.lock().unwrap().is_some());
    }

    #[test]
    fn test_map_err_not_found() {
        let err: Result<(), AppError> = Err(AppError::NotFound("test".into()));
        let api_err = WorkflowManager::map_err(err).unwrap_err();
        assert_eq!(api_err.code, "WORKFLOW_NOT_FOUND");
    }

    #[test]
    fn test_map_err_invalid_input() {
        let err: Result<(), AppError> = Err(AppError::InvalidInput("test".into()));
        let api_err = WorkflowManager::map_err(err).unwrap_err();
        assert_eq!(api_err.code, "WORKFLOW_INVALID_INPUT");
    }

    #[test]
    fn test_map_err_internal() {
        let err: Result<(), AppError> = Err(AppError::Internal("test".into()));
        let api_err = WorkflowManager::map_err(err).unwrap_err();
        assert_eq!(api_err.code, "WORKFLOW_INTERNAL");
    }

    #[test]
    fn test_map_err_ok_passthrough() {
        let ok: Result<i32, AppError> = Ok(42);
        let mapped = WorkflowManager::map_err(ok).unwrap();
        assert_eq!(mapped, 42);
    }

    #[test]
    fn test_pause_resume_cancel_return_error_when_uninitialized() {
        let app = mock_app_handle();
        let manager = WorkflowManager::new(app);

        assert!(manager.pause_run("r1".into()).is_err());
        assert!(manager.resume_run("r1".into()).is_err());
        assert!(manager.cancel_run("r1".into()).is_err());
    }
}
