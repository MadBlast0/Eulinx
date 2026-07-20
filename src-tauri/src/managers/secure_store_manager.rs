use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

use crate::ipc::{ApiError, ApiResult};
use crate::managers::SecureStoreManager;

pub struct SecureStoreManagerImpl {
    app: AppHandle,
}

impl SecureStoreManagerImpl {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl SecureStoreManager for SecureStoreManagerImpl {
    fn get(&self, key: &str) -> ApiResult<Option<String>> {
        let store = self
            .app
            .store("eulinx-store.json")
            .map_err(|e| ApiError { code: "STORE_OPEN".into(), message: e.to_string(), context: None })?;
        Ok(store.get(key).map(|v| v.to_string()))
    }

    fn set(&self, key: &str, value: &str) -> ApiResult<()> {
        let store = self
            .app
            .store("eulinx-store.json")
            .map_err(|e| ApiError { code: "STORE_OPEN".into(), message: e.to_string(), context: None })?;
        store.set(key.to_string(), serde_json::json!(value));
        store
            .save()
            .map_err(|e| ApiError { code: "STORE_SAVE".into(), message: e.to_string(), context: None })
    }

    fn delete(&self, key: &str) -> ApiResult<()> {
        let store = self
            .app
            .store("eulinx-store.json")
            .map_err(|e| ApiError { code: "STORE_OPEN".into(), message: e.to_string(), context: None })?;
        store.delete(key);
        store
            .save()
            .map_err(|e| ApiError { code: "STORE_SAVE".into(), message: e.to_string(), context: None })
    }
}
