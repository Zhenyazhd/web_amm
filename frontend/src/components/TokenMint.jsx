import { TextField,Button, Box, Typography } from "@mui/material";
import { Connection, clusterApiUrl, PublicKey, Transaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createMintToInstruction
} from "@solana/spl-token";
 

const TokenMintForm = ({ address }) => {
    const { publicKey, signTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);
    const [tokenMint, setTokenMint] = useState({
        addressTo: "",
        amount: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTokenMint((prev) => ({
        ...prev,
        [name]: name === "amount" ? Number(value) : value,
        }));
    };



    const handleMint = async () => {
        setLoading(true);
        console.log('handle mint', tokenMint);

        if (!publicKey || !signTransaction) {
            alert("Connect wallet and select contract file.");
            return;
        }

        setLoading(true);
        try {
            const endpoint = clusterApiUrl("devnet");
            const connection = new Connection(endpoint);
            const mint = new PublicKey(address); 
          
            const associatedTokenAddress = await getAssociatedTokenAddress(
                mint,
                new PublicKey(tokenMint.addressTo) 
            );


            const ataAccount = await connection.getAccountInfo(associatedTokenAddress);
            const tx = new Transaction();

            if (!ataAccount) {
                tx.add(
                  createAssociatedTokenAccountInstruction(
                    publicKey, 
                    associatedTokenAddress,
                    publicKey,
                    mint 
                  )
                );
            }
            
            tx.add(
                createMintToInstruction(
                    mint, 
                    associatedTokenAddress,
                    publicKey, 
                    tokenMint.amount * 10 ** 9
                )
            );
            
            tx.feePayer = publicKey;
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
          
            const signedTx = await signTransaction(tx);
            const txid = await connection.sendRawTransaction(signedTx.serialize());
            await connection.confirmTransaction({ signature: txid, blockhash, lastValidBlockHeight });
          
            console.log("Minted tokens! Tx:", txid);
        } catch (error) {
            console.error("Deployment error:", error);
        }
        setLoading(false);
    };

    return (
        <Box 
            sx={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: 2, 
                maxWidth: 400,
                '& .MuiInputBase-root': {
                backgroundColor: 'white'
                }
            }}
        >
        <Typography variant="h6">Token: {address}</Typography>

        <TextField
            label="Address To"
            name="addressTo"
            value={tokenMint.addressTo}
            onChange={handleChange}
            fullWidth
        />

        <TextField
            label="Amount"
            name="amount"
            value={tokenMint.amount}
            onChange={handleChange}
            fullWidth
        />

        <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={handleMint} variant="contained" disabled={loading}>
            {loading ? "minting..." : "Mint"}
        </Button>
    </Box>
    );
};

export default TokenMintForm;