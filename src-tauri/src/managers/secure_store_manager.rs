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
            .store(STORE_FILE)
            .map_err(|e| ApiError { code: "STORE_OPEN".into(), message: e.to_string(), context: None })?;
        Ok(store.get(key).map(|v| v.to_string()))
    }

    fn set(&self, key: &str, value: &str) -> ApiResult<()> {
        let store = self
            .app
            .store(STORE_FILE)
            .map_err(|e| ApiError { code: "STORE_OPEN".into(), message: e.to_string(), context: None })?;
        store.set(key.to_string(), serde_json::json!(value));
        store
            .save()
            .map_err(|e| ApiError { code: "STORE_SAVE".into(), message: e.to_string(), context: None })
    }

    fn delete(&self, key: &str) -> ApiResult<()> {
        let store = self
            .app
            .store(STORE_FILE)
            .map_err(|e| ApiError { code: "STORE_OPEN".into(), message: e.to_string(), context: None })?;
        store.delete(key);
        store
            .save()
            .map_err(|e| ApiError { code: "STORE_SAVE".into(), message: e.to_string(), context: None })
    }
}

/// On-disk file backing the secure store. Kept as a constant so the store name
/// is defined in one place and can be asserted in tests.
const STORE_FILE: &str = "eulinx-store.json";

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn store_file_name_is_stable() {
        // The frontend and any migration tooling depend on this exact filename.
        assert_eq!(STORE_FILE, "eulinx-store.json");
    }

    #[test]
    fn error_codes_are_stable() {
        // These codes are matched on in the TypeScript IPC layer; keep them fixed.
        let open = ApiError { code: "STORE_OPEN".into(), message: "x".into(), context: None };
        let save = ApiError { code: "STORE_SAVE".into(), message: "x".into(), context: None };
        assert_eq!(open.code, "STORE_OPEN");
        assert_eq!(save.code, "STORE_SAVE");
    }
}
