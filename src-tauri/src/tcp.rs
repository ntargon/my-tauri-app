use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use std::fmt;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use chrono::{Local, Utc};
use uuid::Uuid;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpMessage {
    pub host: String,
    pub port: u16,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpServerConfig {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpConnection {
    pub id: String,
    pub host: String,
    pub port: u16,
    pub connected: bool,
    pub connected_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpConnectionResult {
    pub success: bool,
    pub connection: Option<TcpConnection>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpConnectionRequest {
    pub host: String,
    pub port: u16,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpMessageOnConnection {
    pub connection_id: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpReceivedMessage {
    pub message: String,
    pub timestamp: String,
    pub client_addr: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpSendResult {
    pub success: bool,
    pub message: String,
    pub timestamp: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpReceiveResult {
    pub success: bool,
    pub messages: Vec<TcpReceivedMessage>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpMessageReceivedEvent {
    pub connection_id: String,
    pub message: TcpReceivedMessage,
}

#[derive(Debug)]
pub enum TcpError {
    ConnectionFailed(String),
    SendFailed(String),
    InvalidAddress(String),
    ServerStartFailed(String),
    ConnectionNotFound(String),
}

impl fmt::Display for TcpError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            TcpError::ConnectionFailed(msg) => write!(f, "Connection failed: {}", msg),
            TcpError::SendFailed(msg) => write!(f, "Send failed: {}", msg),
            TcpError::InvalidAddress(msg) => write!(f, "Invalid address: {}", msg),
            TcpError::ServerStartFailed(msg) => write!(f, "Server start failed: {}", msg),
            TcpError::ConnectionNotFound(msg) => write!(f, "Connection not found: {}", msg),
        }
    }
}

impl Error for TcpError {}

impl Serialize for TcpError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[tauri::command]
pub async fn send_tcp_message(tcp_message: TcpMessage) -> Result<String, TcpError> {
    let address = format!("{}:{}", tcp_message.host, tcp_message.port);
    
    // アドレスの妥当性をチェック
    if tcp_message.host.is_empty() || tcp_message.port == 0 {
        return Err(TcpError::InvalidAddress(
            "Host and port must be valid".to_string(),
        ));
    }

    // TCP接続を確立
    let mut stream = match TcpStream::connect(&address).await {
        Ok(stream) => stream,
        Err(e) => {
            return Err(TcpError::ConnectionFailed(format!(
                "Failed to connect to {}: {}",
                address, e
            )));
        }
    };

    // メッセージにCRデリミタを追加
    let message_with_cr = format!("{}\r", tcp_message.message);

    // メッセージを送信
    if let Err(e) = stream.write_all(message_with_cr.as_bytes()).await {
        return Err(TcpError::SendFailed(format!(
            "Failed to send message: {}",
            e
        )));
    }

    // 送信完了後、ストリームを閉じる
    if let Err(e) = stream.shutdown().await {
        log::warn!("Failed to shutdown stream properly: {}", e);
    }

    Ok(format!(
        "Message sent successfully to {}:{}",
        tcp_message.host, tcp_message.port
    ))
}

// TCP接続管理のためのグローバル状態
struct ConnectionData {
    writer: Arc<Mutex<tokio::net::tcp::OwnedWriteHalf>>,
    messages: Arc<Mutex<Vec<TcpReceivedMessage>>>,
    receiver_handle: Option<JoinHandle<()>>,
}

static CONNECTIONS: std::sync::OnceLock<Arc<Mutex<HashMap<String, ConnectionData>>>> = std::sync::OnceLock::new();

// 旧サーバー機能のためのグローバル状態（後方互換性）
static RECEIVED_MESSAGES: std::sync::OnceLock<Arc<Mutex<Vec<TcpReceivedMessage>>>> = std::sync::OnceLock::new();
static SERVER_HANDLE: std::sync::OnceLock<Arc<Mutex<Option<tokio::task::JoinHandle<()>>>>> = std::sync::OnceLock::new();

// アプリハンドルを保存するためのグローバル状態
static APP_HANDLE: std::sync::OnceLock<AppHandle> = std::sync::OnceLock::new();

/// AppHandleを初期化する関数
pub fn init_app_handle(app_handle: AppHandle) {
    APP_HANDLE.set(app_handle).ok();
}

#[tauri::command]
pub async fn start_tcp_server(config: TcpServerConfig) -> Result<String, TcpError> {
    let address = format!("{}:{}", config.host, config.port);
    
    // アドレスの妥当性をチェック
    if config.host.is_empty() || config.port == 0 {
        return Err(TcpError::InvalidAddress(
            "Host and port must be valid".to_string(),
        ));
    }

    // 既存のサーバーを停止
    stop_tcp_server().await.ok();

    // メッセージ履歴をクリア
    let messages = RECEIVED_MESSAGES.get_or_init(|| Arc::new(Mutex::new(Vec::new())));
    messages.lock().await.clear();

    // TCP リスナーを開始
    let listener = match TcpListener::bind(&address).await {
        Ok(listener) => listener,
        Err(e) => {
            return Err(TcpError::ServerStartFailed(format!(
                "Failed to bind to {}: {}",
                address, e
            )));
        }
    };

    let messages_clone = Arc::clone(messages);
    
    // サーバータスクを開始
    let server_task = tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    let messages = Arc::clone(&messages_clone);
                    tokio::spawn(handle_tcp_client(stream, addr.to_string(), messages));
                }
                Err(e) => {
                    log::error!("Failed to accept connection: {}", e);
                    break;
                }
            }
        }
    });

    // サーバーハンドルを保存
    let handle_storage = SERVER_HANDLE.get_or_init(|| Arc::new(Mutex::new(None)));
    *handle_storage.lock().await = Some(server_task);

    Ok(format!("TCP server started on {}", address))
}

#[tauri::command]
pub async fn stop_tcp_server() -> Result<String, TcpError> {
    let handle_storage = SERVER_HANDLE.get_or_init(|| Arc::new(Mutex::new(None)));
    let mut handle_guard = handle_storage.lock().await;
    
    if let Some(handle) = handle_guard.take() {
        handle.abort();
        Ok("TCP server stopped".to_string())
    } else {
        Ok("No server was running".to_string())
    }
}

#[tauri::command]
pub async fn get_received_messages() -> Result<TcpReceiveResult, TcpError> {
    let messages = RECEIVED_MESSAGES.get_or_init(|| Arc::new(Mutex::new(Vec::new())));
    let messages_guard = messages.lock().await;
    
    Ok(TcpReceiveResult {
        success: true,
        messages: messages_guard.clone(),
        error: None,
    })
}

async fn handle_tcp_client(
    stream: TcpStream,
    client_addr: String,
    messages: Arc<Mutex<Vec<TcpReceivedMessage>>>,
) {
    let mut reader = BufReader::new(stream);
    let mut line = String::new();

    loop {
        line.clear();
        match reader.read_line(&mut line).await {
            Ok(0) => {
                // 接続が閉じられた
                break;
            }
            Ok(_) => {
                let message = line.trim_end_matches('\r').trim_end_matches('\n');
                if !message.is_empty() {
                    let received_msg = TcpReceivedMessage {
                        message: message.to_string(),
                        timestamp: Utc::now().to_rfc3339(),
                        client_addr: client_addr.clone(),
                    };
                    
                    let mut messages_guard = messages.lock().await;
                    messages_guard.push(received_msg);
                    
                    log::info!("Received message from {}: {}", client_addr, message);
                }
            }
            Err(e) => {
                log::error!("Error reading from {}: {}", client_addr, e);
                break;
            }
        }
    }
}

// 新しい接続管理機能
#[tauri::command]
pub async fn connect_tcp(app_handle: AppHandle, request: TcpConnectionRequest) -> Result<TcpConnectionResult, TcpError> {
    // AppHandleを保存
    APP_HANDLE.set(app_handle).ok();
    let address = format!("{}:{}", request.host, request.port);
    
    // アドレスの妥当性をチェック
    if request.host.is_empty() || request.port == 0 {
        return Err(TcpError::InvalidAddress(
            "Host and port must be valid".to_string(),
        ));
    }

    // TCP接続を確立
    let stream = match TcpStream::connect(&address).await {
        Ok(stream) => stream,
        Err(e) => {
            return Err(TcpError::ConnectionFailed(format!(
                "Failed to connect to {}: {}",
                address, e
            )));
        }
    };

    // 接続IDを生成
    let connection_id = Uuid::new_v4().to_string();
    let connected_at = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();

    let connection = TcpConnection {
        id: connection_id.clone(),
        host: request.host.clone(),
        port: request.port,
        connected: true,
        connected_at,
    };

    // ストリームを読み取り用と書き込み用に分割
    let (reader, writer) = stream.into_split();
    let writer_arc = Arc::new(Mutex::new(writer));
    let messages = Arc::new(Mutex::new(Vec::new()));

    // 受信タスクを開始
    let messages_clone = Arc::clone(&messages);
    let connection_id_clone = connection_id.clone();
    
    let receiver_handle = tokio::spawn(async move {
        handle_connection_receiver(reader, connection_id_clone, messages_clone).await;
    });

    // 接続データを作成
    let connection_data = ConnectionData {
        writer: writer_arc,
        messages,
        receiver_handle: Some(receiver_handle),
    };

    // 接続を登録
    let connections = CONNECTIONS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())));
    connections.lock().await.insert(connection_id.clone(), connection_data);

    Ok(TcpConnectionResult {
        success: true,
        connection: Some(connection),
        error: None,
    })
}

