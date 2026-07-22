mod commands;
mod error;
mod event_log;
mod ipc;
mod managers;
mod scheduler;
mod state;
mod workflow;

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
            app.manage(DialogManagerImpl::new(handle.clone()));

            // Scheduler Manager
            let scheduler_config = crate::scheduler::types::SchedulerConfig {
                max_concurrency: 16,
                budget: crate::scheduler::types::UNLIMITED_BUDGET_POOL,
                enable_aging: true,
                aging_interval_ms: 30_000,
                fairness: crate::scheduler::types::DEFAULT_FAIRNESS_CONFIG,
            };
            app.manage(crate::managers::scheduler_manager::SchedulerManager::new(
                handle.clone(),
                scheduler_config,
            ));

            // Workflow Manager
            app.manage(crate::managers::workflow_manager::WorkflowManager::new(handle.clone()));

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
            // Scheduler
            commands::scheduler_cmd::scheduler_init,
            commands::scheduler_cmd::scheduler_start,
            commands::scheduler_cmd::scheduler_stop,
            commands::scheduler_cmd::scheduler_pause,
            commands::scheduler_cmd::scheduler_resume,
            commands::scheduler_cmd::scheduler_state,
            commands::scheduler_cmd::scheduler_enqueue,
            commands::scheduler_cmd::scheduler_tick,
            commands::scheduler_cmd::scheduler_cancel,
            commands::scheduler_cmd::scheduler_complete,
            commands::scheduler_cmd::scheduler_fail,
            commands::scheduler_cmd::scheduler_get_unit,
            commands::scheduler_cmd::scheduler_get_running_units,
            commands::scheduler_cmd::scheduler_get_queue_snapshot,
            commands::scheduler_cmd::scheduler_get_metrics,
            commands::scheduler_cmd::scheduler_get_dead_queue,
            commands::scheduler_cmd::scheduler_get_rate_limit_state,
            commands::scheduler_cmd::scheduler_get_budget_info,
            commands::scheduler_cmd::scheduler_get_concurrency_info,
            commands::scheduler_cmd::scheduler_dead_queue_get,
            commands::scheduler_cmd::scheduler_dead_queue_remove,
            commands::scheduler_cmd::scheduler_dead_queue_len,
            commands::scheduler_cmd::scheduler_dead_queue_clear,
            commands::scheduler_cmd::scheduler_dead_queue_get_by_category,
            // Workflow
            commands::workflow_cmd::workflow_init,
            commands::workflow_cmd::workflow_create_run,
            commands::workflow_cmd::workflow_tick,
            commands::workflow_cmd::workflow_handle_node_result,
            commands::workflow_cmd::workflow_pause_run,
            commands::workflow_cmd::workflow_resume_run,
            commands::workflow_cmd::workflow_cancel_run,
            commands::workflow_cmd::workflow_get_run,
            commands::workflow_cmd::workflow_list_runs,
            commands::workflow_cmd::workflow_get_run_metrics,
            commands::workflow_cmd::workflow_validate_snapshot,
            // Event Log
            commands::event_log_cmd::log_write_batch,
            commands::event_log_cmd::log_query,
            commands::event_log_cmd::log_prune,
            commands::event_log_cmd::log_detect_gaps,
            commands::event_log_cmd::log_get_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
