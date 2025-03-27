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
import { getData } from "../utils/api";

const Exchange = () => {
    const { publicKey } = useWallet();
    const [action, setAction] = useState("add_liquidity");
    const [tokenX, setTokenX] = useState("");
    const [tokenY, setTokenY] = useState("");
    const [amountX, setAmountX] = useState("");
    const [amountY, setAmountY] = useState("");
    const [swapAmount, setSwapAmount] = useState("");
    const [expectedOutput, setExpectedOutput] = useState("0");
    const [userPools, setUserPools] = useState([]);

    // Моковые данные для токенов (в реальном приложении будут из API)
    const tokens = [
        { address: "token1", symbol: "TOKEN1" },
        { address: "token2", symbol: "TOKEN2" },
        { address: "token3", symbol: "TOKEN3" },
    ];

    // Загрузка пулов пользователя
    useEffect(() => {
        if (publicKey) {
            // В реальном приложении здесь будет API запрос
            setUserPools([
                { 
                    address: "pool1",
                    token_x: "token1",
                    token_y: "token2"
                },
                { 
                    address: "pool2",
                    token_x: "token2",
                    token_y: "token3"
                }
            ]);
        }
    }, [publicKey]);

    // Моковая функция для расчета ожидаемого выхода при свапе
    const calculateSwapOutput = (amount) => {
        // В реальном приложении здесь будет расчет на основе формулы AMM
        return (parseFloat(amount) * 0.95).toFixed(6); // Простой пример с 5% комиссией
    };

    // Обработчик изменения суммы для свапа
    const handleSwapAmountChange = (e) => {
        const value = e.target.value;
        setSwapAmount(value);
        if (value) {
            setExpectedOutput(calculateSwapOutput(value));
        } else {
            setExpectedOutput("0");
        }
    };

    // Моковые функции для действий
    const handleAddLiquidity = async () => {
        console.log("Adding liquidity:", { tokenX, tokenY, amountX, amountY });
        // Здесь будет реальная логика добавления ликвидности
    };

    const handleSwap = async () => {
        console.log("Swapping:", { tokenX, tokenY, amount: swapAmount });
        // Здесь будет реальная логика свапа
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
            <Paper
                elevation={3}
                sx={{
                    width: "40vw",
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
                                {tokens.map((token) => (
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
                                {tokens.map((token) => (
                                    <MenuItem key={token.address} value={token.address}>
                                        {token.symbol}
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
                                    value={amountX}
                                    onChange={(e) => setAmountX(e.target.value)}
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
                                    value={amountY}
                                    onChange={(e) => setAmountY(e.target.value)}
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
                        </>
                    ) : (
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
                                    Expected output: {expectedOutput} {tokenY}
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

            {/* Секция с пулами пользователя */}
            {userPools.length > 0 && (
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
                        {userPools.map((pool, index) => (
                            <Grid item xs={12} sm={6} md={4} key={index}>
                                <Paper
                                    sx={{
                                        p: 2,
                                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                                        borderRadius: 1
                                    }}
                                >
                                    <Typography variant="subtitle1" sx={{ color: "#4CAF50" }}>
                                        Pool #{index + 1}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: "white" }}>
                                        {pool.token_x} / {pool.token_y}
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
