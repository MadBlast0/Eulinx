mod commands;
mod error;
mod ipc;
mod managers;
mod state;

use std::path::PathBuf;

use commands::pty::PtyState;
use managers::db_manager::DbManager;
use managers::dialog_manager::DialogManagerImpl;
use managers::fs_manager::FsManagerImpl;
use managers::pty_manager::PtyManagerImpl;
use managers::secure_store_manager::SecureStoreManagerImpl;
use managers::window_manager::WindowManagerImpl;
use state::AppState;
use tauri::Manager;

/// Resolve a stable directory for the on-disk SQLite database.
///
/// We intentionally avoid `tauri::Builder::setup` here: in this toolchain the
/// command macro interacts badly with `setup` and with shorthand module paths
/// such as `commands::dialog_pick_folder` once a sibling `commands::db` module
/// is registered. Resolving the data dir from the executable location (or the
/// `EULINX_DATA_DIR` override) needs no `AppHandle`.
fn resolve_app_data_dir() -> PathBuf {
    if let Ok(env_dir) = std::env::var("EULINX_DATA_DIR") {
        return PathBuf::from(env_dir);
    }

    let base = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));

    base.join("eulinx-data")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_data = resolve_app_data_dir();
    let db_path = app_data.join("eulinx.db");
    let db = DbManager::open(db_path).unwrap_or_else(|e| {
        log::error!("failed to open database, falling back to in-memory: {e}");
        DbManager::open_memory().expect("in-memory db must open")
    });

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(PtyState::default())
        .manage(AppState::new(true))
        .manage(db)
        .setup(|app| {
            let handle = app.handle().clone();
            app.manage(FsManagerImpl::new());
            app.manage(PtyManagerImpl::new(handle.clone()));
            app.manage(WindowManagerImpl::new(handle.clone()));
            app.manage(SecureStoreManagerImpl::new(handle.clone()));
            app.manage(DialogManagerImpl::new(handle));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // PTY
            commands::pty::pty_spawn,
            commands::pty::pty_write,
            commands::pty::pty_resize,
            commands::pty::pty_kill,
            commands::pty::pty_write_by_pid,
            commands::pty::pty_resize_by_pid,
            commands::pty::pty_kill_by_pid,
            // Filesystem
            commands::fs::dialog_pick_folder,
            commands::fs::dialog_open_file,
            commands::fs::dialog_save_file,
            commands::fs::fs_exists,
            commands::fs::fs_list_dir,
            commands::fs::fs_read_text,
            commands::fs::fs_write_text,
            commands::fs::fs_create_dir,
            commands::fs::fs_remove_file,
            commands::fs::fs_watch_path,
            commands::fs::fs_unwatch_path,
            commands::fs::fs_list_watchers,
            // Git
            commands::git::git_status,
            commands::git::git_stage_all,
            commands::git::git_commit,
            commands::git::git_push,
            // Database
            commands::db::db_query,
            commands::db::db_find_by_id,
            commands::db::db_insert,
            commands::db::db_update,
            commands::db::db_delete,
            commands::db::db_transaction,
            commands::db::db_write_event_log,
            commands::db::db_get_event_seq,
            commands::db::db_is_native,
            // PTY session info
            commands::db::pty_get_session_info,
            commands::db::pty_list_sessions,
            // Window management
            commands::window::window_set_title,
            commands::window::window_set_size,
            commands::window::window_minimize,
            commands::window::window_maximize,
            commands::window::window_close,
            // Secure store
            commands::store::store_get,
            commands::store::store_set,
            commands::store::store_delete,
            // Dialogs (via manager)
            commands::dialog::dialog_open_file_via_manager,
            commands::dialog::dialog_save_file_via_manager,
            commands::dialog::dialog_confirm,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
