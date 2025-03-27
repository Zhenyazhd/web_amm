import React, { createContext, useContext, useEffect, useRef } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const ws = useRef(null);

    useEffect(() => {
        const connectWebSocket = () => {
            ws.current = new WebSocket('ws://localhost:3000/ws');
            
            ws.current.onopen = () => {
                console.log('WebSocket Connected');
            };

            ws.current.onclose = () => {
                console.log('WebSocket Disconnected');

                setTimeout(connectWebSocket, 3000);
            };

            ws.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        };

        connectWebSocket();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    return (
        <WebSocketContext.Provider value={ws.current}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocket must be used within a WebSocketProvider');
    }
    return context;
};