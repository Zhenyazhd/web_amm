use axum::{Json, extract::State, extract::Query, routing::post, routing::get, Router};
use mongodb::{bson::{doc, to_bson}, Collection};
use futures_util::stream::TryStreamExt; // 🔹 Добавлен импорт
use serde_json::Value;
use serde_json::json;
use std::{env, sync::Arc};
use crate::db::models::{PoolTokensRequest, GetTokenRequest, PoolTokens, Response, TokenClaims}; 
use axum::debug_handler;
use axum_extra::TypedHeader;
use axum_extra::headers::{Authorization, authorization::Bearer};
use dotenvy::dotenv;
use jsonwebtoken::{decode, DecodingKey, Validation};
use solana_client::nonblocking::rpc_client::RpcClient;
use solana_sdk::pubkey::Pubkey;
use crate::websocket::WebSocketManager;

#[derive(Clone)]
pub struct AppState {
    pub db: Arc<Collection<PoolTokens>>,
    pub ws_manager: Arc<WebSocketManager>,
}

#[debug_handler]
async fn delete_token(
    State(state): State<AppState>,
    auth_header: TypedHeader<Authorization<Bearer>>,
    Json(payload): Json<GetTokenRequest>
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
                    error: Some("Token not found".to_string())
                })
            } else {
                let notification = json!({
                    "type": "token_deleted",
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

#[debug_handler]
async fn save_token(
    State(state): State<AppState>,
    auth_header: TypedHeader<Authorization<Bearer>>,
    Json(payload): Json<PoolTokensRequest>
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

    println!("saveToken called! Token: {:?}", payload);

    let new_token = PoolTokens {
        user_id: decoded_token.id, 
        address: payload.address.clone(),
        name: payload.name.clone(), 
        symbol: payload.symbol.clone(),
        description: payload.description.clone()
    };
    let result = state.db.insert_one(new_token.clone()).await;

    match result {
        Ok(_) => {
            let notification = json!({
                "type": "token_created",
                "data": {
                    "address": new_token.address,
                    "name": new_token.name,
                    "symbol": new_token.symbol,
                    "description": new_token.description
                }
            });

            state.ws_manager.notify_token_update(&notification.to_string());

            return Json(Response {
                success: true,
                error: None
            });
        },
        Err(e) => Json(Response {
            success: false,
            error: Some(e.to_string())
        })
    }
}

#[debug_handler]
async fn update_token_details(
    State(state): State<AppState>,
    auth_header: TypedHeader<Authorization<Bearer>>,
    Json(payload): Json<PoolTokensRequest>
) -> Json<Response> {

    let token = auth_header.token(); 
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");


    let decoded_token = match decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data.claims,
        Err(_) => return Json(Response {
            success: false,
            error: Some("Error".to_string()),
        }),
    };

    let address = payload.address.clone();
    let filter = doc! { "user_id": &decoded_token.id, "address": payload.address };
    let update_doc: mongodb::bson::Document = doc! {
        "$set": {
            "name": to_bson(&payload.name).unwrap_or_default(),
            "symbol": to_bson(&payload.symbol).unwrap_or_default(),
            "description": to_bson(&payload.description).unwrap_or_default()
        }
    };
    let result = state.db.find_one_and_update(filter, update_doc).await;

    match result {
        Ok(Some(updated_token)) => {
            let notification = json!({
                "type": "token_updated",
                "data": {
                    "address": address,
                    "name": &payload.name,
                    "symbol": &payload.symbol,
                    "description": &payload.description
                }
            });

            state.ws_manager.notify_token_update(&notification.to_string());

        
            Json(Response { success: true, error: None })
        },
        Ok(None) => Json(Response { success: true, error: None }),
        Err(err) => Json(Response {
            success: false,
            error: Some("Error".to_string()),
        }),
    }
}



#[debug_handler]
async fn get_user_tokens(
    State(state): State<AppState>,
    auth_header: TypedHeader<Authorization<Bearer>>,
) -> Json<Vec<PoolTokens>> {

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
    let mut cursor = state.db.find(filter).await.unwrap();

    let mut tokens = Vec::new();
    while let Some(token) = cursor.try_next().await.unwrap() {
        tokens.push(token);
    }

    Json(tokens)
}


#[debug_handler]
async fn get_token_metadata(
    State(state): State<AppState>,
    Query(params): Query<GetTokenRequest>
) -> Json<Value>  {

    println!("GET TOKEN called! Token: {:?}", params);

    let filter = doc! { "address": &params.address };

    let rpc_url = "https://api.devnet.solana.com"; 
    let client = RpcClient::new(rpc_url.to_string());

    let mint_pubkey = match params.address.parse::<Pubkey>() {
        Ok(pubkey) => pubkey,
        Err(_) => return  Json(serde_json::json!({ "error": "not found" }))// Json(vec![]), 
    };

    let account_data = client
    .get_account_data(&mint_pubkey)
    .await
    .expect("Failed to fetch account data");

    const DECIMALS_OFFSET: usize = 44;

    let decimals = account_data
    .get(DECIMALS_OFFSET)
    .copied()
    .expect("Unable to read decimals");

    println!("Decimals: {}", decimals);


    if let Ok(Some(token)) = state.db.find_one(filter).await {
        let metadata = serde_json::json!({
            "name": token.name,
            "symbol": token.symbol,
            "description": token.description,
            "image": "",
            "decimals": decimals,
            "properties": {}
        });

        Json(metadata)
    } else {
        Json(serde_json::json!({ "error": "Token not found" }))
    }
}


pub fn token_routes(
    db: Arc<Collection<PoolTokens>>,  
    ws_manager: Arc<WebSocketManager>,    
) -> Router {
    let state = AppState { db, ws_manager };

    Router::new()
        .route("/newtoken", post(save_token))
        .route("/delete-token", post(delete_token))
        .route("/token-list", get(get_user_tokens))
        .route("/update-token", post(update_token_details))
        .route("/get-metadata", get(get_token_metadata))
        .with_state(state)  

}