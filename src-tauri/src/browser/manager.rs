use crate::browser::cdp::*;
use futures_util::{SinkExt, StreamExt};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message as WsMessage};

type WebSocketSender = futures_util::stream::SplitSink<
    tokio_tungstenite::WebSocketStream<
        tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>
    >,
    WsMessage
>;

/// Manages CDP connection to WebView2
pub struct BrowserCdpManager {
    current_url: Arc<RwLock<String>>,
    current_title: Arc<RwLock<String>>,
    console_logs: Arc<RwLock<Vec<ConsoleLog>>>,
    errors: Arc<RwLock<Vec<JsError>>>,
    network_requests: Arc<RwLock<Vec<NetworkRequest>>>,
    event_tx: broadcast::Sender<BrowserEvent>,
    connected: Arc<RwLock<bool>>,
    ws_sender: Arc<Mutex<Option<WebSocketSender>>>,
    next_id: Arc<AtomicU64>,
}

impl BrowserCdpManager {
    pub fn new() -> Self {
        let (event_tx, _) = broadcast::channel(100);
        
        Self {
            current_url: Arc::new(RwLock::new("about:blank".to_string())),
            current_title: Arc::new(RwLock::new("".to_string())),
            console_logs: Arc::new(RwLock::new(Vec::new())),
            errors: Arc::new(RwLock::new(Vec::new())),
            network_requests: Arc::new(RwLock::new(Vec::new())),
            event_tx,
            connected: Arc::new(RwLock::new(false)),
            ws_sender: Arc::new(Mutex::new(None)),
            next_id: Arc::new(AtomicU64::new(1)),
        }
    }

    /// Subscribe to browser events
    #[allow(dead_code)]
    pub fn subscribe(&self) -> broadcast::Receiver<BrowserEvent> {
        self.event_tx.subscribe()
    }

    /// Check if connected to CDP
    pub async fn is_connected(&self) -> bool {
        *self.connected.read().await
    }

    /// Connect to CDP WebSocket
    pub async fn connect(&self) -> Result<(), String> {
        // Check if already connected
        if *self.connected.read().await {
            return Ok(());
        }

        // Discover WebSocket URL from CDP
        let ws_url = self.discover_websocket_url().await?;

        // Connect to WebSocket
        let (ws_stream, _) = connect_async(&ws_url)
            .await
            .map_err(|e| format!("Failed to connect to CDP WebSocket: {}", e))?;

        let (write, read) = ws_stream.split();
        
        // Store the sender
        *self.ws_sender.lock().await = Some(write);
        *self.connected.write().await = true;

        // Spawn message handler
        let manager = self.clone_refs();
        tokio::spawn(async move {
            manager.handle_messages(read).await;
        });

        // Enable CDP domains
        self.enable_domains().await?;

        Ok(())
    }

    /// Discover CDP WebSocket URL
    async fn discover_websocket_url(&self) -> Result<String, String> {
        let client = reqwest::Client::new();
        let response = client
            .get("http://localhost:9222/json")
            .send()
            .await
            .map_err(|e| format!("Failed to discover CDP endpoint: {}. Is remote debugging enabled?", e))?;

        let targets: Vec<CdpTarget> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse CDP targets: {}", e))?;

        // Find the first page target
        let target = targets
            .iter()
            .find(|t| t.target_type == "page")
            .ok_or_else(|| "No page target found".to_string())?;

        Ok(target.web_socket_debugger_url.clone())
    }

    /// Enable required CDP domains
    async fn enable_domains(&self) -> Result<(), String> {
        // Enable Runtime domain for console and errors
        self.send_command("Runtime.enable", serde_json::json!({})).await?;
        
        // Enable Console domain
        self.send_command("Console.enable", serde_json::json!({})).await?;
        
        // Enable Network domain
        self.send_command("Network.enable", serde_json::json!({})).await?;
        
        // Enable Page domain for navigation
        self.send_command("Page.enable", serde_json::json!({})).await?;

        Ok(())
    }

    /// Send CDP command
    async fn send_command(&self, method: &str, params: serde_json::Value) -> Result<serde_json::Value, String> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        
        let request = CdpRequest {
            id,
            method: method.to_string(),
            params,
        };

        let message = serde_json::to_string(&request)
            .map_err(|e| format!("Failed to serialize CDP request: {}", e))?;

