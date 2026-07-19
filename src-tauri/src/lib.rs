mod commands;
mod error;
mod ipc;
mod managers;
mod state;

use commands::pty::PtyState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(PtyState::default())
        .invoke_handler(tauri::generate_handler![
            commands::pty::pty_spawn,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
            commands::fs::fs_read_text,
            commands::fs::fs_write_text,
            commands::fs::fs_exists,
            commands::fs::dialog_pick_folder,
            commands::git::git_status,
            commands::git::git_stage_all,
            commands::git::git_commit,
            commands::git::git_push,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
