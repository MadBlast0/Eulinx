use std::path::Path;

use crate::ipc::{ApiError, ApiResult, FsEntry};

pub struct FsManagerImpl;

impl FsManagerImpl {
    pub fn new() -> Self {
        Self
    }

    /// Create a test instance (same as new, but named for clarity in tests).
    #[cfg(test)]
    pub fn new_test() -> Self {
        Self
    }
}

impl Default for FsManagerImpl {
    fn default() -> Self {
        Self::new()
    }
}

impl FsManagerImpl {
    pub fn list_dir(&self, path: &str) -> ApiResult<Vec<FsEntry>> {
        let dir = std::fs::read_dir(Path::new(path)).map_err(|e| ApiError {
            code: "FS_READ_DIR".into(),
            message: format!("read dir failed: {e}"),
            context: None,
        })?;

        let mut entries: Vec<FsEntry> = Vec::new();
        for entry in dir {
            let entry = entry.map_err(|e| ApiError {
                code: "FS_ENTRY".into(),
                message: format!("read entry failed: {e}"),
                context: None,
            })?;
            let meta = entry.metadata().map_err(|e| ApiError {
                code: "FS_META".into(),
                message: format!("metadata failed: {e}"),
                context: None,
            })?;
            let name = entry.file_name().to_string_lossy().into_owned();
            let full = entry.path();
            entries.push(FsEntry {
                name,
                path: full.to_string_lossy().into_owned(),
                is_dir: meta.is_dir(),
                size: if meta.is_dir() {
                    None
                } else {
                    Some(meta.len())
                },
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

    pub fn read_text_file(&self, path: &str) -> ApiResult<String> {
        std::fs::read_to_string(Path::new(path)).map_err(|e| ApiError {
            code: "FS_READ".into(),
            message: format!("read failed: {e}"),
            context: None,
        })
    }

    pub fn write_text_file(&self, path: &str, content: &str) -> ApiResult<()> {
        let p = Path::new(path);
        if let Some(parent) = p.parent() {
            std::fs::create_dir_all(parent).map_err(|e| ApiError {
                code: "FS_CREATE_DIR".into(),
                message: format!("create dir failed: {e}"),
                context: None,
            })?;
        }
        
        // Write to a temporary file first to ensure atomic write
        let temp_path = format!("{}.tmp", path);
        let temp_p = Path::new(&temp_path);
        
        // Write to temp file
        std::fs::write(temp_p, content).map_err(|e| ApiError {
            code: "FS_WRITE".into(),
            message: format!("write to temp file failed: {e}"),
            context: None,
        })?;
        
        // Sync the file to disk to ensure it's written
        if let Ok(file) = std::fs::File::open(temp_p) {
            let _ = file.sync_all(); // Best effort sync
        }
        
        // Rename temp to final (atomic operation on most filesystems)
        std::fs::rename(temp_p, p).map_err(|e| ApiError {
            code: "FS_RENAME".into(),
            message: format!("rename failed: {e}"),
            context: None,
        })?;
        
        // Sync the directory to ensure the rename is persisted
        if let Some(parent) = p.parent() {
            if let Ok(dir) = std::fs::File::open(parent) {
                let _ = dir.sync_all(); // Best effort sync
            }
        }
        
        Ok(())
    }

    pub fn create_dir(&self, path: &str) -> ApiResult<()> {
        std::fs::create_dir_all(Path::new(path)).map_err(|e| ApiError {
            code: "FS_CREATE_DIR".into(),
            message: format!("create dir failed: {e}"),
            context: None,
        })
    }

    pub fn remove_file(&self, path: &str) -> ApiResult<()> {
        std::fs::remove_file(Path::new(path)).map_err(|e| ApiError {
            code: "FS_REMOVE".into(),
            message: format!("remove failed: {e}"),
            context: None,
        })
    }
}
