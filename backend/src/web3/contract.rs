use std::rc::Rc;
use std::fs;
use std::str::FromStr;
use std::error::Error;
use serde_json::Value;
use solana_sdk::signature::{Keypair, Signer};
use anchor_client::{Client, Cluster};
use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::pubkey::Pubkey;
use anyhow::{Context, Result};


pub fn connect_to_contract() -> Result<(String, String), Box<dyn Error + Send>> {
    let cluster = Cluster::Devnet;
    let wallet_path = dirs::home_dir()
        .unwrap()
        .join(".config/solana/id.json");

    let wallet_data = fs::read_to_string(wallet_path)
        .context("Failed to read wallet file")?;

    
    let json: Value = serde_json::from_str(&wallet_data)
        .context("Failed to parse JSON from wallet file")?;

    let secret_key: Vec<u8> = serde_json::from_value(json.clone())
        .context("Failed to extract secretKey from JSON")?;

    let wallet_keypair = Keypair::from_bytes(&secret_key)
        .context("Failed to create Keypair from secretKey")?;

    let wallet_keypair = Rc::new(wallet_keypair);
    let client = Client::new_with_options(cluster, wallet_keypair.clone(), CommitmentConfig::confirmed());
    let program_id_str = "HnmmjkrqcdYwy1wCvnPPF6grTim4HroDyBx7cUmwfs8L";
   
    let program_id = Pubkey::from_str(program_id_str)
        .context("Invalid program ID format")?;

    let program = client.program(program_id)
        .context("Failed to get program from client")?;

    let accounts = program.rpc().get_program_accounts(&program_id)
        .context("Failed to fetch program accounts")?;

    for (pubkey, account) in accounts {
        println!("Account: {:?}, Data Length: {}", pubkey, account.data.len());
    }
    Ok((wallet_keypair.pubkey().to_string(), program_id.to_string()))
}

/*pub fn get_balance(address: &str) -> Result<u64> {
    let rpc_url = "https://api.devnet.solana.com"; 
    let client = RpcClient::new(rpc_url);

    let pubkey = Pubkey::from_str(address).context("Invalid Solana address")?;
    let balance = client.get_balance(&pubkey).context("Failed to fetch balance")?;

    Ok(balance)
} */
