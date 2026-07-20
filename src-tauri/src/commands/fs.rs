// Thin native FS / dialog bridge for persisting projects.
//
// A project is a user-selected folder on disk. These commands only move bytes
// and open native pickers; all project/business logic lives in TypeScript.

use std::path::Path;

use tauri::AppHandle;
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

use crate::state::AppState;

/// Read a UTF-8 file at `path`.
#[tauri::command]
pub fn fs_read_text(app: AppHandle, path: String) -> Result<String, String> {
    app.fs()
        .read_to_string(Path::new(&path))
        .map_err(|e| format!("read failed: {e}"))
}

/// Write (overwrite) a UTF-8 file at `path`, creating parent dirs if needed.
#[tauri::command]
pub fn fs_write_text(_app: AppHandle, path: String, contents: String) -> Result<(), String> {
    write_text_impl(&path, &contents)
}

/// Pure implementation of `fs_write_text`, independent of Tauri, for testing.
fn write_text_impl(path: &str, contents: &str) -> Result<(), String> {
    let p = Path::new(path);
    if let Some(parent) = p.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create dir failed: {e}"))?;
    }
    std::fs::write(p, contents).map_err(|e| format!("write failed: {e}"))
}

/// True if a file or directory exists at `path`.
#[tauri::command]
pub fn fs_exists(_app: AppHandle, path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

/// Pure implementation of `fs_create_dir`, independent of Tauri, for testing.
fn create_dir_impl(path: &str) -> Result<(), String> {
    std::fs::create_dir_all(Path::new(path)).map_err(|e| format!("create dir failed: {e}"))
}

/// Create a directory at `path`, including parent directories.
#[tauri::command]
pub fn fs_create_dir(_app: AppHandle, path: String) -> Result<(), String> {
    create_dir_impl(&path)
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

/// A single entry returned by `fs_list_dir`.
#[derive(Debug, serde::Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: Option<u64>,
}

/// List the immediate children of `path`. Directories are returned before
/// files; within each group entries are sorted alphabetically (case-insensitive).
#[tauri::command]
pub fn fs_list_dir(_app: AppHandle, path: String) -> Result<Vec<FileEntry>, String> {
    list_dir_impl(&path)
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

/// Pure implementation of `fs_list_dir`, independent of Tauri, for testing.
fn list_dir_impl(path: &str) -> Result<Vec<FileEntry>, String> {
    let dir = std::fs::read_dir(Path::new(path)).map_err(|e| format!("read dir failed: {e}"))?;

    let mut entries: Vec<FileEntry> = Vec::new();
    for entry in dir {
        let entry = entry.map_err(|e| format!("read entry failed: {e}"))?;
        let meta = entry
            .metadata()
            .map_err(|e| format!("metadata failed: {e}"))?;
        let name = entry
            .file_name()
            .to_string_lossy()
            .into_owned();
        let full = entry.path();
        entries.push(FileEntry {
            name,
            path: full.to_string_lossy().into_owned(),
            is_dir: meta.is_dir(),
            size: if meta.is_dir() { None } else { Some(meta.len()) },
        });
    }

    entries.sort_by(|a, b| {
        match a.is_dir.cmp(&b.is_dir) {
            std::cmp::Ordering::Equal => {
                let a_lc = a.name.to_lowercase();
                let b_lc = b.name.to_lowercase();
                a_lc.cmp(&b_lc)
            }
            other => other,
        }
    });

    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

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

    #[test]
    fn write_then_read_roundtrip() {
        let dir = temp_dir("roundtrip");
        let file = dir.join("nested").join("hello.txt");
        let path = file.to_string_lossy().to_string();

        write_text_impl(&path, "hello world").expect("write");
        assert!(Path::new(&path).exists(), "parent dirs created and file written");

        let read = std::fs::read_to_string(&file).expect("read");
        assert_eq!(read, "hello world");

        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn list_dir_groups_and_sorts_case_insensitive() {
        let dir = temp_dir("listing");
        std::fs::create_dir(dir.join("Zebra")).unwrap();
        std::fs::write(dir.join("apple.txt"), b"a").unwrap();
        std::fs::write(dir.join("Banana.txt"), b"bb").unwrap();

        let entries = list_dir_impl(&dir.to_string_lossy()).expect("list");
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
        let missing = std::env::temp_dir().join("eulinx_fs_does_not_exist_xyz");
        let result = list_dir_impl(&missing.to_string_lossy());
        assert!(result.is_err());
    }

    #[test]
    fn create_dir_single_directory() {
        let dir = temp_dir("create_single");
        let path = dir.join("newdir").to_string_lossy().to_string();
        create_dir_impl(&path).expect("create single dir");
        assert!(Path::new(&path).is_dir());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_dir_nested_directories() {
        let dir = temp_dir("create_nested");
        let path = dir.join("a").join("b").join("c").to_string_lossy().to_string();
        create_dir_impl(&path).expect("create nested dirs");
        assert!(Path::new(&path).is_dir());
        std::fs::remove_dir_all(&dir).ok();
    }

    #[test]
    fn create_dir_existing_succeeds() {
        let dir = temp_dir("create_existing");
        let path = dir.join("exists").to_string_lossy().to_string();
        create_dir_impl(&path).expect("create first time");
        create_dir_impl(&path).expect("create second time (should succeed)");
        assert!(Path::new(&path).is_dir());
        std::fs::remove_dir_all(&dir).ok();
    }
}
