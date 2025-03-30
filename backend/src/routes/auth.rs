use axum::{Json, extract::State, routing::post, routing::get, Router, response::IntoResponse};
use bcrypt::{hash, verify, DEFAULT_COST};
use mongodb::{bson::doc, Collection};
use serde_json::json;
use std::{env, sync::Arc};
//use axum::extract::TypedHeader;
use jsonwebtoken::{encode, decode, EncodingKey, DecodingKey, Header, Validation};
use axum_extra::headers::{Authorization, authorization::Bearer};
use axum_extra::TypedHeader;
use crate::db::models::{User, AuthRequest, AuthResponse, BlacklistToken, TokenClaims}; 
use axum::debug_handler;

#[debug_handler]
async fn register(
    State(db): State<Arc<Collection<User>>>,
    Json(payload): Json<AuthRequest>
) -> Json<AuthResponse> {

    println!("register called! Тoken: {:?}", payload);

    
    let hashed_password = match hash(&payload.password, DEFAULT_COST) {
        Ok(pwd) => pwd,
        Err(_) => return Json(AuthResponse {
            success: false,
            token: None,
            error: Some("Ошибка хеширования".to_string()),
        }),
    };

    let new_user = User {
        id: None,
        email: payload.email.clone(),
        password: hashed_password,
    };

    let result = db.insert_one(new_user).await;

    match result {
        Ok(_) => Json(AuthResponse { success: true, token: None, error: None }),
        Err(_) => Json(AuthResponse {
            success: false,
            token: None,
            error: Some("Ошибка регистрации".to_string()),
        }),
    }
}

#[debug_handler]
async fn login(
    State(db): State<Arc<Collection<User>>>,
    Json(payload): Json<AuthRequest>
) -> Json<AuthResponse> {
    println!("LOGIN");


    let user = match db.find_one(doc! { "email": &payload.email }).await {
        Ok(user) => user,
        Err(err) => {
            eprintln!("DB error: {:?}", err);
            return Json(AuthResponse {
                success: false,
                token: None,
                error: Some("error".to_string()),
            });
        }
    };
    //println!("user {:?}", user);

    if let Some(user) = user {
        if verify(&payload.password, &user.password).unwrap() {
            let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
            let claims = TokenClaims {
                id: user.id.clone().unwrap_or_default().to_hex(),
                email: user.email.clone(),
                exp: (chrono::Utc::now() + chrono::Duration::days(1)).timestamp() as usize,
            };
            let token = encode(
                &Header::default(),
                &claims,
                &EncodingKey::from_secret(secret.as_bytes()),
            ).unwrap();


            return Json(AuthResponse { success: true, token: Some(token), error: None });
        }
    }

    Json(AuthResponse {
        success: false,
        token: None,
        error: Some("Error".to_string()),
    })
}


#[debug_handler]
async fn logout(
    State(db): State<Arc<Collection<BlacklistToken>>>, 
    Json(payload): Json<BlacklistToken>
) -> Json<AuthResponse> {
    println!("LOGOUT called! Тoken: {:?}", payload.token);

    let exists = db.find_one(doc! { "token": &payload.token }).await.unwrap();
    if exists.is_some() {
        return Json(AuthResponse {
            success: false,
            token: None,
            error: Some("Token error".to_string()),
        });
    }

    let result = db.insert_one(payload).await;
    match result {
        Ok(_) => Json(AuthResponse { success: true, token: None, error: None }),
        Err(_) => Json(AuthResponse {
            success: false,
            token: None,
            error: Some("error".to_string()),
        }),
    }
}



#[debug_handler]
async fn validate_token(
    TypedHeader(auth_header): TypedHeader<Authorization<Bearer>>,
    State(db): State<Arc<Collection<BlacklistToken>>>,
) -> impl IntoResponse {
    let token = auth_header.token(); 
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");

    let blacklisted = db.find_one(doc! { "token": token }).await.unwrap();
    if blacklisted.is_some() {
        return Json(json!({ "valid": false, "error": "Token blocked" }));
    }

    match decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(_) => Json(json!({ "valid": true })),
        Err(_) => Json(json!({ "valid": false })),
    }
}


pub fn auth_routes(
    db: Arc<Collection<User>>,    
    blacklist_db: Arc<Collection<BlacklistToken>>
) -> Router {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
        .with_state(db)
        .route("/logout", post(logout))
        .route("/validate", get(validate_token))
        .with_state(blacklist_db)

}