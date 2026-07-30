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
    pub fn spawn(&self, workspace_id: &str, cmd: &str, cols: Option<u16>, rows: Option<u16>) -> ApiResult<u32> {
        let id = workspace_id.to_string();
        let cmd_str = if cmd.is_empty() {
            None
        } else {
            Some(cmd.to_string())
        };

        let (program, flag) = resolve_shell(cmd_str.as_deref());

        // Resolve the shell to an absolute path via PATH so validation works
        // even when the CWD is not in PATH (common on Windows where cmd.exe
        // lives in System32 but the app CWD is its install directory).
        let resolved = resolve_program_path(&program);

        // Validate shell path exists and is executable
        let shell_path = std::path::Path::new(&resolved);
        if !shell_path.exists() {
            return Err(ApiError {
                code: "PTY_SHELL_NOT_FOUND".into(),
                message: format!("Shell not found: {}. Please check the shell path.", program),
                context: Some(serde_json::json!(format!("Attempted to spawn: {}, resolved: {}", program, resolved))),
            });
        }

        // Check if it's a file (not a directory)
        let metadata = std::fs::metadata(shell_path).map_err(|e| ApiError {
            code: "PTY_SHELL_METADATA".into(),
            message: format!("Cannot read shell metadata: {}", e),
            context: Some(serde_json::json!(resolved.clone())),
        })?;

        if !metadata.is_file() {
            return Err(ApiError {
                code: "PTY_SHELL_INVALID".into(),
                message: format!("Shell path is not a file: {}", resolved),
                context: None,
            });
        }

        // On Unix, check if executable
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let permissions = metadata.permissions();
            let mode = permissions.mode();
            // Check if any execute bit is set (owner, group, or other)
            if mode & 0o111 == 0 {
                return Err(ApiError {
                    code: "PTY_SHELL_NOT_EXECUTABLE".into(),
                    message: format!("Shell is not executable: {}", resolved),
                    context: Some(serde_json::json!(format!("Mode: {:o}", mode))),
                });
            }
        }

        // Create a platform-native PTY pair (ConPTY on Windows, forkpty on Unix)
        let pty_system = portable_pty::native_pty_system();
        
        // Use provided dimensions or sensible defaults
        let cols = cols.unwrap_or(100);
        let rows = rows.unwrap_or(30);
        
        let size = PtySize {
            rows,
            cols,
            pixel_width: ((cols as u32) * 8) as u16,  // Approximate pixel width
            pixel_height: ((rows as u32) * 16) as u16, // Approximate pixel height
        };
        let pair = pty_system.openpty(size).map_err(|e| ApiError {
            code: "PTY_SPAWN".into(),
            message: format!("failed to create PTY: {e}"),
            context: None,
        })?;

        let mut cmd_builder = CommandBuilder::new(&resolved);
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
                cmd: resolved,
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

/// Resolve the default shell for the current OS, trying multiple fallbacks.
pub(crate) fn resolve_shell(shell: Option<&str>) -> (String, Option<String>) {
    match shell {
        Some(s) if !s.trim().is_empty() => {
            (s.trim().to_string(), Some("-i".to_string()))
        }
        _ => {
            if cfg!(windows) {
                // Windows: cmd.exe is always available
                ("cmd.exe".to_string(), None)
            } else {
                // Unix: try multiple shells in order of preference
                if let Ok(sh) = std::env::var("SHELL") {
                    if !sh.trim().is_empty() {
                        return (sh, Some("-i".to_string()));
                    }
                }
                
                // Try common shells in order
                let shell_candidates = [
                    "/bin/bash",
                    "/usr/bin/bash",
                    "/bin/zsh",
                    "/usr/bin/zsh",
                    "/bin/sh",
                    "/usr/bin/sh",
                    "/bin/ash",
                    "/usr/bin/ash",
                ];
                
                for candidate in &shell_candidates {
                    if std::path::Path::new(candidate).exists() {
                        return (candidate.to_string(), Some("-i".to_string()));
                    }
                }
                
                // Last resort: assume /bin/sh exists (POSIX requirement)
                ("/bin/sh".to_string(), Some("-i".to_string()))
            }
        }
    }
}

/// Resolve a program name to an absolute path by searching PATH.
/// If the program already contains a path separator or is an absolute path,
/// it is returned as-is. Otherwise, each PATH entry is checked.
fn resolve_program_path(program: &str) -> String {
    let p = std::path::Path::new(program);
    if p.is_absolute() || program.contains('/') || (cfg!(windows) && program.contains('\\')) {
        return program.to_string();
    }
    if let Ok(path_env) = std::env::var("PATH") {
        let separator = if cfg!(windows) { ';' } else { ':' };
        for dir in path_env.split(separator) {
            let candidate = std::path::Path::new(dir).join(program);
            if candidate.exists() {
                return candidate.to_string_lossy().into_owned();
            }
        }
    }
    // Return original — validation will fail with a clear error
    program.to_string()
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
