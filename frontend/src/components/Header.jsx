import React, { useState, useCallback, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Link } from "react-router-dom";
import axios from "axios";
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Button,
    Menu,
    MenuItem,
    IconButton,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";

const Header = () => {
    const { publicKey, disconnect } = useWallet();
    const [anchorEl, setAnchorEl] = useState(null);
    const [balance, setBalance] = useState(null);

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const handleLogout = async () => {
        handleMenuClose();
        const token = localStorage.getItem("authToken");
        if (!token) {
            console.error("No token.");
            return;
        }

        try {
            await axios.post("http://127.0.0.1:3000/auth/logout",
                { token },
                {
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );
            localStorage.removeItem("authToken");
        } catch (error) {
            console.error("Logout error:", error);
        }

        disconnect();
        window.location.reload();
    };

    const fetchBalance = useCallback(async () => {
        if (!publicKey) return;
        try {
            const response = await axios.get(`http://127.0.0.1:3000/balance?address=${publicKey.toBase58()}`);
            setBalance(response.data);
        } catch (error) {
            console.error("Ошибка при получении баланса:", error);
        }
    }, [publicKey]);

    useEffect(() => {
        if (publicKey) {
            fetchBalance();
        }
    }, [publicKey, fetchBalance]);

    return (
        <AppBar position="fixed" sx={{ backgroundColor: "#1a1a1a", zIndex: 1000 }}>
            <Toolbar sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                    🌊 Solana Pools
                </Typography>

                <Box>
                    <Button component={Link} to="/exchange" color="inherit">Exchange</Button>
                    <Button component={Link} to="/tokens" color="inherit">Token Registry</Button>
                    <Button component={Link} to="/pool" color="inherit">Pool Registry</Button>
                </Box>

                <Box>
                    {publicKey ? (
                        <>
                            <IconButton onClick={handleMenuOpen} color="inherit">
                                <AccountCircle />
                            </IconButton>

                            <Menu
                                anchorEl={anchorEl}
                                open={Boolean(anchorEl)}
                                onClose={handleMenuClose}
                            >
                                <MenuItem disabled>{publicKey.toBase58()}</MenuItem>
                                <MenuItem disabled>Balance: {balance} SOL</MenuItem>
                                <MenuItem onClick={handleLogout} sx={{ color: "red" }}>Logout</MenuItem>
                            </Menu>
                        </>
                    ) : (
                        <WalletMultiButton />
                    )}
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Header;
