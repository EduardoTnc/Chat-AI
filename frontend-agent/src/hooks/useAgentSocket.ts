import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useAgentStore } from '../store/agentStore';

export const useAgentSocket = () => {
    const { token } = useAuth();
    const { addConversation } = useAgentStore();
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (token && !socketRef.current) {
            const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
                auth: {
                    token: token,
                },
                transports: ['websocket'],
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('Agent connected to socket server');
            });

            socket.on('disconnect', () => {
                console.log('Agent disconnected from socket server');
            });

            socket.on('newConversation', (conversation) => {
                console.log('New conversation received:', conversation);
                addConversation(conversation);
            });

            // Example of another listener
            socket.on('conversationUpdate', (updatedConversation) => {
                console.log('Conversation updated:', updatedConversation);
                // Here you would update the specific conversation in the store
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            };
        }
    }, [token, addConversation]);

    const joinConversation = (conversationId: string) => {
        socketRef.current?.emit('agent:join', { conversationId });
    };

    return { socket: socketRef.current, joinConversation };
};
