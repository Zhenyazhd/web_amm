import React, { useState, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import axios from "axios";

const WalletConnect = () => {
   /*const { publicKey, connected } = useWallet();
    const [balance, setBalance] = useState(null);

    const fetchBalance = useCallback(async () => {
        if (!publicKey) return;
        try {
            const response = await axios.get(`http://127.0.0.1:3000/balance?address=${publicKey.toBase58()}`);
            setBalance(response.data);
        } catch (error) {
            console.error("Ошибка при получении баланса:", error);
        }
    }, [publicKey]);

    return (
        <div style={{ textAlign: "center", padding: "20px" }}>
            <h1>Solana Web3</h1>
            <WalletMultiButton />
            {connected && (
                <div>
                    <p>Wallet: <strong>{publicKey?.toBase58()}</strong></p>
                    <button onClick={fetchBalance}>Check Balance</button>
                    {balance && <p>Balance: {balance} SOL</p>}
                </div>
            )}
        </div>
    );*/
};

export default WalletConnect;