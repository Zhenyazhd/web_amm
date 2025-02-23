import React, { useState, useCallback } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { 
    ConnectionProvider, 
    WalletProvider, 
    useWallet 
} from "@solana/wallet-adapter-react";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import axios from "axios"; // Для запросов к бэкенду

import "@solana/wallet-adapter-react-ui/styles.css";

const WalletConnect = () => {
    const { publicKey, connected } = useWallet();
    const [balance, setBalance] = useState(null);

    const fetchBalance = useCallback(async () => {
        if (!publicKey) return;
        const response = await axios.get(`http://127.0.0.1:3000/balance?address=${publicKey.toBase58()}`);
        setBalance(response.data);
    }, [publicKey]);

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>Solana Web3</h1>
            <WalletMultiButton />
            {connected && (
                <div>
                    <p>Wallet: <strong>{publicKey?.toBase58()}</strong></p>
                    <button onClick={fetchBalance}>Check Balance</button>
                    {balance && <p>{balance}</p>}
                </div>
            )}
        </div>
    );
};

const App = () => {
    return (
        <ConnectionProvider endpoint="https://api.devnet.solana.com">
            <WalletProvider wallets={[new PhantomWalletAdapter(), new SolflareWalletAdapter()]} autoConnect>
                <WalletModalProvider>
                    <WalletConnect />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;