#[tauri::command]
pub async fn disconnect_tcp(connection_id: String) -> Result<String, TcpError> {
    let connections = CONNECTIONS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())));
    let mut connections_guard = connections.lock().await;
    
    if let Some(mut connection_data) = connections_guard.remove(&connection_id) {
        // 受信タスクを停止
        if let Some(handle) = connection_data.receiver_handle.take() {
            handle.abort();
        }

        // 接続を閉じる
        if let Ok(mut writer) = connection_data.writer.try_lock() {
            let _ = writer.shutdown().await;
        }

        Ok("Connection closed successfully".to_string())
    } else {
        Err(TcpError::ConnectionNotFound(format!(
            "Connection with ID {} not found",
            connection_id
        )))
    }
}

#[tauri::command]
pub async fn send_tcp_message_on_connection(message_request: TcpMessageOnConnection) -> Result<TcpSendResult, TcpError> {
    let connections = CONNECTIONS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())));
    let connections_guard = connections.lock().await;
    
    if let Some(connection_data) = connections_guard.get(&message_request.connection_id) {
        let writer = Arc::clone(&connection_data.writer);
        drop(connections_guard); // Release the lock early

        // メッセージ送信時刻をRust側で生成
        let send_timestamp = Utc::now().to_rfc3339();

        // メッセージにCRデリミタを追加
        let message_with_cr = format!("{}
", message_request.message);

        // メッセージを送信
        let mut writer_guard = writer.lock().await;
        if let Err(e) = writer_guard.write_all(message_with_cr.as_bytes()).await {
            return Ok(TcpSendResult {
                success: false,
                message: format!("Failed to send message: {}", e),
                timestamp: Some(send_timestamp),
                error: Some(format!("Send failed: {}", e)),
            });
        }

        if let Err(e) = writer_guard.flush().await {
            return Ok(TcpSendResult {
                success: false,
                message: format!("Failed to flush message: {}", e),
                timestamp: Some(send_timestamp),
                error: Some(format!("Flush failed: {}", e)),
            });
        }

        Ok(TcpSendResult {
            success: true,
            message: "Message sent successfully".to_string(),
            timestamp: Some(send_timestamp),
            error: None,
        })
    } else {
        Err(TcpError::ConnectionNotFound(format!(
            "Connection with ID {} not found",
            message_request.connection_id
        )))
    }
}

