use serde::{Deserialize, Serialize};
use mongodb::bson::oid::ObjectId;

#[derive(Debug, Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub email: String,
    pub password: String, 
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AuthResponse {
    pub success: bool,
    pub token: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BlacklistToken {
    pub token: String,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct TokenClaims {
    pub id: String,  
    pub email: String,
    pub exp: usize, 
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PoolTokens {
    pub user_id: String,
    pub address: String,
    pub name: String, 
    pub symbol: String, 
    pub description: String
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenByUri {
    pub name: String,
    pub symbol: String,
    pub description: String, 
    pub image: String, 
    pub decimals: String,
    pub properties: String

}


#[derive(Debug, Serialize, Deserialize)]
pub struct PoolTokensRequest {
    pub address: String,
    pub name: String, 
    pub symbol: String, 
    pub description: String
}


#[derive(Debug, Serialize, Deserialize)]
pub struct Response {
    pub success: bool,
    pub error: Option<String>,
}


#[derive(Debug, Serialize, Deserialize)]
pub struct GetTokenRequest {
    pub address: String,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Pools {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub user_id: String,
    pub address: String,
    pub token_x: String,
    pub token_y: String,
    pub token_lp: String,
    pub created_at: Option<String>,
}
