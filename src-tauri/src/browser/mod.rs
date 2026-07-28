pub mod cdp;
pub mod commands;
pub mod manager;

// Re-export for external use if needed
#[allow(unused_imports)]
pub use manager::BrowserCdpManager;
