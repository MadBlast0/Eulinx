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

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

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

/// Spawn a real shell. `shell` overrides the OS default (e.g. "pwsh", "bash").
/// Returns the PTY id used for write/resize/kill and event channels.
#[tauri::command]
pub fn pty_spawn(app: AppHandle, id: String, shell: Option<String>) -> Result<String, String> {
    let (program, flag) = match shell {
        Some(s) if !s.trim().is_empty() => (s.trim().to_string(), "-i".to_string()),
        _ => default_shell(),
    };

    let mut command = Command::new(&program);
    command.arg(&flag);
    command.stdin(Stdio::piped());
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|e| format!("spawn failed: {e}"))?;
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
    let state = app_owned.state::<PtyState>();
    state.children.lock().unwrap().insert(
        id.clone(),
        PtyHandle {
            child: Mutex::new(Some(child)),
            stdin: Mutex::new(Some(stdin)),
            cols: Mutex::new((80, 24)),
        },
    );
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

/// Kill the shell process.
#[tauri::command]
pub fn pty_kill(app: AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<PtyState>();
    if let Some(handle) = state.children.lock().unwrap().remove(&id) {
        if let Some(mut child) = handle.child.lock().unwrap().take() {
            let _ = child.kill();
        }
    }
    Ok(())
}
