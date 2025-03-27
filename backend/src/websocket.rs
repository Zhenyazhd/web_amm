use tokio::sync::broadcast;
use serde_json::json;
use axum::extract::ws::{WebSocket, Message};  
use futures_util::{SinkExt, StreamExt};

pub struct WebSocketManager {
    pub tx: broadcast::Sender<String>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self { tx }
    }

    pub fn notify_pool_update(&self, pool_data: &str) {
        let _ = self.tx.send(pool_data.to_string());
    }

    pub fn notify_token_update(&self, token_data: &str) {
        let _ = self.tx.send(token_data.to_string());
    }
}

pub async fn handle_websocket(socket: WebSocket, mut rx: broadcast::Receiver<String>) {
    let (mut sender, mut receiver) = socket.split();
    
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            println!("Received: {}", text);
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };
}