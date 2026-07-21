// Window management commands — delegate to WindowManager.

use tauri::AppHandle;
use tauri::Manager;

use crate::managers::window_manager::WindowManagerImpl;

/// Set the main window title.
#[tauri::command]
pub fn window_set_title(app: AppHandle, title: String) -> Result<(), String> {
    let mgr = app.state::<WindowManagerImpl>();
    mgr.set_title(&title).map_err(|e| e.to_string())
}

/// Set the main window size.
#[tauri::command]
pub fn window_set_size(app: AppHandle, width: u32, height: u32) -> Result<(), String> {
    let mgr = app.state::<WindowManagerImpl>();
    mgr.set_size(width, height).map_err(|e| e.to_string())
}

/// Minimize the main window.
#[tauri::command]
pub fn window_minimize(app: AppHandle) -> Result<(), String> {
    let mgr = app.state::<WindowManagerImpl>();
    mgr.minimize().map_err(|e| e.to_string())
}

/// Maximize the main window.
#[tauri::command]
pub fn window_maximize(app: AppHandle) -> Result<(), String> {
    let mgr = app.state::<WindowManagerImpl>();
    mgr.maximize().map_err(|e| e.to_string())
}

/// Close the main window.
#[tauri::command]
pub fn window_close(app: AppHandle) -> Result<(), String> {
    let mgr = app.state::<WindowManagerImpl>();
    mgr.close().map_err(|e| e.to_string())
}
