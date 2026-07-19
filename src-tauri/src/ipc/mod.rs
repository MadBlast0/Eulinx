use serde::{Deserialize, Serialize};

/// Standard API error envelope returned by all commands.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub context: Option<serde_json::Value>,
}

impl std::fmt::Display for ApiError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "[{}] {}", self.code, self.message)
    }
}

impl std::error::Error for ApiError {}

/// Generic result wrapper for IPC responses.
pub type ApiResult<T> = Result<T, ApiError>;

/// Request to write an event to the event log.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventLogWriteRequest {
    pub event_type: String,
    pub workspace_id: String,
    pub payload: serde_json::Value,
    pub sequence: u64,
    pub timestamp: String,
}

/// File system entry returned by list_dir.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FsEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

/// Git status result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitStatus {
    pub branch: String,
    pub changes: Vec<GitChange>,
    pub ahead: u32,
    pub behind: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitChange {
    pub path: String,
    pub status: String,
}
