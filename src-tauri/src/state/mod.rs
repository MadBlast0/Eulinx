use std::path::Path;
use std::sync::mpsc;
use std::sync::Arc;

use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use tauri::Emitter;
use tokio::sync::RwLock;

/// A filesystem watcher entry that monitors a path for changes and emits
/// Tauri events when files are created, modified, or deleted.
pub struct FsWatcherEntry {
    pub path: String,
    watcher: Option<RecommendedWatcher>,
    event_thread: Option<std::thread::JoinHandle<()>>,
}

impl FsWatcherEntry {
    pub fn new(path: String, app: tauri::AppHandle) -> Result<Self, String> {
        let (tx, rx) = mpsc::channel::<Result<Event, notify::Error>>();

        let mut watcher = RecommendedWatcher::new(
            move |event: Result<Event, notify::Error>| {
                let _ = tx.send(event);
            },
            Config::default(),
        )
        .map_err(|e| format!("failed to create watcher: {e}"))?;

        watcher
            .watch(Path::new(&path), RecursiveMode::Recursive)
            .map_err(|e| format!("failed to watch path '{path}': {e}"))?;

        let app_clone = app.clone();
        let path_clone = path.clone();
        let event_thread = std::thread::spawn(move || {
            while let Ok(event) = rx.recv() {
                match event {
                    Ok(event) => {
                        let _ = app_clone.emit(
                            "fs://watcher-event",
                            serde_json::json!({
                                "path": path_clone,
                                "kind": format!("{:?}", event.kind),
                                "paths": event.paths.iter().map(|p| p.to_string_lossy().to_string()).collect::<Vec<_>>(),
                            }),
                        );
                    }
                    Err(e) => {
                        let _ = app_clone.emit(
                            "fs://watcher-error",
                            serde_json::json!({
                                "path": path_clone,
                                "error": e.to_string(),
                            }),
                        );
                    }
                }
            }
        });

        Ok(Self {
            path,
            watcher: Some(watcher),
            event_thread: Some(event_thread),
        })
    }
}

impl Drop for FsWatcherEntry {
    fn drop(&mut self) {
        self.watcher.take();
        if let Some(thread) = self.event_thread.take() {
            let _ = thread.join();
        }
    }
}

/// Application-wide shared state held by the Tauri managed state.
pub struct AppState {
    /// Monotonically increasing event sequence counter.
    pub event_seq: Arc<RwLock<u64>>,
    /// Active PTY sessions keyed by workspace_id.
    pub pty_sessions: Arc<RwLock<std::collections::HashMap<String, PtySessionState>>>,
    /// Filesystem watchers keyed by a unique watcher id.
    pub fs_watchers: Arc<RwLock<std::collections::HashMap<String, FsWatcherEntry>>>,
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

    /// Start watching a filesystem path. Returns a unique watcher id that can
    /// be passed to `unwatch_path`. Emits `fs://watcher-event` on changes.
    pub async fn watch_path(&self, path: String, app: tauri::AppHandle) -> Result<String, String> {
        let id = uuid::Uuid::new_v4().to_string();
        let entry = FsWatcherEntry::new(path, app)?;
        self.fs_watchers.write().await.insert(id.clone(), entry);
        Ok(id)
    }

    /// Stop watching a previously registered path.
    pub async fn unwatch_path(&self, id: &str) -> Result<(), String> {
        self.fs_watchers
            .write()
            .await
            .remove(id)
            .ok_or_else(|| format!("watcher '{id}' not found"))?;
        Ok(())
    }

    /// List all active watchers with their paths.
    pub async fn list_watchers(&self) -> Vec<(String, String)> {
        self.fs_watchers
            .read()
            .await
            .iter()
            .map(|(id, entry)| (id.clone(), entry.path.clone()))
            .collect()
    }
}
