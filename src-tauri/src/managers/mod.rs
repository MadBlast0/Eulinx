pub mod db_manager;
pub mod dialog_manager;
pub mod fs_manager;
pub mod pty_manager;
pub mod secure_store_manager;
pub mod window_manager;

use crate::ipc::ApiResult;

/// Native filesystem operations.
pub trait FsManager: Send + Sync {
    fn list_dir(&self, path: &str) -> ApiResult<Vec<crate::ipc::FsEntry>>;
    fn read_text_file(&self, path: &str) -> ApiResult<String>;
    fn write_text_file(&self, path: &str, content: &str) -> ApiResult<()>;
    fn create_dir(&self, path: &str) -> ApiResult<()>;
    fn remove_file(&self, path: &str) -> ApiResult<()>;
}

/// Native PTY/terminal operations.
pub trait PtyManager: Send + Sync {
    fn spawn(&self, workspace_id: &str, cmd: &str) -> ApiResult<u32>;
    fn write(&self, pid: u32, data: &str) -> ApiResult<()>;
    fn resize(&self, pid: u32, cols: u16, rows: u16) -> ApiResult<()>;
    fn kill(&self, pid: u32) -> ApiResult<()>;
}

/// Native window management.
pub trait WindowManager: Send + Sync {
    fn set_title(&self, title: &str) -> ApiResult<()>;
    fn set_size(&self, width: u32, height: u32) -> ApiResult<()>;
    fn minimize(&self) -> ApiResult<()>;
    fn maximize(&self) -> ApiResult<()>;
    fn close(&self) -> ApiResult<()>;
}

/// OS secure credential store.
pub trait SecureStoreManager: Send + Sync {
    fn get(&self, key: &str) -> ApiResult<Option<String>>;
    fn set(&self, key: &str, value: &str) -> ApiResult<()>;
    fn delete(&self, key: &str) -> ApiResult<()>;
}

/// Native dialog operations.
pub trait DialogManager: Send + Sync {
    fn open_file(&self, filter: Option<&str>) -> ApiResult<Option<String>>;
    fn save_file(&self, default_name: &str) -> ApiResult<Option<String>>;
    fn confirm(&self, title: &str, message: &str) -> ApiResult<bool>;
}
