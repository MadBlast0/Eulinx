// Secure store commands — delegate to SecureStoreManager.

use tauri::AppHandle;
use tauri::Manager;

use crate::managers::secure_store_manager::SecureStoreManagerImpl;

/// Get a value from the secure store.
#[tauri::command]
pub fn store_get(app: AppHandle, key: String) -> Result<Option<String>, String> {
    let mgr = app.state::<SecureStoreManagerImpl>();
    mgr.get(&key).map_err(|e| e.to_string())
}

/// Set a value in the secure store.
#[tauri::command]
pub fn store_set(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let mgr = app.state::<SecureStoreManagerImpl>();
    mgr.set(&key, &value).map_err(|e| e.to_string())
}

/// Delete a value from the secure store.
#[tauri::command]
pub fn store_delete(app: AppHandle, key: String) -> Result<(), String> {
    let mgr = app.state::<SecureStoreManagerImpl>();
    mgr.delete(&key).map_err(|e| e.to_string())
}
