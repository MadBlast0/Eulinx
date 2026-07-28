use serde::{Deserialize, Serialize};

/// Console log level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ConsoleLevel {
    Log,
    Warning,
    Error,
    Info,
    Debug,
}

/// Console log entry from CDP Runtime.consoleAPICalled
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleLog {
    pub level: ConsoleLevel,
    pub text: String,
    pub url: Option<String>,
    pub line: Option<i32>,
    pub column: Option<i32>,
    pub timestamp: f64,
    pub args: Vec<serde_json::Value>,
}

/// JavaScript error from CDP Runtime.exceptionThrown
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsError {
    pub message: String,
    pub url: Option<String>,
    pub line: Option<i32>,
    pub column: Option<i32>,
    pub stack_trace: Option<String>,
    pub timestamp: f64,
}

/// Network request from CDP Network
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkRequest {
    pub request_id: String,
    pub url: String,
    pub method: String,
    pub status: Option<i32>,
    pub mime_type: Option<String>,
    pub error: Option<String>,
    pub timestamp: f64,
}

/// Browser state snapshot
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BrowserSnapshot {
    pub url: String,
    pub title: String,
    pub console_logs: Vec<ConsoleLog>,
    pub errors: Vec<JsError>,
    pub network_requests: Vec<NetworkRequest>,
}

/// Browser event for real-time updates
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(tag = "type")]
pub enum BrowserEvent {
    ConsoleLogAdded { log: ConsoleLog },
    ErrorAdded { error: JsError },
    NetworkRequestAdded { request: NetworkRequest },
    UrlChanged { url: String },
}

/// CDP method request
#[derive(Debug, Clone, Serialize)]
pub struct CdpRequest {
    pub id: u64,
    pub method: String,
    pub params: serde_json::Value,
}

/// CDP method response
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct CdpResponse {
    pub id: u64,
    #[serde(default)]
    pub result: Option<serde_json::Value>,
    #[serde(default)]
    pub error: Option<CdpError>,
}

/// CDP error response
#[derive(Debug, Clone, Deserialize)]
#[allow(dead_code)]
pub struct CdpError {
    pub code: i32,
    pub message: String,
}

/// CDP event notification
#[derive(Debug, Clone, Deserialize)]
pub struct CdpEvent {
    pub method: String,
    pub params: serde_json::Value,
}

/// CDP WebSocket target info
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct CdpTarget {
    pub description: String,
    pub dev_tools_frontend_url: String,
    pub id: String,
    pub title: String,
    #[serde(rename = "type")]
    pub target_type: String,
    pub url: String,
    pub web_socket_debugger_url: String,
}
