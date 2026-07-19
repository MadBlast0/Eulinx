use std::sync::Arc;

use tokio::sync::RwLock;

/// Placeholder until `notify` is added to Cargo.toml.
type WatcherHandle = Vec<u8>;

/// Application-wide shared state held by the Tauri managed state.
pub struct AppState {
    /// Monotonically increasing event sequence counter.
    pub event_seq: Arc<RwLock<u64>>,
    /// Active PTY sessions keyed by workspace_id.
    pub pty_sessions: Arc<RwLock<std::collections::HashMap<String, PtySessionState>>>,
    /// Filesystem watchers keyed by workspace_id.
    pub fs_watchers: Arc<RwLock<std::collections::HashMap<String, WatcherHandle>>>,
    /// Whether the app was launched in Tauri or browser mode.
    pub is_native: bool,
}

pub struct PtySessionState {
    pub pid: u32,
    pub started_at: String,
    pub cmd: String,
}

impl AppState {
    pub fn new(is_native: bool) -> Self {
        Self {
            event_seq: Arc::new(RwLock::new(0)),
            pty_sessions: Arc::new(RwLock::new(std::collections::HashMap::new())),
            fs_watchers: Arc::new(RwLock::new(std::collections::HashMap::new())),
            is_native,
        }
    }
}
