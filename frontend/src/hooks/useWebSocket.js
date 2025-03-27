import { useEffect, useRef } from 'react';

export const useWebSocket = (onMessage) => {
    const ws = useRef(null);

    useEffect(() => {
        const connect = () => {
            try{
                const url = 'ws://localhost:3000/ws';
                ws.current = new WebSocket(url);

                ws.current.onopen = () => {
                    console.log('WebSocket Connected');
                };
        
                ws.current.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    onMessage(data);
                };
        
                ws.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
        
                ws.current.onclose = () => {
                    console.log('WebSocket Disconnected');
                    setTimeout(() => {
                        if (ws.current.readyState === WebSocket.CLOSED) {
                            ws.current = new WebSocket(url);
                        }
                    }, 3000);
                };
            } catch (error) {
                console.error('Error creating WebSocket:', error);
                setTimeout(connect, 3000);
            }      
        }
        
        connect();
        
        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };

       
    }, [onMessage]);

    return ws.current;
};