use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use portable_pty::{CommandBuilder, MasterPty, PtySize};
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

    /// Spawn a real shell in a PTY. Returns the PID of the spawned process.
    pub fn spawn(&self, workspace_id: &str, cmd: &str) -> ApiResult<u32> {
        let id = workspace_id.to_string();
        let cmd_str = if cmd.is_empty() {
            None
        } else {
            Some(cmd.to_string())
        };

        let (program, flag) = resolve_shell(cmd_str.as_deref());

        // Create a platform-native PTY pair (ConPTY on Windows, forkpty on Unix)
        let pty_system = portable_pty::native_pty_system();
        let size = PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 640,
            pixel_height: 480,
        };
        let pair = pty_system.openpty(size).map_err(|e| ApiError {
            code: "PTY_SPAWN".into(),
            message: format!("failed to create PTY: {e}"),
            context: None,
        })?;

        let mut cmd_builder = CommandBuilder::new(&program);
        if let Some(ref f) = flag {
            cmd_builder.arg(f);
        }
        cmd_builder.env("TERM", "xterm-256color");

        let child = pair.slave.spawn_command(cmd_builder).map_err(|e| ApiError {
            code: "PTY_SPAWN".into(),
            message: format!("spawn failed: {e}"),
            context: None,
        })?;

        let pid = child.process_id().unwrap_or(0);
        let writer = pair.master.take_writer().map_err(|_| ApiError {
            code: "PTY_SPAWN".into(),
            message: "failed to take PTY writer".into(),
            context: None,
        })?;
        let reader = pair.master.try_clone_reader().map_err(|_| ApiError {
            code: "PTY_SPAWN".into(),
            message: "failed to clone PTY reader".into(),
            context: None,
        })?;

        // Reader thread — reads PTY output and emits data events
        let read_id = id.clone();
        let read_app = self.app.clone();
        std::thread::spawn(move || stream_to_events(reader, &read_id, read_app));

        // Store handle before starting the exit thread
        let pty_state = self.app.state::<PtyState>();
        pty_state.children.lock().unwrap().insert(
            id.clone(),
            PtyHandle {
                child: Mutex::new(Some(child)),
                writer: Mutex::new(Some(writer)),
                master: Mutex::new(Some(pair.master)),
                cols: Mutex::new((80, 24)),
            },
        );

        // Record session info
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

        // Exit thread — takes child from handle then waits (no lock held during wait)
        let exit_id = id.clone();
        let exit_app = self.app.clone();
        std::thread::spawn(move || {
            let child = {
                let state = exit_app.state::<PtyState>();
                let guard = state.children.lock().unwrap();
                guard.get(&exit_id).and_then(|h| h.child.lock().unwrap().take())
            };
            let code: Option<u32> = child.and_then(|mut c| c.wait().ok().map(|s| s.exit_code()));
            let _ = exit_app.emit(&format!("pty://{exit_id}/exit"), code);
        });

        self.pid_to_id.lock().unwrap().insert(pid, id);
        Ok(pid)
    }

    /// Write input into a process's PTY master by PID.
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
        let mut writer = handle.writer.lock().unwrap();
        if let Some(w) = writer.as_mut() {
            let _ = w.write_all(data.as_bytes());
            let _ = w.flush();
        }
        Ok(())
    }

    /// Resize terminal dimensions by PID. Also resizes the PTY.
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
            *handle.cols.lock().unwrap() = (cols as u32, rows as u32);
            if let Some(master) = handle.master.lock().unwrap().as_mut() {
                let size = PtySize {
                    rows,
                    cols,
                    pixel_width: 0,
                    pixel_height: 0,
                };
                let _ = master.resize(size);
            }
        }

        let _ = self.app.emit(
            &format!("pty://{id}/resize"),
            PtyResizePayload {
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
    pub child: Mutex<Option<Box<dyn portable_pty::Child + Send + Sync>>>,
    pub writer: Mutex<Option<Box<dyn Write + Send>>>,
    pub master: Mutex<Option<Box<dyn MasterPty + Send>>>,
    pub cols: Mutex<(u32, u32)>,
}

#[derive(Clone, serde::Serialize)]
pub(crate) struct PtyResizePayload {
    pub id: String,
    pub cols: u32,
    pub rows: u32,
}

fn stream_to_events<R: Read + Send + 'static>(reader: R, id: &str, app: AppHandle) {
    let mut reader = reader;
    let mut buf = [0u8; 4096];
    let event = format!("pty://{id}/data");
    loop {
        match reader.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => {
                let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                let _ = app.emit(&event, chunk);
            }
            Err(_) => break,
        }
    }
}
