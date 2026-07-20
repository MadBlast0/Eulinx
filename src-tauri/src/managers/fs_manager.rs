use std::path::Path;

use tauri::AppHandle;
use tauri_plugin_fs::FsExt;

use crate::ipc::{ApiError, ApiResult, FsEntry};
use crate::managers::FsManager;

pub struct FsManagerImpl {
    app: AppHandle,
}

impl FsManagerImpl {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl FsManager for FsManagerImpl {
    fn list_dir(&self, path: &str) -> ApiResult<Vec<FsEntry>> {
        let dir = std::fs::read_dir(Path::new(path))
            .map_err(|e| ApiError { code: "FS_READ_DIR".into(), message: format!("read dir failed: {e}"), context: None })?;

        let mut entries: Vec<FsEntry> = Vec::new();
        for entry in dir {
            let entry = entry
                .map_err(|e| ApiError { code: "FS_ENTRY".into(), message: format!("read entry failed: {e}"), context: None })?;
            let meta = entry
                .metadata()
                .map_err(|e| ApiError { code: "FS_META".into(), message: format!("metadata failed: {e}"), context: None })?;
            let name = entry.file_name().to_string_lossy().into_owned();
            let full = entry.path();
            entries.push(FsEntry {
                name,
                path: full.to_string_lossy().into_owned(),
                is_dir: meta.is_dir(),
                size: if meta.is_dir() { None } else { Some(meta.len()) },
                modified: meta.modified().ok().map(|t| {
                    t.duration_since(std::time::UNIX_EPOCH)
                        .ok()
                        .map(|d| d.as_secs().to_string())
                        .unwrap_or_default()
                }),
            });
        }

        entries.sort_by(|a, b| match a.is_dir.cmp(&b.is_dir) {
            std::cmp::Ordering::Equal => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
            other => other,
        });

        Ok(entries)
    }

    fn read_text_file(&self, path: &str) -> ApiResult<String> {
        self.app
            .fs()
            .read_to_string(Path::new(path))
            .map_err(|e| ApiError { code: "FS_READ".into(), message: format!("read failed: {e}"), context: None })
    }

    fn write_text_file(&self, path: &str, content: &str) -> ApiResult<()> {
        let p = Path::new(path);
        if let Some(parent) = p.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| ApiError { code: "FS_CREATE_DIR".into(), message: format!("create dir failed: {e}"), context: None })?;
        }
        std::fs::write(p, content)
            .map_err(|e| ApiError { code: "FS_WRITE".into(), message: format!("write failed: {e}"), context: None })
    }

    fn create_dir(&self, path: &str) -> ApiResult<()> {
        std::fs::create_dir_all(Path::new(path))
            .map_err(|e| ApiError { code: "FS_CREATE_DIR".into(), message: format!("create dir failed: {e}"), context: None })
    }

    fn remove_file(&self, path: &str) -> ApiResult<()> {
        std::fs::remove_file(Path::new(path))
            .map_err(|e| ApiError { code: "FS_REMOVE".into(), message: format!("remove failed: {e}"), context: None })
    }
}
