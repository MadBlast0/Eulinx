use crate::browser::cdp::BrowserSnapshot;
use crate::browser::manager::BrowserCdpManager;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Global browser manager state
pub struct BrowserState {
    pub manager: Arc<RwLock<BrowserCdpManager>>,
}

impl BrowserState {
    pub fn new() -> Self {
        Self {
            manager: Arc::new(RwLock::new(BrowserCdpManager::new())),
        }
    }
}

impl Default for BrowserState {
    fn default() -> Self {
        Self::new()
    }
}

/// Connect to CDP (should be called on app startup)
#[tauri::command]
pub async fn browser_connect(state: State<'_, BrowserState>) -> Result<(), String> {
    let manager = state.manager.read().await;
    manager.connect().await
}

/// Check if browser is connected to CDP
#[tauri::command]
pub async fn browser_is_connected(state: State<'_, BrowserState>) -> Result<bool, String> {
    let manager = state.manager.read().await;
    Ok(manager.is_connected().await)
}

/// Navigate to a URL
#[tauri::command]
pub async fn browser_navigate(state: State<'_, BrowserState>, url: String) -> Result<(), String> {
    let manager = state.manager.read().await;
    
    // Ensure we're connected
    if !manager.is_connected().await {
        manager.connect().await?;
    }
    
    manager.navigate(&url).await
}

/// Reload the current page
#[tauri::command]
pub async fn browser_reload(state: State<'_, BrowserState>) -> Result<(), String> {
    let manager = state.manager.read().await;
    manager.reload().await
}

/// Get current browser snapshot (URL, title, console logs, errors, network requests)
#[tauri::command]
pub async fn browser_get_snapshot(state: State<'_, BrowserState>) -> Result<BrowserSnapshot, String> {
    let manager = state.manager.read().await;
    Ok(manager.get_snapshot().await)
}

/// Clear console logs
#[tauri::command]
pub async fn browser_clear_console(state: State<'_, BrowserState>) -> Result<(), String> {
    let manager = state.manager.read().await;
    manager.clear_console().await;
    Ok(())
}

/// Clear error logs
#[tauri::command]
pub async fn browser_clear_errors(state: State<'_, BrowserState>) -> Result<(), String> {
    let manager = state.manager.read().await;
    manager.clear_errors().await;
    Ok(())
}

/// Clear network requests
#[tauri::command]
pub async fn browser_clear_network(state: State<'_, BrowserState>) -> Result<(), String> {
    let manager = state.manager.read().await;
    manager.clear_network().await;
    Ok(())
}

/// Clear all browser data (console, errors, network)
#[tauri::command]
pub async fn browser_clear_all(state: State<'_, BrowserState>) -> Result<(), String> {
    let manager = state.manager.read().await;
    manager.clear_console().await;
    manager.clear_errors().await;
    manager.clear_network().await;
    Ok(())
}
