import { TextField,Button, Box, Typography } from "@mui/material";
import { Connection, clusterApiUrl, PublicKey, SYSVAR_RENT_PUBKEY, Transaction, TransactionInstruction, SystemProgram, Keypair } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { 
    createMetadataAccountV3,
    mplTokenMetadata
} from "@metaplex-foundation/mpl-token-metadata";

//    "@solana-program/system": "^0.5.0",
//    "@solana-program/token": "^0.4.1",

import { fromWeb3JsKeypair, fromWeb3JsPublicKey, toWeb3JsPublicKey } from "@metaplex-foundation/umi-web3js-adapters";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { createSignerFromKeypair,TransactionBuilder, signerIdentity, none } from "@metaplex-foundation/umi";
import { getData, postData } from "../utils/api"; 

const TokenMetadataForm = ({ address }) => {
    const { publicKey, signTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);
    const [tokenData, setTokenData] = useState({
        name: "",
        symbol: "",
        uri: "",
        description: ""
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTokenData((prev) => ({
        ...prev,
        [name]: name === "decimals" ? Number(value) : value,
        }));
    };



    const handleInit = async () => {
        setLoading(true);

        console.log('handle init', tokenData);

        if (!publicKey || !signTransaction) {
            alert("Connect wallet and select contract file.");
            return;
        }


        setLoading(true);
        try {
            const uribase = 'http://localhost:3000/tokens/get-metadata?address='
            const endpoint = clusterApiUrl("devnet");
            const connection = new Connection(endpoint);
            const umi = createUmi(endpoint);
            umi.use(mplTokenMetadata());
        

            const mint = new PublicKey(address); 
            const payer = publicKey; 
            const metaplexProgramId = new PublicKey(
              "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
            );
        

            const [metadataPda] = PublicKey.findProgramAddressSync(
                [
                Buffer.from("metadata"),
                metaplexProgramId.toBuffer(),
                mint.toBuffer(),
                ],
                metaplexProgramId
            );

            console.log(tokenData);

            const builder = createMetadataAccountV3(umi, {
                    metadata: fromWeb3JsPublicKey(metadataPda),
                    mint: fromWeb3JsPublicKey(mint),
                    payer: fromWeb3JsPublicKey(payer),
                    mintAuthority: fromWeb3JsPublicKey(payer),
                    updateAuthority: fromWeb3JsPublicKey(payer),
                    data: {
                        name: tokenData.name,
                        symbol: tokenData.symbol,
                        uri: uribase + address,
                        sellerFeeBasisPoints: 0,
                        creators: none(),
                        collection: none(),
                        uses: none(),
                    },
                    isMutable: true,
                    collectionDetails: none(),
            });
        
            let ix = builder.getInstructions()[0];

            ix.keys = ix.keys.map(k => ({
                ...k,
                pubkey: toWeb3JsPublicKey(k.pubkey)
            }));
            ix.programId = toWeb3JsPublicKey(ix.programId); 
              
           
            const tx = new Transaction().add(ix);
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
            tx.feePayer = publicKey;
            tx.recentBlockhash = blockhash;

            const signedTx = await signTransaction(tx); 
            const signature = await connection.sendRawTransaction(signedTx.serialize());
    
            await connection.confirmTransaction(
              {
                signature,
                blockhash: blockhash,
                lastValidBlockHeight: lastValidBlockHeight,
              },
              "confirmed"
            );
        
            console.log("Metadata initialized!", signature);  
            const result = await postData('tokens/update-token', { address: mint.toBase58(), name: tokenData.name, symbol: tokenData.symbol, description: tokenData.description}, localStorage.getItem("authToken")); 
            console.log(result);
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
        <Typography variant="h6">Token Metadata {address}</Typography>

        <TextField
            label="Token Name"
            name="name"
            type="string"
            value={tokenData.name}
            onChange={handleChange}
            fullWidth
        />

        <TextField
            label="Symbol"
            name="symbol"
            type="string"
            value={tokenData.symbol}
            onChange={handleChange}
            fullWidth
        />

        <TextField
            label="Description"
            name="description"
            type="string"
            value={tokenData.description}
            onChange={handleChange}
            fullWidth
        />

            <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={handleInit} variant="contained" disabled={loading}>
                                {loading ? "initializing..." : "INIT MY TOKEN"}
            </Button>
        </Box>
    );
};

export default TokenMetadataForm;