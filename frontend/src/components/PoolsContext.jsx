import React, { useState, createContext, useContext, useEffect, useRef } from 'react';
import { getData } from "../utils/api"; 
import { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { getMint } from "@solana/spl-token";

const PoolsContext = createContext(null);

export const PoolsProvider = ({ children }) => {
    const [forceUpdate, setForceUpdate] = useState(0);
    const [userPools, setUserPools] = useState([]);

    useEffect(() => {
        const fetchAndCheckTokens = async (changed) => {
            if(!changed){
                const cachedPools = localStorage.getItem('cachedPools');
                const cachedTimestamp = localStorage.getItem('poolsCacheTimestamp');
                const cacheExpiry = 5 * 60 * 1000;

                if (cachedPools && cachedTimestamp && (Date.now() - parseInt(cachedTimestamp)) < cacheExpiry) {
                    const {pools, statusMap} = JSON.parse(cachedPools);
                    setUserPools(pools);
                    return;
                }
            }

            const result = await getData('pool/get-pools', {}, localStorage.getItem("authToken"));
            
            localStorage.setItem('cachedPools', result);
            localStorage.setItem('tokensCacheTimestamp', Date.now().toString());
            setUserPools(result);  
        };

        if (forceUpdate) {
            fetchAndCheckTokens(true); 
        }

        fetchAndCheckTokens(false);
    }, [forceUpdate]);
    
    return (
        <PoolsContext.Provider value={{
            userPools,
            setForceUpdate
        }}>
            {children}
        </PoolsContext.Provider>
    );
};


export const usePools = () => {
    const context = useContext(PoolsContext);
    if (!context) {
        throw new Error('PoolsContext must be used within a PoolsContext');
    }
    return context;
};