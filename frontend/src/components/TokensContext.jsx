import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { getData } from "../utils/api"; 
import { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { getMint } from "@solana/spl-token";

const TokensContext = createContext(null);

export const TokensProvider = ({ children }) => {
    const [forceUpdate, setForceUpdate] = useState(0);
    const [deployedTokens, setDeployedTokens] = useState([]);
    const [initializedTokens, setInitializedTokens] = useState({});

    async function isTokenInitialized(mintPubkey) {
        const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
        const endpoint = clusterApiUrl("devnet");
        const connection = new Connection(endpoint);
        
        const [metadataPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("metadata"),
                METADATA_PROGRAM_ID.toBuffer(),
                new PublicKey(mintPubkey).toBuffer(),
            ],
            METADATA_PROGRAM_ID
        );
    
        const accountInfo = await connection.getAccountInfo(metadataPda);

        if (!accountInfo) {
            return false;
        } else {
            return true
        }
    }

    const getTokenName = (address) => {
        const filteredTokens = tokens.deployedTokens.filter(token =>
            token.address.toLowerCase().includes(address.toLowerCase())
        );
        return filteredTokens[0].name;
    }

    const getTokenDecimals = (address) => {
        const filteredTokens = tokens.deployedTokens.filter(token =>
            token.address.toLowerCase().includes(address.toLowerCase())
        );
        return filteredTokens[0].decimals;
    }

    useEffect(() => {
        const fetchAndCheckTokens = async () => {
          
            const result = await getData('tokens/token-list', {}, localStorage.getItem("authToken"));

            const endpoint = clusterApiUrl("devnet");
            const connection = new Connection(endpoint);
            const statusMap = {};

            for (const el of result) {
                const mintPubkey = new PublicKey(el.address);
                const isInitialized = await isTokenInitialized(el.address);
                statusMap[el.address] = isInitialized;

                if (isInitialized) {
                    const mintInfo = await getMint(connection, mintPubkey);
                    el.decimals = mintInfo.decimals;
                }
            }
            setInitializedTokens(statusMap);
            setDeployedTokens(result);
        };

        fetchAndCheckTokens();
    }, [forceUpdate]);
    
    return (
        <TokensContext.Provider value={{
            deployedTokens,
            initializedTokens,
            getTokenName,
            setForceUpdate,
            getTokenDecimals
        }}>
            {children}
        </TokensContext.Provider>
    );
};


export const useTokens = () => {
    const context = useContext(TokensContext);
    if (!context) {
        throw new Error('TokensContext must be used within a TokensContext');
    }
    return context;
};