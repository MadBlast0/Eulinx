// Dialog commands — delegate to DialogManager.

use tauri::AppHandle;
use tauri::Manager;

use crate::managers::dialog_manager::DialogManagerImpl;

/// Open a file picker dialog. Returns the chosen path or None.
#[tauri::command]
pub fn dialog_open_file_via_manager(
    app: AppHandle,
    filter: Option<String>,
) -> Result<Option<String>, String> {
    let mgr = app.state::<DialogManagerImpl>();
    mgr.open_file(filter.as_deref()).map_err(|e| e.to_string())
}

/// Open a save-file dialog. Returns the chosen path or None.
#[tauri::command]
pub fn dialog_save_file_via_manager(
    app: AppHandle,
    default_name: String,
) -> Result<Option<String>, String> {
    let mgr = app.state::<DialogManagerImpl>();
    mgr.save_file(&default_name).map_err(|e| e.to_string())
}

/// Show a confirmation dialog. Returns true if confirmed.
#[tauri::command]
pub fn dialog_confirm(app: AppHandle, title: String, message: String) -> Result<bool, String> {
    let mgr = app.state::<DialogManagerImpl>();
    mgr.confirm(&title, &message).map_err(|e| e.to_string())
}
