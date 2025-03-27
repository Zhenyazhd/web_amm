//use anchor_client::solana_sdk::pubkey::Pubkey;
use solana_sdk::{pubkey::Pubkey, signer::Signer as _};
use anchor_client::{
    solana_sdk::{signature::Keypair, system_program},// Signer
    Client, Cluster,
};
use solana_program::account_info::AccountInfo;
use serde::{Deserialize, Serialize};
use anchor_spl::metadata::MetadataAccount;

use solana_program::sysvar::{self, rent::Rent, SysvarId};
use std::fs;
use std::str::FromStr;
use anchor_spl::token::{Token, Mint, TokenAccount};
use serde_json::Value;
use anchor_client::solana_sdk::commitment_config::CommitmentConfig;
use anchor_lang::prelude::*;
use anchor_spl::metadata::Metadata as Metaplex;
//use serde::{Deserialize, Serialize};
use std::rc::Rc;
use anyhow::Result;
use anchor_lang::system_program::System;
//use anchor_spl::token::Mint;
use std::{env, sync::Arc};
use anyhow::{Context};
use solana_sdk::signature::Signer as SolSigner;

#[derive(AnchorSerialize, AnchorDeserialize, Debug, Clone)]
pub struct InitTokenParams {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub decimals: u8,
}

#[derive(Accounts)]
#[instruction(params: InitTokenParams)]
pub struct InitToken<'info> {
    #[account(mut)]
    pub metadata: AccountInfo<'info>,
    #[account(
        init,
        seeds = [b"mint"],
        bump,
        payer = payer,
        mint::decimals = params.decimals,
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub token_metadata_program: Program<'info, Metaplex>,
}

pub struct TokenMinter{
    client: Client<Rc<Keypair>>,
    program_id: Pubkey
}


impl TokenMinter {
    pub fn new() -> Result<Self> {

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
        let client = Client::new(Cluster::Devnet, wallet_keypair.clone());

        let program_id_str = env::var("ADDRESS_MINTX").expect("ADDRESS_MINTX must be set"); 

        let program_id = Pubkey::from_str(&program_id_str)
            .context("Invalid program ID format")?;
        
        Ok(Self { client, program_id })
    }


    pub fn get_token_info(&self, mint: Pubkey) -> Result<()> {

        let program   = self.client.program(self.program_id)
        .context("Failed to get program from client")?;

        let mint_info: Mint = program.account(mint)?;

        println!("🔍 Token Info:");
        println!("Mint: {}", mint);
        println!("Decimals: {}", mint_info.decimals);
        println!("Supply: {}", mint_info.supply);

        Ok(())
    }
}
