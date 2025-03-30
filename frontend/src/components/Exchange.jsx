import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
    Box,
    TextField,
    Button,
    Typography,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Paper,
    Grid,
    Divider,
} from "@mui/material";
import BN from 'bn.js';
import { getData } from "../utils/api";
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { useWebSocket } from './WebSocketContext';
import { usePools } from './PoolsContext';
import { useTokens } from './TokensContext';
import idl from '../../target_contract/idl/amm.json';
import { Connection, clusterApiUrl, PublicKey, Transaction, SystemProgram, Keypair } from "@solana/web3.js";
import { 
    TOKEN_PROGRAM_ID, 
    ASSOCIATED_TOKEN_PROGRAM_ID,
    getMint,
    getAccount,
    createAssociatedTokenAccountInstruction
 } from '@solana/spl-token';
import { amber } from "@mui/material/colors";
const PROGRAM_ID = new PublicKey(idl.address);


const Exchange = () => {
    const { publicKey, signTransaction } = useWallet();
    const wallet = useWallet();
    const [action, setAction] = useState("add_liquidity");
    const [tokenX, setTokenX] = useState("");
    const [tokenY, setTokenY] = useState("");
    const [amountX, setAmountX] = useState("");
    const [amountY, setAmountY] = useState("");
    const [swapAmount, setSwapAmount] = useState("");
    const [burnAmount, setBurnAmount] = useState("");

    const [expectedOutput, setExpectedOutput] = useState("0");
    const [userPools, setUserPools] = useState([]);
    const [poolBalances, setPoolBalances] = useState({ x: 0, y: 0, lp: 0 });
    const [userBalances, setUserBalances] = useState({ x: 0, y: 0, lp: 0 });
    const [totalSupplyLP, setTotalSupplyLP] = useState(0);
    const [poolFee, setPoolFee] = useState(0);
    const [matchingPool, setMatchingPool] = useState({});
    const [expectedLP, setExpectedLP] = useState("0");
    const [decLP, setDecLP] = useState(0);

    
   
    const getTokenName = (address) => {
        try{
            const filteredTokens = tokens.deployedTokens.filter(token =>
                token.address.toLowerCase().includes(address.toLowerCase())
            );
            return filteredTokens[0].name;
        } catch {
            return 'Undefined';
        }
    }

    const isSelectedPool = (pool) =>
        (pool.token_x === tokenX && pool.token_y === tokenY) ||
        (pool.token_x === tokenY && pool.token_y === tokenX);

    const ws = useWebSocket();
    const pools = usePools();
    const tokens = useTokens();

    useEffect(() => {
        if (ws) {
            ws.onmessage = async (event) => {
                const data = JSON.parse(event.data);
                if(data.type === "pool_created" || data.type === "pool_deleted" || data.type === "delete-pool"){
                    pools.setForceUpdate(prev => prev + 1);
                }
            };
        }

    }, [ws]);


    useEffect(() => {
        const fetchBalances = async () => {
            if (!tokenX || !tokenY || !publicKey) return;
    
            const matchingPool_ = pools.userPools.find(p =>
                (p.token_x === tokenX && p.token_y === tokenY) ||
                (p.token_x === tokenY && p.token_y === tokenX)
            );
            if (!matchingPool_) return;

            matchingPool_.inversed = false;

            if(matchingPool_.token_x === tokenY && matchingPool_.token_y === tokenX){
                matchingPool_.inversed = true;
            }

            const connection = new Connection(clusterApiUrl("devnet"));
            const provider = new AnchorProvider(
                connection, 
                wallet, 
                { preflightCommitment: 'processed' }
            );
            const program = new Program(idl, provider); 
            const poolData = await program.account.liquidityPool.fetch(new PublicKey(matchingPool_.address));
            matchingPool_.fee = poolData.fee.toString();

            setMatchingPool(matchingPool_);
            const user = new PublicKey(publicKey);
            const pool = new PublicKey(matchingPool_.address);
    
            const getBalance = async (tokenAddress, owner) => {
                const token = new PublicKey(tokenAddress);

                const [ata] = PublicKey.findProgramAddressSync(
                    [
                        owner.toBuffer(),
                        TOKEN_PROGRAM_ID.toBuffer(),
                        token.toBuffer(),
                    ],
                    ASSOCIATED_TOKEN_PROGRAM_ID
                );

                const ataInfo = await connection.getAccountInfo(ata);
                if (!ataInfo) {
                    return 0;
                }
                
                const accountInfo = await connection.getTokenAccountBalance(ata);
                return accountInfo.value.uiAmount || 0;
            };
    
            const userX = await getBalance(matchingPool_.token_x, user);
            const userY = await getBalance(matchingPool_.token_y, user);
            const userLP = await getBalance(matchingPool_.token_lp, user);

            const poolX = await getBalance(matchingPool_.token_x, pool); 
            const poolY = await getBalance(matchingPool_.token_y, pool);
            const poolLP = await getBalance(matchingPool_.token_lp, pool);

            setUserBalances({ x: userX, y: userY, lp: userLP });
            setPoolBalances({ x: poolX, y: poolY, lp: poolLP });

            const mintInfo = await getMint(connection, new PublicKey(matchingPool_.token_lp));
            setDecLP(mintInfo.decimals);

        };
    
        fetchBalances();
    }, [swapAmount, tokenX, tokenY, publicKey, pools.userPools]);

    const calculateSwapOutput = (amount) => {
        const decX = getTokenDecimals(matchingPool.token_x);
        const decY = getTokenDecimals(matchingPool.token_y);

        const feeAmount = (amount * Number(matchingPool.fee)) / 10000; 
        const amountInAfterFee = amount - feeAmount; 


        if(matchingPool.inversed){ // y for x
            return (((poolBalances.x * amountInAfterFee * (10**(decX+decY)))/ ((poolBalances.y * (10**decY)) + (amountInAfterFee * (10**decY)))) / (10**decX)).toFixed(6) ;
        } else { // x for y
            return (((poolBalances.y * amountInAfterFee  * (10**(decX+decY)))/ ((poolBalances.x * (10** decX)) + (amountInAfterFee * (10**decX)))) / (10**decY)).toFixed(6) ;
        }
    }

    const getTokenDecimals = (address) => {
        const filteredTokens = tokens.deployedTokens.filter(token =>
            token.address.toLowerCase().includes(address.toLowerCase())
        );
        return filteredTokens[0].decimals;
    }

    const calculateLPOutput = (amountx, amounty) => {
        if(amountx && amounty){

            const decX = getTokenDecimals(matchingPool.token_x);
            const decY = getTokenDecimals(matchingPool.token_y);
            
            if(totalSupplyLP > 0){
                const ratioX = amountx * poolBalances.y * ( 10 ** (decX + decY) );
                const ratioY = amounty * poolBalances.x * ( 10 ** (decX + decY) );
                if(ratioX != ratioY){
                    const r1 = Math.trunc(poolBalances.x * ( 10 ** decX ) / poolBalances.y);
                    const r2 = Math.trunc(amountx * ( 10 ** decX ) / amounty);
                    const k = Math.trunc(r1/r2);

                    const newAmountY = amounty*k;
                    const newAmountX = Math.trunc(amountx/k);

                    if(k > 1){

                    } else {

                    }
                    console.alert("Can't these amounts of tokens!");

                }

                const lpTokensX = Math.trunc((amountx * totalSupplyLP * ( 10 ** decX )) / ( poolBalances.x * ( 10 ** decX ) ));
                const lpTokensY = Math.trunc((amounty * totalSupplyLP * ( 10 ** decY )) / ( poolBalances.y * ( 10 ** decY ) ));

                const result = Math.min(lpTokensX, lpTokensY);
                return result / (10**decLP);

            } else {
                const lptokens = amountx * amounty * ( 10 ** (decX+decY) );
                const result = Math.trunc(Math.sqrt(lptokens));
                return result;
            }
        } else {
            return 0;
        }
    };

    const handleSwapAmountChange = (e) => {
        const value = e.target.value;
        setSwapAmount(value);
        if (value) {
            setExpectedOutput(calculateSwapOutput(value));
        } else {
            setExpectedOutput(0);
        }
    };


    const handleAddLiquidityAmountChange = (e) => {
        const { name, value } = e.target;
        if(name == "amountX"){
            setAmountX(value)
        } else {
            setAmountY(value)
        }

        if(amountY && (name == "amountX" && !matchingPool.inversed)){
            setExpectedLP(calculateLPOutput(value, amountY));
        } else if((name == "amountY" && !matchingPool.inversed) && amountX){
            setExpectedLP(calculateLPOutput(amountX, value));
        } else if((name == "amountY" && matchingPool.inversed) && amountX) {
            setExpectedLP(calculateLPOutput(value, amountX));
        }else if((name == "amountX" && matchingPool.inversed) && amountY) {
            setExpectedLP(calculateLPOutput(amountY, value));
        }
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

    const handleAddLiquidity = async () => {         
        if (!publicKey) {
            alert("Connect the wallet!");
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

            const tokenXpk = new PublicKey(matchingPool.token_x);
            const tokenYpk = new PublicKey(matchingPool.token_y);
            const tokenLp = new PublicKey(matchingPool.token_lp);
            const poolPda = await getPoolAddress(tokenXpk, tokenYpk);

            const ataInstructions = [];

            const [ownerX] = PublicKey.findProgramAddressSync(
                [
                    publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenXpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            const [ownerY] = PublicKey.findProgramAddressSync(
                [
                    publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenYpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const [ownerLP] = PublicKey.findProgramAddressSync(
                [
                    publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenLp.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );


            try {
                await getAccount(connection, ownerLP); 
            } catch (e) {
                ataInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey,
                        ownerLP,      
                        publicKey,    
                        tokenLp       
                    )
                );
            }

            const [poolX] = PublicKey.findProgramAddressSync(
                [
                    poolPda.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenXpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );


            try {
                await getAccount(connection, poolX);
            } catch (e) {
                ataInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey, 
                        poolX,     
                        poolPda,  
                        tokenXpk  
                    )
                );
            }

            const [poolY] = PublicKey.findProgramAddressSync(
                [
                    poolPda.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenYpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            try {
                await getAccount(connection, poolX);
            } catch (e) {
                ataInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey, 
                        poolY,     
                        poolPda,  
                        tokenYpk  
                    )
                );
            }

            try {
                await program.account.liquidityPool.fetch(poolPda);
            } catch (e) {
                if (e.toString().includes("Account does not exist")) {
                } else {
                    throw e;
                }
            }

            let aX = amountX;
            let aY = amountY;

            if(matchingPool.inversed){
                aX = amountY;
                aY = amountX;
            }

            const tx = new Transaction();
            if(ataInstructions.length > 0){
                new Transaction().add(...ataInstructions);
            }

            const liquidityTx = await program.methods
                .addLiquidity(new BN(aX * (10 ** getTokenDecimals(matchingPool.token_x))), new BN(aY * (10 ** getTokenDecimals(matchingPool.token_y))))
                .accounts({
                    pool: poolPda,
                    userX: ownerX,
                    userY: ownerY,
                    userLp: ownerLP,
                    lpMint: tokenLp,
                    poolX: poolX,
                    poolY: poolY,
                    user: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID
                })
                .transaction();

            tx.add(liquidityTx);

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

            console.log(`Liquidity added! Tx: ${txId}`);
        } catch (error) {
            console.error("Error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleSwap = async () => {
        console.log("Swapping:", { tokenX, tokenY, amount: swapAmount });


        if (!publicKey) {
            alert("Connect the wallet!");
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

            const tokenXpk = new PublicKey(matchingPool.token_x);
            const tokenYpk = new PublicKey(matchingPool.token_y);
            const tokenLp = new PublicKey(matchingPool.token_lp);
            const poolPda = await getPoolAddress(tokenXpk, tokenYpk);

            const ataInstructions = [];

            const [ownerX] = PublicKey.findProgramAddressSync(
                [
                    publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenXpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );
            const [ownerY] = PublicKey.findProgramAddressSync(
                [
                    publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenYpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            const [ownerLP] = PublicKey.findProgramAddressSync(
                [
                    publicKey.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenLp.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );


            try {
                await getAccount(connection, ownerLP); // Проверяем, существует ли ATA
            } catch (e) {
                ataInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey,    // payer
                        ownerLP,      // associatedToken
                        publicKey,    // owner
                        tokenLp       // mint
                    )
                );
            }

            const [poolX] = PublicKey.findProgramAddressSync(
                [
                    poolPda.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenXpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );


            try {
                await getAccount(connection, poolX);
            } catch (e) {
                ataInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey, 
                        poolX,     
                        poolPda,  
                        tokenXpk  
                    )
                );
            }

            const [poolY] = PublicKey.findProgramAddressSync(
                [
                    poolPda.toBuffer(),
                    TOKEN_PROGRAM_ID.toBuffer(),
                    tokenYpk.toBuffer(),
                ],
                ASSOCIATED_TOKEN_PROGRAM_ID
            );

            try {
                await getAccount(connection, poolX);
            } catch (e) {
                ataInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        publicKey, 
                        poolY,     
                        poolPda,  
                        tokenYpk  
                    )
                );
            }

            try {
                await program.account.liquidityPool.fetch(poolPda);
            } catch (e) {
                if (e.toString().includes("Account does not exist")) {
                } else {
                    throw e;
                }
            }

            const tx = new Transaction();
            if(ataInstructions.length > 0){
                new Transaction().add(...ataInstructions);
            }

            let swapTx;
            if(!matchingPool.inversed){
                
                swapTx = await program.methods
                .swapXForY(new BN(swapAmount * (10 ** getTokenDecimals(matchingPool.token_x))))
                .accounts({
                    pool: poolPda,
                    userX: ownerX,
                    userY: ownerY,
                    poolX: poolX,
                    poolY: poolY,
                    user: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID
                })
                .transaction();


            } else {
                swapTx = await program.methods
                .swapYForX(new BN(swapAmount * (10 ** getTokenDecimals(matchingPool.token_y))))
                .accounts({
                    pool: poolPda,
                    userX: ownerX,
                    userY: ownerY,
                    poolX: poolX,
                    poolY: poolY,
                    user: publicKey,
                    tokenProgram: TOKEN_PROGRAM_ID
                })
                .transaction();
            }

            tx.add(swapTx);
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

            console.log(`Liquidity added! Tx: ${txId}`);
        } catch (error) {
            console.error("Error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "100vh",
                width: "100vw",
                margin: "auto",
                gap: 4,
                p: 4,
                backgroundColor: "#1a1a1a",
                color: "white"
            }}
        >

        <Grid container spacing={4} sx={{ width: '60vw', px: 4 }}>
            <Grid item xs={12} md={8}>
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(10px)",
                    borderRadius: 2
                }}
            >
                <Typography variant="h5" sx={{ mb: 3, color: "white" }}>
                    Exchange
                </Typography>

                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel sx={{ color: "white" }}>Action</InputLabel>
                    <Select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        label="Action"
                        sx={{
                            color: "white",
                            '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255, 255, 255, 0.3)'
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                                borderColor: 'rgba(255, 255, 255, 0.5)'
                            }
                        }}
                    >
                        <MenuItem value="add_liquidity">Add Liquidity</MenuItem>
                        <MenuItem value="swap">Swap</MenuItem>
                    </Select>
                </FormControl>

                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel sx={{ color: "white" }}>Token X</InputLabel>
                            <Select
                                value={tokenX}
                                onChange={(e) => setTokenX(e.target.value)}
                                label="Token X"
                                sx={{
                                    color: "white",
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                                    }
                                }}
                            >
                                {tokens.deployedTokens.map((token) => (
                                    <MenuItem key={token.address} value={token.address}>
                                        {token.symbol}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel sx={{ color: "white" }}>Token Y</InputLabel>
                            <Select
                                value={tokenY}
                                onChange={(e) => setTokenY(e.target.value)}
                                label="Token Y"
                                sx={{
                                    color: "white",
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: 'rgba(255, 255, 255, 0.3)'
                                    }
                                }}
                            >
                                {tokens.deployedTokens.map((token) => (
                                    <MenuItem key={token.address} value={token.address}>
                                        {token.symbol !=="" ? token.symbol : "Wasn't initiated."}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {action === "add_liquidity" ? (
                        <>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Amount X"
                                    type="number"
                                    name="amountX"
                                    value={amountX}
                                    onChange={ handleAddLiquidityAmountChange }
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            color: 'white',
                                            '& fieldset': {
                                                borderColor: 'rgba(255, 255, 255, 0.3)'
                                            }
                                        }
                                    }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Amount Y"
                                    type="number"
                                    name="amountY"
                                    value={amountY}
                                    onChange={handleAddLiquidityAmountChange}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            color: 'white',
                                            '& fieldset': {
                                                borderColor: 'rgba(255, 255, 255, 0.3)'
                                            }
                                        }
                                    }}
                                />
                            </Grid>

                            {(amountX && amountY)  && (
                                <Grid item xs={6}>
                                    <Typography sx={{ mt: 1, color: "#4CAF50" }}>
                                        Expected LP: {expectedLP}
                                    </Typography>
                                </Grid>

                            )}
                        </>) : (
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Amount to Swap"
                                type="number"
                                value={swapAmount}
                                onChange={handleSwapAmountChange}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        color: 'white',
                                        '& fieldset': {
                                            borderColor: 'rgba(255, 255, 255, 0.3)'
                                        }
                                    }
                                }}
                            />
                            {swapAmount && (
                                <Typography sx={{ mt: 1, color: "#4CAF50" }}>
                                    Expected output: {expectedOutput} 
                                </Typography>
                            )}
                        </Grid>
                    )}
                </Grid>

                <Divider sx={{ my: 3, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
                <Button
                    fullWidth
                    variant="contained"
                    onClick={action === "add_liquidity" ? handleAddLiquidity : handleSwap}
                    disabled={!publicKey || !tokenX || !tokenY || 
                        (action === "add_liquidity" ? (!amountX || !amountY) : !swapAmount)}
                    sx={{
                        backgroundColor: "#4CAF50",
                        '&:hover': {
                            backgroundColor: "#45a049"
                        }
                    }}
                >
                    {action === "add_liquidity" ? "Add Liquidity" : "Swap"}
                </Button>
            </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 2
                    }}
                >
                    <Typography variant="h5" sx={{ mb: 3, color: "white" }}>
                        Balances 
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: "white" }}>
                        Your balance X: {userBalances.x}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: "white" }}>
                        Your balance Y: {userBalances.y}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: "white" }}>
                        Your balance LP: {userBalances.lp}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: "white" }}>
                        Pool balance X: {poolBalances.x}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: "white" }}>
                        Pool balance Y: {poolBalances.y}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ color: "white" }}>
                        Pool balance LP: {poolBalances.lp}
                    </Typography>
                  
                </Paper>
            </Grid>
            </Grid>

            {/* Секция с пулами пользователя */}
            {pools.userPools.length > 0 && (
                <Paper
                    elevation={3}
                    sx={{
                        width: "60vw",
                        p: 4,
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        backdropFilter: "blur(10px)",
                        borderRadius: 2
                    }}
                >
                    <Typography variant="h5" sx={{ mb: 3, color: "white" }}>
                        Your Pools
                    </Typography>
                    <Grid container spacing={2}>
                        {pools.userPools.map((pool, index) => (
                             
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Paper
                                    sx={{
                                        p: 2,
                                        backgroundColor: isSelectedPool(pool)
                                        ? "rgba(76, 175, 80, 0.2)" // светлее
                                        : "rgba(255, 255, 255, 0.05)",
                                        border: isSelectedPool(pool)
                                        ? "2px solid #4CAF50"
                                        : "1px solid transparent",
                                        borderRadius: 1
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ color: "#4CAF50" }}>
                                        Pool #{index + 1}
                                    </Typography>
                                    <Typography variant="body2"  
                                        sx={{ color: 'white',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}>
                                        {getTokenName(pool.token_x)} / {getTokenName(pool.token_y)}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}
        </Box>
    );
};

export default Exchange;
