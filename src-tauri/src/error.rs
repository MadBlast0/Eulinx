use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
pub enum AppError {
    #[error("Internal error: {0}")]
    Internal(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

impl From<AppError> for tauri::ipc::Response {
    fn from(error: AppError) -> Self {
        tauri::ipc::Response::new(serde_json::to_string(&error).unwrap_or_default())
    }
}
