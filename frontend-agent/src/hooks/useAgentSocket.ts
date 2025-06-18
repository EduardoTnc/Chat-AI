import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { useAgentStore } from '../store/agentStore';
import { ensureNotificationPermission, showBrowserNotification } from '../lib/notificationHelper';
import { toast } from "sonner";

export const useAgentSocket = () => {
    const { token, user } = useAuth();
    const { addConversation, addEscalatedConversation, removeEscalatedConversation } = useAgentStore();
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
                ensureNotificationPermission();
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

            // Nueva conversación escalada
            socket.on('conversation_escalated', ({ conversation }) => {
                addEscalatedConversation(conversation);
                toast(`Nueva conversación escalada de ${conversation.userName || 'cliente'}`);
                showBrowserNotification('Nueva conversación escalada', 'Un cliente requiere atención.');
            });

            // chatAssigned cuando cualquier agente toma un chat
            socket.on('chatAssigned', ({ conversationId, agentId }) => {
                removeEscalatedConversation(conversationId);
                // Si es el agente actual, opcionalmente solicitar detalles de conversación al backend
                if (agentId === user?.id) {
                    // TODO: fetch conversation details if backend supports
                }
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    socketRef.current = null;
                }
            };
        }
    }, [token, user?.id, addConversation, addEscalatedConversation, removeEscalatedConversation]);

    const pickChat = (conversationId: string, ack?: (data: any) => void) => {
        socketRef.current?.emit('agentPickChat', { conversationId }, ack);
    };

    const joinConversation = (conversationId: string) => {
        socketRef.current?.emit('agent:join', { conversationId });
    };

    return { socket: socketRef.current, joinConversation, pickChat };
};
