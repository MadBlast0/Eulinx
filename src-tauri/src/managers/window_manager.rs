use tauri::{AppHandle, LogicalSize, Manager};

use crate::ipc::{ApiError, ApiResult};

pub struct WindowManagerImpl {
    app: AppHandle,
}

impl WindowManagerImpl {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl WindowManagerImpl {
    pub fn set_title(&self, title: &str) -> ApiResult<()> {
        let window = self
            .app
            .get_webview_window("main")
            .ok_or_else(|| ApiError {
                code: "WINDOW_NOT_FOUND".into(),
                message: "main window not found".into(),
                context: None,
            })?;
        window
            .set_title(title)
            .map_err(|e| ApiError { code: "WINDOW_SET_TITLE".into(), message: e.to_string(), context: None })
    }

    pub fn set_size(&self, width: u32, height: u32) -> ApiResult<()> {
        let window = self
            .app
            .get_webview_window("main")
            .ok_or_else(|| ApiError {
                code: "WINDOW_NOT_FOUND".into(),
                message: "main window not found".into(),
                context: None,
            })?;
        window
            .set_size(LogicalSize::new(width as f64, height as f64))
            .map_err(|e| ApiError { code: "WINDOW_SET_SIZE".into(), message: e.to_string(), context: None })
    }

    pub fn minimize(&self) -> ApiResult<()> {
        let window = self
            .app
            .get_webview_window("main")
            .ok_or_else(|| ApiError {
                code: "WINDOW_NOT_FOUND".into(),
                message: "main window not found".into(),
                context: None,
            })?;
        window
            .minimize()
            .map_err(|e| ApiError { code: "WINDOW_MINIMIZE".into(), message: e.to_string(), context: None })
    }

    pub fn maximize(&self) -> ApiResult<()> {
        let window = self
            .app
            .get_webview_window("main")
            .ok_or_else(|| ApiError {
                code: "WINDOW_NOT_FOUND".into(),
                message: "main window not found".into(),
                context: None,
            })?;
        window
            .maximize()
            .map_err(|e| ApiError { code: "WINDOW_MAXIMIZE".into(), message: e.to_string(), context: None })
    }

    pub fn close(&self) -> ApiResult<()> {
        let window = self
            .app
            .get_webview_window("main")
            .ok_or_else(|| ApiError {
                code: "WINDOW_NOT_FOUND".into(),
                message: "main window not found".into(),
                context: None,
            })?;
        window
            .close()
            .map_err(|e| ApiError { code: "WINDOW_CLOSE".into(), message: e.to_string(), context: None })
    }
}
