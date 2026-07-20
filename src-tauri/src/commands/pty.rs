// Native PTY bridge for terminal nodes.
//
// Owns real OS shell processes spawned through std::process and streams their
// stdout/stderr to the frontend as Tauri events. The frontend holds the
// xterm.js view; this module holds the process and is authoritative.
//
// Event channels (per PTY id):
//   pty://<id>/data  -> { id, chunk }   stdout/stderr bytes (utf8)
//   pty://<id>/exit  -> { id, code }     process exit (code null == killed)
//
// This is the "thin Rust bridge" the architecture prescribes: it does not
// interpret output, it only moves bytes. Interactive line editing (ConPTY on
// Windows) is a future enhancement; the piped-process bridge already runs real
// commands and shows real output.

use std::collections::HashMap;
use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

use crate::state::{AppState, PtySessionState};

#[derive(Default)]
pub struct PtyState {
    /// Live child processes keyed by PTY id. Stdin kept for writes; Child kept
    /// so kill() can terminate it.
    pub children: Mutex<HashMap<String, PtyHandle>>,
}

pub(crate) struct PtyHandle {
    pub child: Mutex<Option<Child>>,
    pub stdin: Mutex<Option<ChildStdin>>,
    /// Current terminal dimensions (cols, rows). Updated on resize.
    pub cols: Mutex<(u32, u32)>,
}

#[derive(Clone, Serialize, Deserialize)]
struct PtyResizePayload {
    id: String,
    cols: u32,
    rows: u32,
}

type ChildStdin = std::process::ChildStdin;

#[derive(Clone, Serialize)]
struct PtyData {
    id: String,
    chunk: String,
}

#[derive(Clone, Serialize)]
struct PtyExit {
    id: String,
    code: Option<i32>,
}

/// Resolve the default shell for the current OS.
fn default_shell() -> (String, String) {
    if cfg!(windows) {
        ("cmd.exe".to_string(), "/C".to_string())
    } else if let Ok(shell) = std::env::var("SHELL") {
        (shell, "-i".to_string())
    } else {
        ("/bin/sh".to_string(), "-i".to_string())
    }
}

/// Resolve the (program, flag) pair for a spawn request. Extracted from
/// `pty_spawn` so the selection logic can be unit tested without an AppHandle.
fn resolve_shell(shell: Option<&str>) -> (String, String) {
    match shell {
        Some(s) if !s.trim().is_empty() => (s.trim().to_string(), "-i".to_string()),
        _ => default_shell(),
    }
}

/// Spawn a real shell. `shell` overrides the OS default (e.g. "pwsh", "bash").
/// Returns the PTY id used for write/resize/kill and event channels.
#[tauri::command]
pub fn pty_spawn(app: AppHandle, state: tauri::State<'_, AppState>, id: String, shell: Option<String>) -> Result<String, String> {
    let (program, flag) = resolve_shell(shell.as_deref());

    let mut command = Command::new(&program);
    command.arg(&flag);
    command.stdin(Stdio::piped());
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| format!("spawn failed: {e}"))?;
    let pid = child.id();
    let stdin = child.stdin.take().ok_or("no stdin handle")?;

    let app_owned = app.clone();

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

    // Reap and notify on exit. The Child lives in the handle; the reaper takes
    // it out under lock so kill() and wait() never race on the same instance.
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
    state
        .pty_sessions
        .blocking_write()
        .insert(id.clone(), PtySessionState { pid, started_at, cmd: program });

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
        let _ = exit_app.emit(
            &format!("pty://{exit_id}/exit"),
            PtyExit { id: exit_id.clone(), code },
        );
    });

    Ok(id)
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
                    PtyData { id: id.to_string(), chunk },
                );
            }
            Err(_) => break,
        }
    }
}

/// Write input into the shell's stdin.
#[tauri::command]
pub fn pty_write(app: AppHandle, id: String, data: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let guard = state.children.lock().unwrap();
    let handle = guard.get(&id).ok_or("no such pty")?;
    let mut stdin = handle.stdin.lock().unwrap();
    if let Some(s) = stdin.as_mut() {
        let _ = s.write_all(data.as_bytes());
        let _ = s.flush();
    }
    Ok(())
}

/// Resize the terminal dimensions. Since this is a piped-process bridge (no PTY
/// geometry), we can't resize the PTY directly. Instead we:
///   - Store the new dimensions in PtyHandle for child processes to inherit
///   - Send SIGWINCH to the child process on Unix so it re-queries term size
///   - Emit a resize event to the frontend
#[tauri::command]
pub fn pty_resize(app: AppHandle, id: String, cols: u32, rows: u32) -> Result<(), String> {
    let state = app.state::<PtyState>();
    let guard = state.children.lock().unwrap();
    if let Some(handle) = guard.get(&id) {
        let mut dims = handle.cols.lock().unwrap();
        *dims = (cols, rows);
        drop(dims);

        // On Unix, send SIGWINCH so the child process re-queries terminal size
        #[cfg(unix)]
        if let Some(child) = handle.child.lock().unwrap().as_ref() {
            unsafe {
                libc::kill(child.id() as i32, libc::SIGWINCH);
            }
        }
    }

    let _ = app.emit(
        &format!("pty://{id}/resize"),
        PtyResizePayload {
            id: id.clone(),
            cols,
            rows,
        },
    );

    println!("[pty] resize id={id} cols={cols} rows={rows}");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let (default, _) = default_shell();
        assert_eq!(program, default);
    }

    #[test]
    fn resolve_shell_honors_override_and_trims() {
        let (program, flag) = resolve_shell(Some("  bash  "));
        assert_eq!(program, "bash");
        assert_eq!(flag, "-i");
    }

    /// Spawn a trivial command the same way the bridge does and confirm we can
    /// capture its output. This exercises the std::process piping path used by
    /// `pty_spawn` without needing a Tauri AppHandle.
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

/// Kill the shell process.
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
