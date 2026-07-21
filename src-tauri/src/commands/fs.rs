// Thin native FS / dialog bridge for persisting projects.
//
// A project is a user-selected folder on disk. These commands only move bytes
// and open native pickers; all project/business logic lives in TypeScript.
//
// All commands delegate to the FsManager trait implementations.

use std::path::Path;

use tauri::AppHandle;
use tauri::Manager;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

use crate::managers::fs_manager::FsManagerImpl;
use crate::state::AppState;

/// Read a UTF-8 file at `path`. Delegates to FsManager.
#[tauri::command]
pub fn fs_read_text(app: AppHandle, path: String) -> Result<String, String> {
    let mgr = app.state::<FsManagerImpl>();
    mgr.read_text_file(&path).map_err(|e| e.to_string())
}

/// Write (overwrite) a UTF-8 file at `path`, creating parent dirs if needed.
/// Delegates to FsManager.
#[tauri::command]
pub fn fs_write_text(app: AppHandle, path: String, contents: String) -> Result<(), String> {
    let mgr = app.state::<FsManagerImpl>();
    mgr.write_text_file(&path, &contents).map_err(|e| e.to_string())
}

/// True if a file or directory exists at `path`.
#[tauri::command]
pub fn fs_exists(_app: AppHandle, path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// Create a directory at `path`, including parent directories.
/// Delegates to FsManager.
#[tauri::command]
pub fn fs_create_dir(app: AppHandle, path: String) -> Result<(), String> {
    let mgr = app.state::<FsManagerImpl>();
    mgr.create_dir(&path).map_err(|e| e.to_string())
}

/// Open the native folder picker. Returns the chosen absolute path, or `None`
/// if the user cancelled.
#[tauri::command]
pub fn dialog_pick_folder(app: AppHandle) -> Result<Option<String>, String> {
    match app.dialog().file().blocking_pick_folder() {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// Open the native file picker for opening a file. Returns the chosen absolute
/// path, or `None` if the user cancelled.
#[tauri::command]
pub fn dialog_open_file(app: AppHandle, filter: Option<String>) -> Result<Option<String>, String> {
    let builder = app.dialog().file();
    let builder = if let Some(f) = filter {
        builder.add_filter("Filter", &[&f])
    } else {
        builder
    };
    match builder.blocking_pick_file() {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// Open the native file picker for saving a file. Returns the chosen absolute
/// path, or `None` if the user cancelled.
#[tauri::command]
pub fn dialog_save_file(app: AppHandle, default_name: String) -> Result<Option<String>, String> {
    match app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .blocking_save_file()
    {
        Some(path) => Ok(Some(path.to_string())),
        None => Ok(None),
    }
}

/// List the immediate children of `path`. Directories are returned before
/// files; within each group entries are sorted alphabetically (case-insensitive).
/// Delegates to FsManager and returns IPC FsEntry types.
#[tauri::command]
pub fn fs_list_dir(app: AppHandle, path: String) -> Result<Vec<crate::ipc::FsEntry>, String> {
    let mgr = app.state::<FsManagerImpl>();
    mgr.list_dir(&path).map_err(|e| e.to_string())
}

/// Remove a file at `path`. Delegates to FsManager.
#[tauri::command]
pub fn fs_remove_file(app: AppHandle, path: String) -> Result<(), String> {
    let mgr = app.state::<FsManagerImpl>();
    mgr.remove_file(&path).map_err(|e| e.to_string())
}

/// Start watching a filesystem path for changes.
#[tauri::command]
pub async fn fs_watch_path(app: AppHandle, state: State<'_, AppState>, path: String) -> Result<String, String> {
    state.watch_path(path, app).await
}

/// Stop watching a previously registered path.
#[tauri::command]
pub async fn fs_unwatch_path(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state.unwatch_path(&id).await
}

/// List all active watchers.
#[tauri::command]
pub async fn fs_list_watchers(state: State<'_, AppState>) -> Result<Vec<(String, String)>, String> {
    Ok(state.list_watchers().await)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::managers::fs_manager::FsManagerImpl;

    /// Create a unique temp directory under the OS temp dir.
    fn temp_dir(tag: &str) -> std::path::PathBuf {
        let mut base = std::env::temp_dir();
        let nanos = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        base.push(format!("eulinx_fs_test_{tag}_{nanos}"));
        std::fs::create_dir_all(&base).unwrap();
        base
    }

    /// Create a test FsManagerImpl.
    fn test_fs_manager() -> FsManagerImpl {
        FsManagerImpl::new()
    }

    #[test]
    fn write_then_read_roundtrip() {
        let mgr = test_fs_manager();
        let dir = temp_dir("roundtrip");
        let file = dir.join("nested").join("hello.txt");
        let path = file.to_string_lossy().to_string();

        mgr.write_text_file(&path, "hello world").expect("write");
        assert!(Path::new(&path).exists(), "parent dirs created and file written");

        let read = mgr.read_text_file(&path).expect("read");
        assert_eq!(read, "hello world");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_dir_groups_and_sorts_case_insensitive() {
        let mgr = test_fs_manager();
        let dir = temp_dir("listing");
        std::fs::create_dir(dir.join("Zebra")).unwrap();
        std::fs::write(dir.join("apple.txt"), b"a").unwrap();
        std::fs::write(dir.join("Banana.txt"), b"bb").unwrap();

        let entries = mgr.list_dir(&dir.to_string_lossy()).expect("list");
        assert_eq!(entries.len(), 3);

        // Files are grouped together and sorted case-insensitively.
        assert_eq!(entries[0].name, "apple.txt");
        assert!(!entries[0].is_dir);
        assert_eq!(entries[0].size, Some(1));
        assert_eq!(entries[1].name, "Banana.txt");
        assert_eq!(entries[1].size, Some(2));

        // The directory forms its own group with no reported size.
        assert_eq!(entries[2].name, "Zebra");
        assert!(entries[2].is_dir);
        assert!(entries[2].size.is_none());

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_dir_errors_on_missing_path() {
        let mgr = test_fs_manager();
        let missing = std::env::temp_dir().join("eulinx_fs_does_not_exist_xyz");
        let result = mgr.list_dir(&missing.to_string_lossy());
        assert!(result.is_err());
    }

    #[test]
    fn create_dir_single_directory() {
        let mgr = test_fs_manager();
        let dir = temp_dir("create_single");
        let path = dir.join("newdir").to_string_lossy().to_string();
        mgr.create_dir(&path).expect("create single dir");
        assert!(Path::new(&path).is_dir());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_dir_nested_directories() {
        let mgr = test_fs_manager();
        let dir = temp_dir("create_nested");
        let path = dir.join("a").join("b").join("c").to_string_lossy().to_string();
        mgr.create_dir(&path).expect("create nested dirs");
        assert!(Path::new(&path).is_dir());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_dir_existing_succeeds() {
        let mgr = test_fs_manager();
        let dir = temp_dir("create_existing");
        let path = dir.join("exists").to_string_lossy().to_string();
        mgr.create_dir(&path).expect("create first time");
        mgr.create_dir(&path).expect("create second time (should succeed)");
        assert!(Path::new(&path).is_dir());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn remove_file_works() {
        let mgr = test_fs_manager();
        let dir = temp_dir("remove");
        let path = dir.join("to_remove.txt").to_string_lossy().to_string();
        std::fs::write(&path, "delete me").unwrap();
        assert!(Path::new(&path).exists());
        mgr.remove_file(&path).expect("remove");
        assert!(!Path::new(&path).exists());
        std::fs::remove_dir_all(&dir).ok();
    }
}
