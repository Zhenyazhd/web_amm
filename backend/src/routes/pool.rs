use axum::{Json, extract::State, routing::post, routing::get,  Router};
use std::sync::Arc;
use crate::db::models::Pools;
use chrono::Utc;
use crate::db::models::{Response, TokenClaims}; 
use axum_extra::TypedHeader;
use mongodb::{bson::{doc, to_bson}, Collection};
use axum_extra::headers::{Authorization, authorization::Bearer};
use dotenvy::dotenv;
use std::{env};
use jsonwebtoken::{decode, DecodingKey, Validation};
use futures_util::stream::TryStreamExt; // 🔹 Добавлен импорт
use crate::websocket::WebSocketManager;
use serde_json::json;
use axum::debug_handler;

//use axum::{Json, extract::State, extract::Query, routing::post, routing::get, Router, response::IntoResponse};

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Collection<Pools>>,
    pub ws_manager: Arc<WebSocketManager>,
}

pub async fn save_pool(
    State(state): State<AppState>,
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>, 
    Json(payload): Json<Pools>
) -> Json<Response>  {

    dotenv().ok(); 

    let token = auth_header.token();
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let decoded_token = match decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data.claims,
        Err(_) => {
            return Json(Response {
                success: false,
                error: Some("Invalid token".to_string()),
            });
        }
    };

    let new_pool = Pools {
        id: None,
        user_id: decoded_token.id, 
        address: payload.address.clone(),
        token_x: payload.token_x.clone(), 
        token_y: payload.token_y.clone(),
        token_lp: payload.token_lp.clone(),
        created_at: Some(Utc::now().to_string()),
    };


    let result = state.db.insert_one(new_pool).await;

    match result {
        Ok(_) => {
            let notification = json!({
                "type": "pool_created",
                "data": {
                    "address": payload.address,
                    "token_x": payload.token_x,
                    "token_y": payload.token_y,
                    "token_lp": payload.token_lp,
                    "created_at": Some(Utc::now().to_string())
                }
            });

            state.ws_manager.notify_pool_update(&notification.to_string());


            Json(Response { success: true, error: None })
        },
        Err(_) => Json(Response {
            success: false,
            error: Some("Error".to_string()),
        }),
    }
}

async fn get_user_pools(
    State(state): State<AppState>,
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>, 
) -> Json<Vec<Pools>> {
    
    let token = auth_header.token(); 
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let decoded_token = match decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data.claims,
        Err(_) => return Json(vec![]),
    };

    let filter = doc! { "user_id": &decoded_token.id };
    
    match state.db.find(filter).await {
        Ok(mut cursor) => {
            let mut pools = Vec::new();
            while let Ok(Some(pool)) = cursor.try_next().await {
                pools.push(pool);
            }
            Json(pools)
        },
        Err(_) => Json(vec![])
    }
}


#[debug_handler]
async fn delete_pool(
    State(state): State<AppState>,
    auth_header: TypedHeader<Authorization<Bearer>>,
    Json(payload): Json<Pools>
) -> Json<Response> {
    dotenv().ok();

    let token = auth_header.token();
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let decoded_token = match decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data.claims,
        Err(_) => {
            return Json(Response {
                success: false,
                error: Some("Invalid token".to_string()),
            });
        }
    };

    let address = payload.address.clone();
    let filter = doc! {
        "user_id": decoded_token.id,
        "address": address.clone()
    };

    let result = state.db.delete_one(filter).await;

    match result {
        Ok(delete_result) => {
            if delete_result.deleted_count == 0 {
                Json(Response {
                    success: false,
                    error: Some("Pool not found".to_string())
                })
            } else {
                let notification = json!({
                    "type": "pool_deleted",
                    "data": {
                        "address": address
                    }
                });

                state.ws_manager.notify_token_update(&notification.to_string());

                Json(Response {
                    success: true,
                    error: None
                })
            }
        },
        Err(e) => Json(Response {
            success: false,
            error: Some(e.to_string())
        })
    }
}


/*async fn add_liquidity(Json(payload): Json<LiquidityRequest>) -> impl IntoResponse {
    let owner_pubkey = match Pubkey::from_str(&payload.owner) {
        Ok(pk) => pk,
        Err(_) => return Json(serde_json::json!({ "error": "Invalid owner address" })),
    };

    let pool_pubkey = match Pubkey::from_str(&payload.pool) {
        Ok(pk) => pk,
        Err(_) => return Json(serde_json::json!({ "error": "Invalid pool address" })),
    };


    Json(serde_json::json!({
        "success": true,
        "message": format!("Added {} SOL to pool {}", payload.amount, pool_pubkey)
    }))
}
*/




pub fn pool_routes(
    db: Arc<Collection<Pools>>,
    ws_manager: Arc<WebSocketManager>,    
) -> Router {
    let state: AppState = AppState { db, ws_manager };

    Router::new()
        .route("/save", post(save_pool))
        .route("/get-pools", get(get_user_pools))
        .route("/delete-pool", post(delete_pool))
        .with_state(state)  

} 