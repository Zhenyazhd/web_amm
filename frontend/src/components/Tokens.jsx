import { useState, useEffect} from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, clusterApiUrl, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { postData } from "../utils/api"; 
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction } from "@solana/spl-token";

import TokenMetadataForm from "./TokenMetadata";
import TokenMintForm from "./TokenMint";
import { useWebSocket } from '../components/WebSocketContext';
import { useTokens } from '../components/TokensContext';


const Tokens = () => {
    const { publicKey, signTransaction, connected } = useWallet();
    const [loading, setLoading] = useState(false);
    const [init, setInit] = useState({
        statusInit: false,
        statusMint: false,
        address: ''
    });
    const [tx, setTx] = useState("");
    const ws = useWebSocket();
    const tokens = useTokens();


    useEffect(() => {
        const fetchAndCheckTokens = () => {
            if (ws) {
                ws.onmessage = async (event) => {
                    const data = JSON.parse(event.data);
                    if( data.type === "token_updated"|| data.type === "token_created" || data.type === "token_deleted"){
                        tokens.setForceUpdate(prev => prev + 1);
                    }
                };
            }
    
        };

        fetchAndCheckTokens();
    }, [ws]);
    

    const handleInit = async (address) => {
        setInit({statusInit: true, statusMint: false, address: address});
    };

    const handleMint = async (address) => {
        setInit({statusInit: false, statusMint: true, address: address});
    };

    const handleClose = async () => {
        setInit({statusInit: false, statusMint: false, address: undefined});
    };

    const handleDeploy = async (e) => {
        if (!publicKey || !signTransaction) {
            alert("Connect wallet and select contract file.");
            return;
        }

        setLoading(true);

        try{
            const endpoint = clusterApiUrl("devnet");
            const connection = new Connection(endpoint);
            const mint = await Keypair.generate();
            const mintRent = await connection.getMinimumBalanceForRentExemption(82);
            const createMintTx = new Transaction().add(
                SystemProgram.createAccount({
                    fromPubkey: publicKey,
                    newAccountPubkey: mint.publicKey,
                    space: 82,
                    lamports: mintRent,
                    programId: TOKEN_PROGRAM_ID,
                }),
                createInitializeMintInstruction(
                    mint.publicKey, 
                    9, 
                    publicKey, 
                    null,
                    TOKEN_PROGRAM_ID
                )
            );

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

            createMintTx.feePayer = publicKey;
            createMintTx.recentBlockhash = blockhash;
            createMintTx.partialSign(mint);

            const signedTx = await signTransaction(createMintTx);
            const txId = await connection.sendRawTransaction(signedTx.serialize());
            const confirmationStrategy = {
                signature: txId,
                blockhash: blockhash,
                lastValidBlockHeight: lastValidBlockHeight 
            };
    
            await connection.confirmTransaction(confirmationStrategy, "confirmed");
            setTx(txId);
            const result = await postData('tokens/newtoken', { address: mint.publicKey.toBase58(), name: '', symbol: '', description: ''}, localStorage.getItem("authToken")); 
        }catch(er){
            console.log('ERROR:', er);
        }
        
        setLoading(false);
    }

    const handleDelete = async (address) => {
        const result = await postData('tokens/delete-token', { address: address, name: '', symbol: '', description: ''}, localStorage.getItem("authToken")); 
    }

    return (
        <Box sx={{ 
            border: "2px solid red",
            display: "flex", 
            flexDirection: "column", 
            alignItems: "center",
            justifyContent: "center", 
            height: "100vh", 
            width: "100vw", 
            margin: "auto",
            gap: 4
        }}>
         
            {init.statusInit || init.statusMint ? 
                (  <Box
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
                        {
                            init.statusInit ? (
                                <TokenMetadataForm address={init.address} />
                            ) : (
                                <TokenMintForm address={init.address} />
                            )
                        } 
                        
                        <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={handleClose} variant="contained">
                            {"Close"}
                        </Button>
                    </Box>
                ) : (
                    <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={handleDeploy} variant="contained" disabled={loading}>
                        {loading ? "Deploying..." : "DEPLOY NEW TOKEN"}
                    </Button>        
                )
            }
                
       
            {tx && <Typography>Success! Tx: {tx}</Typography>}   
            <Typography variant="h5" sx={{ mb: 0}}>Deployed Tokens</Typography>
                {tokens.deployedTokens.length === 0 ? (
                    <Typography color="textSecondary">No tokens deployed yet.</Typography>
                ) : (
                    <TableContainer component={Paper} sx={{ height: "50%", width: "80%", overflow: "auto"}} elevation={0}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell><strong>Address</strong></TableCell>
                                        <TableCell><strong>Name</strong></TableCell>
                                        <TableCell><strong>Symbol</strong></TableCell>
                                        <TableCell><strong>Decimals</strong></TableCell>
                                        <TableCell><strong>Description</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {tokens.deployedTokens.map((token, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                            {
                                            tokens.initializedTokens[token.address]? (
                                                <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={() => handleMint(token.address)} variant="contained" disabled={loading}>
                                                {loading ? "Minting..." : "Mint"}
                                                </Button> 
                                                ) : ( 
                                                <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={() => handleInit(token.address)} variant="contained" disabled={loading}>
                                                    {loading ? "Initializing..." : "Init"}
                                                </Button> )  
                                            }
                                            </TableCell>
                                            <TableCell>
                                                <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={() => handleDelete(token.address)} variant="contained" disabled={loading}>
                                                    {loading ? "Deleting..." : "Delete"}
                                                </Button> 
                                            </TableCell>
                                            <TableCell>{token.address ? token.address : 'unknown'}</TableCell>
                                            <TableCell>{token.name ? token.name : 'unknown'}</TableCell>
                                            <TableCell>{token.symbol ? token.symbol : 'unknown'}</TableCell>
                                            <TableCell>{token.decimals !== undefined ? token.decimals : 'unknown'}</TableCell>
                                            <TableCell>{token.description ? token.description : 'unknown'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                )}
        </Box>
    );
};

export default Tokens;