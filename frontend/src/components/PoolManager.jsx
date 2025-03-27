import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import axios from "axios";
import {
    AppBar,
    Autocomplete,
    Toolbar,
    Typography,
    Box,
    TextField,
    Button,
    Menu,
    MenuItem,
    IconButton,
} from "@mui/material";
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { SystemProgram } from '@solana/web3.js';
import idl from '../../target_contract/idl/amm.json';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import { getData, postData } from "../utils/api"; 
import { useWebSocket } from '../components/WebSocketContext';
import { usePools } from '../components/PoolsContext';
import { useTokens } from '../components/TokensContext';

const PROGRAM_ID = new PublicKey(idl.address);

const PoolManager = () => {
    const { publicKey, signTransaction } = useWallet();
    const wallet = useWallet();
    const [poolAddress, setPoolAddress] = useState(null);
    const [liquidityAmount, setLiquidityAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [tokenOptions, setTokenOptions] = useState({});

   
    const [poolData, setPoolData] = useState({
        token1: "",
        token2: "",
    });

    const ws = useWebSocket();
    const pools = usePools();
    const tokens = useTokens();



    const handleSubmit = (e) => {
        e.preventDefault();
        initializePool();
    };

    const getPoolAddress = async (tokenX, tokenY) => {
        const [poolPda] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("pool"),
                tokenX.toBuffer(),
                tokenY.toBuffer()
            ],
            PROGRAM_ID
        );
        return poolPda;
    };


    const handleDelete = async (address) => {
        const result = await postData('pool/delete-pool', { 
            id: '',
            user_id: '', 
            address: address, 
            token_x: '', 
            token_y: '',
            token_lp: '',
            created_at: ''
        }, localStorage.getItem("authToken")); 
    }

    useEffect(() => {
        if (ws) {
            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                if(data.type === "pool_created" || data.type === "pool_deleted" || data.type === "delete-pool"){
                    pools.setForceUpdate(prev => prev + 1);
                }
            };

            const ar = {}; 
            for(const token of tokens.deployedTokens){
                ar[`${token.name ? token.name : undefined }: ${token.address.slice(0, 5)}...${token.address.slice(-3)}`] = token.address;
            }
            console.log(ar)


            setTokenOptions(ar);
        }

    }, [ws]);

    const initializePool = async () => {
       
        if (!publicKey) {
            alert("Подключите кошелек!");
            return;
        }

        try {
            const endpoint = clusterApiUrl("devnet");
            const connection = new Connection(endpoint);

            const provider = new AnchorProvider(
                connection, 
                wallet, 
                { preflightCommitment: 'processed' }
            );
            
            const program = new Program(idl, provider); 

            const tokenX = new PublicKey(poolData.token1);
            const tokenY = new PublicKey(poolData.token2);
            
            const poolPda = await getPoolAddress(tokenX, tokenY);

            try {
                await program.account.liquidityPool.fetch(poolPda);
                console.log("Pool esists!", poolPda.toBase58());
                return;
            } catch (e) {
                if (e.toString().includes("Account does not exist")) {
                } else {
                    throw e;
                }
            }

            const [lpMintPda] = PublicKey.findProgramAddressSync(
                [poolPda.toBuffer()],
                PROGRAM_ID
            );

            const tx = await program.methods
                .initializePool(publicKey, new BN(30))
                .accounts({
                    pool: poolPda,
                    tokenX: tokenX,
                    tokenY: tokenY,
                    lpMint: lpMintPda,
                    payer: publicKey,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: TOKEN_PROGRAM_ID
                })
                .transaction();

            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

            tx.recentBlockhash =blockhash;
            tx.feePayer = publicKey;


            const signedTx = await signTransaction(tx);
            const txId = await connection.sendRawTransaction(signedTx.serialize());
            const confirmationStrategy = {
                signature: txId,
                blockhash: blockhash,
                lastValidBlockHeight: lastValidBlockHeight 
            };

            await connection.confirmTransaction(confirmationStrategy, "confirmed");

    
            setPoolAddress(poolPda.toString());
            console.log(`Pool created!\nAddress: ${poolPda.toString()}\nLP token: ${lpMintPda.toString()}\nTx: ${tx}`);
            
            const result = await postData('pool/save', { 
                id: '',
                user_id: '', 
                address: poolPda.toString(),
                token_x: tokenX.toBase58(), 
                token_y: tokenY.toBase58(),
                token_lp: lpMintPda.toString(),
                created_at: ''
            }, localStorage.getItem("authToken")); 

        } catch (error) {
            console.error("Error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const addLiquidity = async () => {
        if (!publicKey || !poolAddress) {
            alert("Подключите кошелек и создайте пул!");
            return;
        }

        try {
            const response = await axios.post("http://127.0.0.1:3000/pool/add_liquidity", {
                owner: publicKey.toBase58(),
                pool: poolAddress,
                amount: liquidityAmount
            });

            if (response.data.success) {
                alert(`Добавлено ${liquidityAmount} SOL в пул ${poolAddress}`);
            }
        } catch (error) {
            console.error("Ошибка добавления ликвидности:", error);
        }
    };
    /**             <TextField
                    label="TOKEN X"
                    name="token1"
                    type="string"
                    value={poolData.token1}
                    onChange={handleChange}
                    fullWidth
                /> */

    return (

        <Box
            sx={{
                display: "flex",
                border: "2px solid red",
                flexDirection: "column", 
                alignItems: "center",
                justifyContent: "center", 
                height: "100vh", 
                width: "100vw", 
                margin: "auto",
                gap: 4
            }}
        >
            <Box 
                component="form" 
                onSubmit={handleSubmit}
                sx={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    width: "50vw", 
                    gap: 2, 
                    p: 2,
                    '& .MuiInputBase-root': {
                        backgroundColor: 'white'
                    }
                }}
            >
                <Autocomplete
                    freeSolo
                    options={Object.keys(tokenOptions)}
                    value={poolData.token1}
                    name="token1"
                    onInputChange={(event, newInputValue) => {
                        setPoolData(prev => ({ ...prev, token1: newInputValue }));
                    }}
                    onChange={(event, newValue) => {
                        setPoolData(prev => ({ ...prev, token1: tokenOptions[newValue] || '' }));
                    }}
                    renderInput={(params) => (
                        <TextField
                        {...params}
                        type="string"
                        label="TOKEN X"
                        fullWidth
                        />
                    )}
                />


                <Autocomplete
                    freeSolo
                    options={Object.keys(tokenOptions)}
                    value={poolData.token2}
                    name="token2"
                    onInputChange={(event, newInputValue) => {
                        setPoolData(prev => ({ ...prev, token2: newInputValue }));
                    }}
                    onChange={(event, newValue) => {
                        setPoolData(prev => ({ ...prev, token2: tokenOptions[newValue] || '' }));
                    }}
                    renderInput={(params) => (
                        <TextField
                        {...params}
                        type="string"
                        label="TOKEN Y"
                        fullWidth
                        />
                    )}
                />

                <Button 
                    sx={{ backgroundColor: "#1a1a1a" }} 
                    type="submit" 
                    variant="contained" 
                    disabled={!publicKey}
                >
                    Init Pool
                </Button>
            </Box>






            {pools.userPools.length > 0 && (
                <Box sx={{ 
                    width: "60vw",
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: 2,
                    p: 3,
                    backdropFilter: 'blur(10px)'
                }}>
                    <Typography variant="h5" sx={{ mb: 3, color: 'white' }}>
                        Your pools
                    </Typography>
                    
                    <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 2
                    }}>
                        {pools.userPools.map((pool, index) => (
                            <Box 
                                key={index}
                                sx={{ 
                                    backgroundColor: "white",//'rgba(255, 255, 255, 0.05)',
                                    borderRadius: 1,
                                    p: 2,
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}
                            >
                         <Typography variant="subtitle1" sx={{ color: 'black', mb: 1 }}>
                                    Pool #{index + 1}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                    <Typography variant="body2" sx={{ color: 'black' }}>
                                        <strong>Address of the pool:</strong> {pool.address}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'black' }}>
                                        <strong>Token X:</strong> {pool.token_x}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'black' }}>
                                        <strong>Token Y:</strong> {pool.token_y}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'black' }}>
                                        <strong>LP token:</strong> {pool.token_lp}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                                        <strong>Created:</strong> {new Date(pool.created_at).toLocaleDateString()}
                                    </Typography>
                                </Box>

                                <Button sx={{ backgroundColor: "#1a1a1a" }} onClick={() => handleDelete(pool.address)} variant="contained" disabled={loading}>
                                                {loading ? "Deleting..." : "Delete"}
                                </Button> 
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}
        </Box>



    );
};

export default PoolManager;