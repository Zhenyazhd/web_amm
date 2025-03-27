use axum::{extract::Query, response::Html};
use serde::Deserialize;
use std::error::Error;
use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use anchor_client::solana_sdk::pubkey::Pubkey;
use anchor_client::{Client, Cluster};
use std::str::FromStr;
use solana_sdk::signature::Signer;
use tokio::task;

use crate::web3::contract::connect_to_contract; 
use crate::web3::contract::get_balance;

#[derive(Deserialize)]
pub struct BalanceQuery {
    address: String,
}


pub async fn home_page() -> Html<String> {
    let result = task::spawn_blocking(connect_to_contract)
        .await 
        .expect("Failed to join blocking task"); 

    match result {
        Ok((wallet, program)) => {
            let html = format!(
                "<h1>Welcome to Web3 Project</h1>\
                <p>Wallet Address: <strong>{}</strong></p>\
                <p>Smart Contract: <strong>{}</strong></p>",
                wallet, program
            );
            Html(html)
        }
        Err(err) => Html(format!("<h1>Error</h1><p>{}</p>", err)),
    }
}

pub async fn balance(Query(params): Query<BalanceQuery>) -> Html<String>  {
    let address = params.address.clone(); 

    let result = task::spawn_blocking(move || get_balance(&address))
        .await 
        .expect("Failed to join blocking task"); 

    match result {
        Ok(balance) => Html(format!("{:.6}", balance as f64 / 1_000_000_000.0)),
        Err(e) => Html(format!("{}", e)),
    }
}