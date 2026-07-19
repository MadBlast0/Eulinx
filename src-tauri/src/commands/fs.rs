// Thin native FS / dialog bridge for persisting projects.
//
// A project is a user-selected folder on disk. These commands only move bytes
// and open native pickers; all project/business logic lives in TypeScript.

use std::path::Path;

use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_fs::FsExt;

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
    let p = Path::new(&path);
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
    let dir = std::fs::read_dir(Path::new(&path)).map_err(|e| format!("read dir failed: {e}"))?;

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
