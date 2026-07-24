// Native PTY bridge for terminal nodes.
//
// Delegates to PtyManagerImpl for all PTY operations. The manager owns the
// process lifecycle; commands are thin Tauri entry points.

use std::collections::HashMap;
use std::io::Write;
use std::sync::Mutex;

use portable_pty::PtySize;
use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;

use crate::managers::pty_manager::{PtyHandle, PtyManagerImpl};
use crate::state::AppState;

#[derive(Default)]
pub struct PtyState {
    /// Live child processes keyed by PTY id.
    pub children: Mutex<HashMap<String, PtyHandle>>,
}

/// Spawn a real shell in a PTY. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    _state: tauri::State<'_, AppState>,
    id: String,
    shell: Option<String>,
) -> Result<String, String> {
    let mgr = app.state::<PtyManagerImpl>();
    mgr.spawn(&id, shell.as_deref().unwrap_or(""))
        .map_err(|e| e.to_string())?;
    Ok(id)
}

/// Write input into the shell's PTY master.
#[tauri::command]
pub fn pty_write(app: AppHandle, id: String, data: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let guard = state.children.lock().unwrap();
    let handle = guard.get(&id).ok_or("no such pty")?;
    let mut writer = handle.writer.lock().unwrap();
    if let Some(w) = writer.as_mut() {
        let _ = w.write_all(data.as_bytes());
        let _ = w.flush();
    }
    Ok(())
}

/// Resize terminal dimensions and propagate to the PTY.
#[tauri::command]
pub fn pty_resize(app: AppHandle, id: String, cols: u32, rows: u32) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let guard = state.children.lock().unwrap();
    if let Some(handle) = guard.get(&id) {
        *handle.cols.lock().unwrap() = (cols, rows);
        if let Some(master) = handle.master.lock().unwrap().as_mut() {
            let size = PtySize {
                rows: rows as u16,
                cols: cols as u16,
                pixel_width: 0,
                pixel_height: 0,
            };
            let _ = master.resize(size);
        }
    }
    drop(guard);

    let _ = app.emit(
        &format!("pty://{id}/resize"),
        serde_json::json!({ "id": id, "cols": cols, "rows": rows }),
    );

    Ok(())
}

/// Kill the shell process. Sends the kill signal; the exit-wait thread handles
/// cleanup after the process terminates.
#[tauri::command]
pub fn pty_kill(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    let pty_state = app.state::<PtyState>();
    if let Some(handle) = pty_state.children.lock().unwrap().get(&id) {
        if let Some(child) = handle.child.lock().unwrap().as_mut() {
            let _ = child.kill();
        }
    }
    state.pty_sessions.blocking_write().remove(&id);
    Ok(())
}

/// Write input to a PTY by PID. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_write_by_pid(app: AppHandle, pid: u32, data: String) -> Result<(), String> {
    let mgr = app.state::<PtyManagerImpl>();
    mgr.write(pid, &data).map_err(|e| e.to_string())
}

/// Resize a PTY by PID. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_resize_by_pid(app: AppHandle, pid: u32, cols: u16, rows: u16) -> Result<(), String> {
    let mgr = app.state::<PtyManagerImpl>();
    mgr.resize(pid, cols, rows).map_err(|e| e.to_string())
}

/// Kill a PTY by PID. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_kill_by_pid(app: AppHandle, pid: u32) -> Result<(), String> {
    let mgr = app.state::<PtyManagerImpl>();
    mgr.kill(pid).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::managers::pty_manager::resolve_shell;
    use std::process::Command;

    #[test]
    fn resolve_shell_uses_default_when_none() {
        let (program, flag) = resolve_shell(None);
        if cfg!(windows) {
            assert_eq!(program, "cmd.exe");
            assert!(flag.is_none(), "Windows default shell should have no flag");
        } else {
            assert!(!program.is_empty());
            assert_eq!(flag.as_deref(), Some("-i"));
        }
    }

    #[test]
    fn resolve_shell_uses_default_when_blank() {
        let (program, _) = resolve_shell(Some("   "));
        let (default, _) = crate::managers::pty_manager::resolve_shell(None);
        assert_eq!(program, default);
    }

    #[test]
    fn resolve_shell_honors_override_and_trims() {
        let (program, flag) = resolve_shell(Some("  bash  "));
        assert_eq!(program, "bash");
        assert_eq!(flag.as_deref(), Some("-i"));
    }

    #[test]
    fn spawns_trivial_command_and_captures_output() {
        let output = if cfg!(windows) {
            Command::new("cmd.exe")
                .args(["/C", "echo", "eulinx"])
                .output()
        } else {
            Command::new("echo").arg("eulinx").output()
        };

        let output = output.expect("spawn trivial command");
        assert!(output.status.success());
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(stdout.contains("eulinx"), "unexpected stdout: {stdout}");
    }
}