#[tauri::command]
pub async fn get_received_messages_from_connection(connection_id: String) -> Result<TcpReceiveResult, TcpError> {
    let connections = CONNECTIONS.get_or_init(|| Arc::new(Mutex::new(HashMap::new())));
    let connections_guard = connections.lock().await;
    
    if let Some(connection_data) = connections_guard.get(&connection_id) {
        let messages = Arc::clone(&connection_data.messages);
        drop(connections_guard); // Release the lock early

        let messages_guard = messages.lock().await;
        
        Ok(TcpReceiveResult {
            success: true,
            messages: messages_guard.clone(),
            error: None,
        })
    } else {
        Err(TcpError::ConnectionNotFound(format!(
            "Connection with ID {} not found",
            connection_id
        )))
    }
}

async fn handle_connection_receiver(
    mut reader: tokio::net::tcp::OwnedReadHalf,
    connection_id: String,
    messages: Arc<Mutex<Vec<TcpReceivedMessage>>>,
) {
    let mut buf_reader = BufReader::new(&mut reader);
    let mut line = String::new();

    loop {
        line.clear();
        match buf_reader.read_line(&mut line).await {
            Ok(0) => {
                // Connection closed
                log::info!("Connection {} closed", connection_id);
                break;
            }
            Ok(_) => {
                let message = line.trim_end_matches('\r').trim_end_matches('\n');
                if !message.is_empty() {
                    let received_msg = TcpReceivedMessage {
                        message: message.to_string(),
                        timestamp: Utc::now().to_rfc3339(),
                        client_addr: format!("Connection {}", connection_id),
                    };
                    
                    let mut messages_guard = messages.lock().await;
                    messages_guard.push(received_msg.clone());
                    drop(messages_guard); // Release the lock early
                    
                    // イベントを発行してフロントエンドに通知
                    if let Some(app_handle) = APP_HANDLE.get() {
                        let event = TcpMessageReceivedEvent {
                            connection_id: connection_id.clone(),
                            message: received_msg,
                        };
                        
                        if let Err(e) = app_handle.emit("tcp_message_received", &event) {
                            log::error!("Failed to emit tcp_message_received event: {}", e);
                        }
                    }
                    
                    log::info!("Received message on connection {}: {}", connection_id, message);
                }
            }
            Err(e) => {
                log::error!("Error reading from connection {}: {}", connection_id, e);
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tcp_message_serialization() {
        let message = TcpMessage {
            host: "localhost".to_string(),
            port: 8080,
            message: "Hello, World!".to_string(),
        };

        let json = serde_json::to_string(&message).unwrap();
        let deserialized: TcpMessage = serde_json::from_str(&json).unwrap();

        assert_eq!(message.host, deserialized.host);
        assert_eq!(message.port, deserialized.port);
        assert_eq!(message.message, deserialized.message);
    }

    #[test]
    fn test_tcp_error_display() {
        let error = TcpError::ConnectionFailed("Connection refused".to_string());
        assert_eq!(error.to_string(), "Connection failed: Connection refused");
    }
}