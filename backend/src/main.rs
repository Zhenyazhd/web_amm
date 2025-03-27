use axum::{
    routing::{get}, 
    Router, 
    extract::ws::{WebSocket, WebSocketUpgrade},
    http::Method,
};
use axum::http::HeaderValue;
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;
use tokio::net::TcpListener;
use mongodb::{Collection, Client};  
use crate::db::models::{User, Pools, PoolTokens, BlacklistToken};
use dotenvy::dotenv;
use tokio::sync::broadcast;  
use axum::response::IntoResponse;
mod websocket;  

use axum::http::header::{CONTENT_TYPE, ACCEPT, AUTHORIZATION};
mod routes; 
pub mod web3;
mod state; 
mod db; 
use std::sync::Arc;

use crate::websocket::{WebSocketManager, handle_websocket};

#[tokio::main]
async fn main() {
    dotenv().ok(); 

    let ws_manager = Arc::new(WebSocketManager::new());
    let client = Client::with_uri_str("mongodb://localhost:27017")
        .await
        .expect("Failed to connect to MongoDB");


    let db = db::database::connect_to_db().await.expect("Failed to connect to MongoDB");
    let db_user: Arc<Collection<User>> = Arc::new(db.collection("users")); 
    let db_black_list: Arc<Collection<BlacklistToken>> = Arc::new(db.collection("BlacklistToken")); 
    let db_pools: Arc<Collection<Pools>> = Arc::new(db.collection("UserPools")); 
    let db_token: Arc<Collection<PoolTokens>> = Arc::new(db.collection("tokens")); 

    let cors = CorsLayer::new()
        .allow_origin("http://localhost:5173".parse::<HeaderValue>().unwrap()) 
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([CONTENT_TYPE, ACCEPT, AUTHORIZATION])
        .allow_credentials(true);
    
    let app = Router::new()
        .route("/", get(routes::home::home_page))
        .route("/dashboard", get(routes::dashboard::dashboard_page))
        .route("/balance", get(routes::home::balance))
        .route("/ws", get(ws_handler))  
        .with_state(ws_manager.clone())  
        .nest("/pool", routes::pool::pool_routes(db_pools.clone(), ws_manager.clone())) 
        .nest("/auth", routes::auth::auth_routes(db_user.clone(), db_black_list.clone()))
        .nest("/tokens", routes::token::token_routes(db_token.clone(), ws_manager.clone()))
        .layer(cors);

 
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server running on http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app) 
    .await
    .unwrap();
}


async fn ws_handler(
    ws: WebSocketUpgrade,
    axum::extract::State(ws_manager): axum::extract::State<Arc<WebSocketManager>>,
) -> impl IntoResponse {
    let ws_manager = ws_manager.clone();
    ws.on_upgrade(move |socket| handle_websocket(socket, ws_manager.tx.subscribe()))
}