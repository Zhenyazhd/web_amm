use axum::{
    routing::post, 
    Router, 
    extract::Json, 
    response::IntoResponse,
};
use solana_sdk::{
    transaction::Transaction,
    commitment_config::CommitmentConfig,
};
use solana_client::rpc_client::RpcClient;
use serde::{Deserialize, Serialize};
use base64;
use bincode;

#[derive(Deserialize)]
struct DeployRequest {
    transaction: String, 
}

struct InitRequest {
    transaction: String, 
}

#[derive(Serialize)]
struct DeployResponse {
    signature: String,
}

pub async fn deploy(Json(req): Json<DeployRequest>) -> impl IntoResponse {
    let rpc_url = "https://api.devnet.solana.com";
    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());

    let tx_bytes = match base64::decode(&req.transaction) {
        Ok(bytes) => bytes,
        Err(_) => return Json(DeployResponse { signature: "Ошибка декодирования".to_string() }),
    };

    let transaction: Transaction = match bincode::deserialize(&tx_bytes) {
        Ok(tx) => tx,
        Err(_) => return Json(DeployResponse { signature: "Ошибка десериализации".to_string() }),
    };

    match client.send_and_confirm_transaction(&transaction) {
        Ok(sig) => Json(DeployResponse { signature: sig.to_string() }),
        Err(_) => Json(DeployResponse { signature: "Ошибка отправки транзакции".to_string() }),
    }
}

pub async fn init(Json(req): Json<InitRequest>) -> impl IntoResponse {
    let rpc_url = "https://api.devnet.solana.com";
    let client = RpcClient::new_with_commitment(rpc_url.to_string(), CommitmentConfig::confirmed());

    let tx_bytes = match base64::decode(&req.transaction) {
        Ok(bytes) => bytes,
        Err(_) => return Json(DeployResponse { signature: "Ошибка декодирования".to_string() }),
    };

    let transaction: Transaction = match bincode::deserialize(&tx_bytes) {
        Ok(tx) => tx,
        Err(_) => return Json(DeployResponse { signature: "Ошибка десериализации".to_string() }),
    };

    match client.send_and_confirm_transaction(&transaction) {
        Ok(sig) => Json(DeployResponse { signature: sig.to_string() }),
        Err(_) => Json(DeployResponse { signature: "Ошибка отправки транзакции".to_string() }),
    }
}