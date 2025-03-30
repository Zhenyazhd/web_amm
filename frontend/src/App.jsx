import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";
import axios from "axios";
import { Box} from "@mui/material";

import { WebSocketProvider } from './components/WebSocketContext';
import { TokensProvider } from './components/TokensContext';
import { PoolsProvider } from './components/PoolsContext';

import PoolManager from "./components/PoolManager";
import Header from "./components/Header";
import AuthForm from "./components/AuthForm";
import Tokens from "./components/Tokens";
import Exchange from "./components/Exchange";

import "@solana/wallet-adapter-react-ui/styles.css";

const App = () => {
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem("authToken");
            if (!token) {
                setIsAuthenticated(false);
                return;
            }

            try {
                const response = await axios.get("http://127.0.0.1:3000/auth/validate", {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.valid) {
                    setToken(token);
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem("authToken");
                }
            } catch (error) {
                console.error("Token Error:", error);
                localStorage.removeItem("authToken");
            }
        };

        checkAuth();
    }, []);

    const handleLoginSuccess = (newToken) => {
        localStorage.setItem("authToken", newToken);
        setToken(newToken);
        setIsAuthenticated(true);
    };

    return (
        <ConnectionProvider endpoint="https://api.devnet.solana.com">
            <WalletProvider wallets={[new PhantomWalletAdapter(), new SolflareWalletAdapter()]} autoConnect>
                <WalletModalProvider>
                    <WebSocketProvider>
                        <TokensProvider>
                            <PoolsProvider>
                                {!isAuthenticated ? (
                                    <AuthForm onLoginSuccess={handleLoginSuccess} />
                                ) : (
                                    <Box sx={{ paddingTop: '64px' }}>

                                        <Router>
                                            <Header/>
                                            <Routes>
                                                {/*<Route path="/" element={<WalletConnect />} />*/}
                                                <Route path="/" element={<PoolManager />} />
                                                <Route path="/exchange" element={<Exchange />} />
                                                <Route path="/tokens" element={<Tokens />} />
                                            </Routes>
                                        </Router>
                                    </Box>

                                )}
                           </PoolsProvider>
                        </TokensProvider>
                    </WebSocketProvider>
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};
//   color: #888;

export default App;