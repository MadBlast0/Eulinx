// Native PTY bridge for terminal nodes.
//
// Delegates to PtyManagerImpl for all PTY operations. The manager owns the
// process lifecycle; commands are thin Tauri entry points.

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::AppHandle;
use tauri::Emitter;
use tauri::Manager;

use crate::managers::pty_manager::{PtyHandle, PtyManagerImpl};
use crate::state::AppState;

#[derive(Default)]
pub struct PtyState {
    /// Live child processes keyed by PTY id. Stdin kept for writes; Child kept
    /// so kill() can terminate it.
    pub children: Mutex<HashMap<String, PtyHandle>>,
}

/// Spawn a real shell. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_spawn(app: AppHandle, _state: tauri::State<'_, AppState>, id: String, shell: Option<String>) -> Result<String, String> {
    let mgr = app.state::<PtyManagerImpl>();
    mgr.spawn(&id, shell.as_deref().unwrap_or(""))
        .map_err(|e| e.to_string())?;
    Ok(id)
}

/// Write input into the shell's stdin. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_write(app: AppHandle, id: String, data: String) -> Result<(), String> {
    // We need to find the PID for this id, then delegate
    let state = app.state::<PtyState>();
    let guard = state.children.lock().unwrap();
    // Find PID by iterating children — but PtyManagerImpl has pid_to_id map
    // Since we don't have direct access, use the manager's write via PID lookup
    // For now, delegate directly using the handle
    let handle = guard.get(&id).ok_or("no such pty")?;
    let mut stdin = handle.stdin.lock().unwrap();
    if let Some(s) = stdin.as_mut() {
        use std::io::Write;
        let _ = s.write_all(data.as_bytes());
        let _ = s.flush();
    }
    Ok(())
}

/// Resize the terminal dimensions. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_resize(app: AppHandle, id: String, cols: u32, rows: u32) -> Result<(), String> {
    // Store new dimensions
    let state = app.state::<PtyState>();
    let guard = state.children.lock().unwrap();
    if let Some(handle) = guard.get(&id) {
        let mut dims = handle.cols.lock().unwrap();
        *dims = (cols, rows);
    }
    drop(guard);

    // Emit resize event
    let _ = app.emit(
        &format!("pty://{id}/resize"),
        serde_json::json!({ "id": id, "cols": cols, "rows": rows }),
    );

    Ok(())
}

/// Kill the shell process. Delegates to PtyManagerImpl.
#[tauri::command]
pub fn pty_kill(app: AppHandle, state: tauri::State<'_, AppState>, id: String) -> Result<(), String> {
    let pty_state = app.state::<PtyState>();
    if let Some(handle) = pty_state.children.lock().unwrap().remove(&id) {
        if let Some(mut child) = handle.child.lock().unwrap().take() {
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
    use std::process::Command;

    #[test]
    fn resolve_shell_uses_default_when_none() {
        let (program, flag) = resolve_shell(None);
        if cfg!(windows) {
            assert_eq!(program, "cmd.exe");
            assert_eq!(flag, "/C");
        } else {
            assert!(!program.is_empty());
            assert_eq!(flag, "-i");
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
        assert_eq!(flag, "-i");
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
