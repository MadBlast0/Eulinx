use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

use crate::ipc::ApiResult;
use crate::managers::DialogManager;

pub struct DialogManagerImpl {
    app: AppHandle,
}

impl DialogManagerImpl {
    pub fn new(app: AppHandle) -> Self {
        Self { app }
    }
}

impl DialogManager for DialogManagerImpl {
    fn open_file(&self, filter: Option<&str>) -> ApiResult<Option<String>> {
        let builder = self.app.dialog().file();
        let builder = if let Some(f) = filter {
            builder.add_filter("Filter", &[f])
        } else {
            builder
        };
        Ok(builder.blocking_pick_file().map(|p| p.to_string()))
    }

    fn save_file(&self, default_name: &str) -> ApiResult<Option<String>> {
        Ok(self
            .app
            .dialog()
            .file()
            .set_file_name(default_name)
            .blocking_save_file()
            .map(|p| p.to_string()))
    }

    fn confirm(&self, title: &str, message: &str) -> ApiResult<bool> {
        Ok(self.app.dialog().message(message).title(title).blocking_show())
    }
}
