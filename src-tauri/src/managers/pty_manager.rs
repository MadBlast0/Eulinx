use std::collections::HashMap;
use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use tauri::{AppHandle, Emitter, Manager};

use crate::commands::pty::PtyState;
use crate::ipc::{ApiError, ApiResult};
use crate::state::AppState;

pub struct PtyManagerImpl {
    app: AppHandle,
    pid_to_id: Mutex<HashMap<u32, String>>,
}

impl PtyManagerImpl {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            pid_to_id: Mutex::new(HashMap::new()),
        }
    }

    /// Spawn a real shell. Returns the PID of the spawned process.
    pub fn spawn(&self, workspace_id: &str, cmd: &str) -> ApiResult<u32> {
        let id = workspace_id.to_string();
        let cmd_str = if cmd.is_empty() {
            None
        } else {
            Some(cmd.to_string())
        };

        let (program, flag) = super::pty_manager::resolve_shell(cmd_str.as_deref());

        let mut command = Command::new(&program);
        if let Some(ref f) = flag {
            command.arg(f);
        }
        command.stdin(Stdio::piped());
        command.stdout(Stdio::piped());
        command.stderr(Stdio::piped());

        let mut child = command.spawn().map_err(|e| ApiError {
            code: "PTY_SPAWN".into(),
            message: format!("spawn failed: {e}"),
            context: None,
        })?;
        let pid = child.id();
        let stdin = child.stdin.take().ok_or_else(|| ApiError {
            code: "PTY_SPAWN".into(),
            message: "no stdin handle".into(),
            context: None,
        })?;

        let app_owned = self.app.clone();

        let out_id = id.clone();
        let out_app = app_owned.clone();
        if let Some(out) = child.stdout.take() {
            std::thread::spawn(move || stream_to_events(out, &out_id, out_app));
        }

        let err_id = id.clone();
        let err_app = app_owned.clone();
        if let Some(err) = child.stderr.take() {
            std::thread::spawn(move || stream_to_events(err, &err_id, err_app));
        }

        let exit_id = id.clone();
        let exit_app = app_owned.clone();
        let pty_state = app_owned.state::<PtyState>();
        pty_state.children.lock().unwrap().insert(
            id.clone(),
            PtyHandle {
                child: Mutex::new(Some(child)),
                stdin: Mutex::new(Some(stdin)),
                cols: Mutex::new((80, 24)),
            },
        );

        let started_at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis().to_string())
            .unwrap_or_default();
        let app_state = self.app.state::<AppState>();
        app_state.pty_sessions.blocking_write().insert(
            id.clone(),
            crate::state::PtySessionState {
                pid,
                started_at,
                cmd: program,
            },
        );

        // Wait for exit — reads the exit code BEFORE the handle is removed.
        std::thread::spawn(move || {
            let code = {
                let state = exit_app.state::<PtyState>();
                let guard = state.children.lock().unwrap();
                if let Some(handle) = guard.get(&exit_id) {
                    if let Some(child) = handle.child.lock().unwrap().as_mut() {
                        child.wait().ok().and_then(|s| s.code())
                    } else {
                        None
                    }
                } else {
                    None
                }
            };
            // Emit the raw exit code number — frontend expects just the number.
            let _ = exit_app.emit(&format!("pty://{exit_id}/exit"), code);
        });

        self.pid_to_id.lock().unwrap().insert(pid, id);
        Ok(pid)
    }

    /// Write input into a process's stdin by PID.
    pub fn write(&self, pid: u32, data: &str) -> ApiResult<()> {
        let id = self
            .pid_to_id
            .lock()
            .unwrap()
            .get(&pid)
            .cloned()
            .ok_or_else(|| ApiError {
                code: "PTY_NOT_FOUND".into(),
                message: format!("no PTY with pid {pid}"),
                context: None,
            })?;

        let state = self.app.state::<PtyState>();
        let guard = state.children.lock().unwrap();
        let handle = guard.get(&id).ok_or_else(|| ApiError {
            code: "PTY_NOT_FOUND".into(),
            message: format!("no PTY with id {id}"),
            context: None,
        })?;
        let mut stdin = handle.stdin.lock().unwrap();
        if let Some(s) = stdin.as_mut() {
            let _ = s.write_all(data.as_bytes());
            let _ = s.flush();
        }
        Ok(())
    }

    /// Resize terminal dimensions by PID.
    pub fn resize(&self, pid: u32, cols: u16, rows: u16) -> ApiResult<()> {
        let id = self
            .pid_to_id
            .lock()
            .unwrap()
            .get(&pid)
            .cloned()
            .ok_or_else(|| ApiError {
                code: "PTY_NOT_FOUND".into(),
                message: format!("no PTY with pid {pid}"),
                context: None,
            })?;

        let state = self.app.state::<PtyState>();
        let guard = state.children.lock().unwrap();
        if let Some(handle) = guard.get(&id) {
            let mut dims = handle.cols.lock().unwrap();
            *dims = (cols as u32, rows as u32);
        }

        let _ = self.app.emit(
            &format!("pty://{id}/resize"),
            super::pty_manager::PtyResizePayload {
                id: id.clone(),
                cols: cols as u32,
                rows: rows as u32,
            },
        );

        Ok(())
    }

    /// Kill a process by PID.
    pub fn kill(&self, pid: u32) -> ApiResult<()> {
        let id = self
            .pid_to_id
            .lock()
            .unwrap()
            .remove(&pid)
            .ok_or_else(|| ApiError {
                code: "PTY_NOT_FOUND".into(),
                message: format!("no PTY with pid {pid}"),
                context: None,
            })?;

        let state = self.app.state::<PtyState>();
        if let Some(handle) = state.children.lock().unwrap().remove(&id) {
            if let Some(mut child) = handle.child.lock().unwrap().take() {
                let _ = child.kill();
            }
        }
        let app_state = self.app.state::<AppState>();
        app_state.pty_sessions.blocking_write().remove(&id);
        Ok(())
    }
}

/// Resolve the default shell for the current OS.
pub(crate) fn resolve_shell(shell: Option<&str>) -> (String, Option<String>) {
    match shell {
        Some(s) if !s.trim().is_empty() => {
            (s.trim().to_string(), Some("-i".to_string()))
        }
        _ => {
            if cfg!(windows) {
                // cmd.exe without /C — interactive session, stays alive
                ("cmd.exe".to_string(), None)
            } else if let Ok(sh) = std::env::var("SHELL") {
                (sh, Some("-i".to_string()))
            } else {
                ("/bin/sh".to_string(), Some("-i".to_string()))
            }
        }
    }
}

pub(crate) struct PtyHandle {
    pub child: Mutex<Option<Child>>,
    pub stdin: Mutex<Option<std::process::ChildStdin>>,
    pub cols: Mutex<(u32, u32)>,
}

#[derive(Clone, serde::Serialize)]
pub(crate) struct PtyResizePayload {
    pub id: String,
    pub cols: u32,
    pub rows: u32,
}

fn stream_to_events<R: std::io::Read>(mut reader: R, id: &str, app: AppHandle) {
    let mut buf = [0u8; 4096];
    loop {
        match reader.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                let _ = app.emit(
                    &format!("pty://{id}/data"),
                    super::pty_manager::PtyData {
                        id: id.to_string(),
                        chunk,
                    },
                );
            }
            Err(_) => break,
        }
    }
}

#[derive(Clone, serde::Serialize)]
struct PtyData {
    id: String,
    chunk: String,
}