        let mut sender = self.ws_sender.lock().await;
        if let Some(ws) = sender.as_mut() {
            ws.send(WsMessage::Text(message.into()))
                .await
                .map_err(|e| format!("Failed to send CDP command: {}", e))?;
            
            // For now, return empty result - in production, implement request/response matching
            Ok(serde_json::json!({}))
        } else {
            Err("Not connected to CDP".to_string())
        }
    }

    /// Handle incoming WebSocket messages
    async fn handle_messages(&self, mut read: futures_util::stream::SplitStream<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>>) {
        while let Some(msg) = read.next().await {
            match msg {
                Ok(WsMessage::Text(text)) => {
                    if let Err(e) = self.process_message(&text).await {
                        log::error!("Failed to process CDP message: {}", e);
                    }
                }
                Ok(WsMessage::Close(_)) => {
                    log::info!("CDP WebSocket closed");
                    *self.connected.write().await = false;
                    break;
                }
                Err(e) => {
                    log::error!("CDP WebSocket error: {}", e);
                    *self.connected.write().await = false;
                    break;
                }
                _ => {}
            }
        }
    }

    /// Process CDP message
    async fn process_message(&self, text: &str) -> Result<(), String> {
        // Try to parse as event
        if let Ok(event) = serde_json::from_str::<CdpEvent>(text) {
            self.handle_event(event).await?;
        }
        // Otherwise it might be a response (we'd need to implement response handling)
        
        Ok(())
    }

    /// Handle CDP event
    async fn handle_event(&self, event: CdpEvent) -> Result<(), String> {
        match event.method.as_str() {
            "Runtime.consoleAPICalled" => {
                self.handle_console_api(&event.params).await?;
            }
            "Runtime.exceptionThrown" => {
                self.handle_exception(&event.params).await?;
            }
            "Network.requestWillBeSent" => {
                self.handle_network_request(&event.params).await?;
            }
            "Network.responseReceived" => {
                self.handle_network_response(&event.params).await?;
            }
            "Network.loadingFailed" => {
                self.handle_network_failed(&event.params).await?;
            }
            _ => {}
        }

        Ok(())
    }

    /// Handle console API call
    async fn handle_console_api(&self, params: &serde_json::Value) -> Result<(), String> {
        let type_str = params["type"].as_str().unwrap_or("log");
        let level = match type_str {
            "warning" => ConsoleLevel::Warning,
            "error" => ConsoleLevel::Error,
            "info" => ConsoleLevel::Info,
            "debug" => ConsoleLevel::Debug,
            _ => ConsoleLevel::Log,
        };

        let args = params["args"].as_array().unwrap_or(&vec![]).clone();
        
        // Extract text from arguments
        let text = args
            .iter()
            .filter_map(|arg| arg["value"].as_str().or_else(|| arg["description"].as_str()))
            .collect::<Vec<_>>()
            .join(" ");

        let stack_trace = params["stackTrace"]["callFrames"].as_array();
        let (url, line, column) = if let Some(frames) = stack_trace {
            if let Some(frame) = frames.first() {
                (
                    frame["url"].as_str().map(|s| s.to_string()),
                    frame["lineNumber"].as_i64().map(|n| n as i32),
                    frame["columnNumber"].as_i64().map(|n| n as i32),
                )
            } else {
                (None, None, None)
            }
        } else {
            (None, None, None)
        };

        let timestamp = params["timestamp"].as_f64().unwrap_or(chrono::Utc::now().timestamp_millis() as f64);

        let log = ConsoleLog {
            level,
            text,
            url,
            line,
            column,
            timestamp,
            args,
        };

        self.console_logs.write().await.push(log.clone());
        let _ = self.event_tx.send(BrowserEvent::ConsoleLogAdded { log });

        Ok(())
    }

    /// Handle JavaScript exception
    async fn handle_exception(&self, params: &serde_json::Value) -> Result<(), String> {
        let exception_details = &params["exceptionDetails"];
        let exception = &exception_details["exception"];
        
        let message = exception["description"]
            .as_str()
            .or_else(|| exception_details["text"].as_str())
            .unwrap_or("Unknown error")
            .to_string();

        let url = exception_details["url"].as_str().map(|s| s.to_string());
        let line = exception_details["lineNumber"].as_i64().map(|n| n as i32);
        let column = exception_details["columnNumber"].as_i64().map(|n| n as i32);

        let stack_trace = exception_details["stackTrace"]["callFrames"]
            .as_array()
            .map(|frames| {
                frames
                    .iter()
                    .filter_map(|frame| {
                        let url = frame["url"].as_str()?;
                        let line = frame["lineNumber"].as_i64()?;
                        let col = frame["columnNumber"].as_i64()?;
                        let func = frame["functionName"].as_str().unwrap_or("<anonymous>");
                        Some(format!("    at {} ({}:{}:{})", func, url, line, col))
                    })
                    .collect::<Vec<_>>()
                    .join("\n")
            });

        let timestamp = exception_details["timestamp"]
            .as_f64()
            .unwrap_or(chrono::Utc::now().timestamp_millis() as f64);

        let error = JsError {
            message,
            url,
            line,
            column,
            stack_trace,
            timestamp,
        };

        self.errors.write().await.push(error.clone());
        let _ = self.event_tx.send(BrowserEvent::ErrorAdded { error });

        Ok(())
    }

    /// Handle network request
    async fn handle_network_request(&self, params: &serde_json::Value) -> Result<(), String> {
        let request_id = params["requestId"].as_str().unwrap_or("").to_string();
        let request = &params["request"];
        let url = request["url"].as_str().unwrap_or("").to_string();
        let method = request["method"].as_str().unwrap_or("GET").to_string();
        let timestamp = params["timestamp"].as_f64().unwrap_or(chrono::Utc::now().timestamp_millis() as f64);

        let network_request = NetworkRequest {
            request_id: request_id.clone(),
            url,
            method,
            status: None,
            mime_type: None,
            error: None,
            timestamp,
        };

        self.network_requests.write().await.push(network_request.clone());
        let _ = self.event_tx.send(BrowserEvent::NetworkRequestAdded { request: network_request });

        Ok(())
    }

    /// Handle network response
    async fn handle_network_response(&self, params: &serde_json::Value) -> Result<(), String> {
        let request_id = params["requestId"].as_str().unwrap_or("");
        let response = &params["response"];
        let status = response["status"].as_i64().map(|n| n as i32);
        let mime_type = response["mimeType"].as_str().map(|s| s.to_string());

        // Update existing request
        let mut requests = self.network_requests.write().await;
        if let Some(req) = requests.iter_mut().find(|r| r.request_id == request_id) {
            req.status = status;
            req.mime_type = mime_type;
        }

        Ok(())
    }

    /// Handle network loading failed
    async fn handle_network_failed(&self, params: &serde_json::Value) -> Result<(), String> {
        let request_id = params["requestId"].as_str().unwrap_or("");
        let error = params["errorText"].as_str().map(|s| s.to_string());

        // Update existing request
        let mut requests = self.network_requests.write().await;
        if let Some(req) = requests.iter_mut().find(|r| r.request_id == request_id) {
            req.error = error;
        }

        Ok(())
    }

    /// Navigate to URL
    pub async fn navigate(&self, url: &str) -> Result<(), String> {
        self.send_command("Page.navigate", serde_json::json!({ "url": url })).await?;
        *self.current_url.write().await = url.to_string();
        let _ = self.event_tx.send(BrowserEvent::UrlChanged { url: url.to_string() });
        Ok(())
    }

    /// Reload the page
    pub async fn reload(&self) -> Result<(), String> {
        self.send_command("Page.reload", serde_json::json!({})).await?;
        Ok(())
    }

    /// Get current browser snapshot
    pub async fn get_snapshot(&self) -> BrowserSnapshot {
        BrowserSnapshot {
            url: self.current_url.read().await.clone(),
            title: self.current_title.read().await.clone(),
            console_logs: self.console_logs.read().await.clone(),
            errors: self.errors.read().await.clone(),
            network_requests: self.network_requests.read().await.clone(),
        }
    }

    /// Clear console logs
    pub async fn clear_console(&self) {
        self.console_logs.write().await.clear();
    }

    /// Clear errors
    pub async fn clear_errors(&self) {
        self.errors.write().await.clear();
    }

    /// Clear network requests
    pub async fn clear_network(&self) {
        self.network_requests.write().await.clear();
    }

    /// Clone internal references for spawned tasks
    fn clone_refs(&self) -> Self {
        Self {
            current_url: Arc::clone(&self.current_url),
            current_title: Arc::clone(&self.current_title),
            console_logs: Arc::clone(&self.console_logs),
            errors: Arc::clone(&self.errors),
            network_requests: Arc::clone(&self.network_requests),
            event_tx: self.event_tx.clone(),
            connected: Arc::clone(&self.connected),
            ws_sender: Arc::clone(&self.ws_sender),
            next_id: Arc::clone(&self.next_id),
        }
    }
}

impl Default for BrowserCdpManager {
    fn default() -> Self {
        Self::new()
    }
}
