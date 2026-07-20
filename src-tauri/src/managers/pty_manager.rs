use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{AppHandle, Manager};

use crate::commands::pty::PtyState;
use crate::ipc::{ApiError, ApiResult};
use crate::managers::PtyManager;
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
}

impl PtyManager for PtyManagerImpl {
    fn spawn(&self, workspace_id: &str, cmd: &str) -> ApiResult<u32> {
        let id = workspace_id.to_string();
        let cmd_str = if cmd.is_empty() { None } else { Some(cmd.to_string()) };

        let handle = self.app.clone();
        let handle2 = handle.clone();
        let app_state = handle2.state::<AppState>();
        crate::commands::pty::pty_spawn(handle, app_state, id.clone(), cmd_str)
            .map_err(|e| ApiError { code: "PTY_SPAWN".into(), message: e, context: None })?;

        let state = self.app.state::<PtyState>();
        let pid = state
            .children
            .lock()
            .unwrap()
            .get(&id)
            .and_then(|h| h.child.lock().unwrap().as_ref().map(|c| c.id()))
            .ok_or_else(|| ApiError {
                code: "PTY_PID".into(),
                message: "could not get PID for spawned process".into(),
                context: None,
            })?;

        self.pid_to_id.lock().unwrap().insert(pid, id);
        Ok(pid)
    }

    fn write(&self, pid: u32, data: &str) -> ApiResult<()> {
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

        crate::commands::pty::pty_write(self.app.clone(), id, data.to_string())
            .map_err(|e| ApiError { code: "PTY_WRITE".into(), message: e, context: None })
    }

    fn resize(&self, pid: u32, cols: u16, rows: u16) -> ApiResult<()> {
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

        crate::commands::pty::pty_resize(self.app.clone(), id, cols as u32, rows as u32)
            .map_err(|e| ApiError { code: "PTY_RESIZE".into(), message: e, context: None })
    }

    fn kill(&self, pid: u32) -> ApiResult<()> {
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

        let handle = self.app.clone();
        let handle2 = handle.clone();
        let app_state = handle2.state::<AppState>();
        crate::commands::pty::pty_kill(handle, app_state, id)
            .map_err(|e| ApiError { code: "PTY_KILL".into(), message: e, context: None })
    }
}
