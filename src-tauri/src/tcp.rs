use serde::{Deserialize, Serialize};
use std::error::Error;
use std::fmt;
use tokio::io::AsyncWriteExt;
use tokio::net::TcpStream;

#[derive(Debug, Serialize, Deserialize)]
pub struct TcpMessage {
    pub host: String,
    pub port: u16,
    pub message: String,
}

#[derive(Debug)]
pub enum TcpError {
    ConnectionFailed(String),
    SendFailed(String),
    InvalidAddress(String),
}

impl fmt::Display for TcpError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            TcpError::ConnectionFailed(msg) => write!(f, "Connection failed: {}", msg),
            TcpError::SendFailed(msg) => write!(f, "Send failed: {}", msg),
            TcpError::InvalidAddress(msg) => write!(f, "Invalid address: {}", msg),
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