use axum::{
    routing::get, 
    Router, 
    response::Html,
    http::Method,
};
use tower_http::cors::{CorsLayer, Any};
use std::net::SocketAddr;
use tokio::net::TcpListener;

mod routes; 
pub mod web3;


#[tokio::main]
async fn main() {

    let cors = CorsLayer::new()
        .allow_origin(Any)  
        .allow_methods([Method::GET, Method::POST]); 

    let app = Router::new()
        .route("/", get(routes::home::home_page))
        .route("/dashboard", get(routes::dashboard::dashboard_page))
        //.route("/balance", get(routes::home::balance))
        .layer(cors);


    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server running on http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    //  превращает Router в сервис, который можно использовать с axum::serve().
    axum::serve(listener, app.into_make_service()) // запускает сервер, который обрабатывает запросы с помощью app.
        .await
        .unwrap(); // ждет завершения работы сервера и останавливает программу, если возникает ошибка.
}

