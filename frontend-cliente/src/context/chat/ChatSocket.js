import { useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export const useChatSocket = (
    urlBase,
    token,
    user,
    socket,
    setSocket,
    conversations, // This prop is used to initialize conversationsRef
    setConversations,
    currentChat, // This prop is used to initialize currentChatRef
    setCurrentChat,
    setMessages,
    setOnlineUsers,
    setTypingUsers,
    setIsAIChatActive,
    setAiConversationId,
    setIsAISending,
    isAIChatActive,
    aiConversationId,
    markConversationAsRead
) => {
    const currentChatRef = useRef(currentChat);
    const isAIChatActiveRef = useRef(isAIChatActive);
    const aiConversationIdRef = useRef(aiConversationId);

    useEffect(() => {
        currentChatRef.current = currentChat;
    }, [currentChat]);

    useEffect(() => {
        isAIChatActiveRef.current = isAIChatActive;
    }, [isAIChatActive]);

    useEffect(() => {
        aiConversationIdRef.current = aiConversationId;
    }, [aiConversationId]);

    // Establecer conexión Socket.IO
    useEffect(() => {
        console.log('Inicializando socket - Token disponible:', !!token);
        console.log('Inicializando socket - Usuario disponible:', !!user?._id);

        if (token && user?._id) { // Solo conectar si hay token y usuario efectivos
            console.log('Conectando socket...');
            console.log('URL Base:', urlBase);

            const newSocket = io(urlBase, {
                auth: { token },
                transports: ['websocket', 'polling'], // Permitir fallback a polling si websocket falla
                reconnectionAttempts: 5,              // Intentar reconectar varias veces
                reconnectionDelay: 1000,              // Esperar 1 segundo entre intentos
                query: { userId: user._id }
            });

            newSocket.on('connect', () => {
                console.log('Socket conectado');
                setSocket(newSocket);
            });

            // Registrar todos los eventos de Socket.IO para depuración
            newSocket.on('connect_error', (error) => {
                console.error('Error de conexión socket:', error.message);
            });

            newSocket.on('connect_timeout', () => {
                console.error('Timeout de conexión socket');
            });

            newSocket.on('reconnect_attempt', (attemptNumber) => {
                console.log(`Intento de reconexión #${attemptNumber}`);
            });

            newSocket.on('reconnect_error', (error) => {
                console.error('Error de reconexión:', error.message);
            });

            newSocket.on('reconnect_failed', () => {
                console.error('Falló la reconexión después de todos los intentos');
            });

            return () => {
                console.log('Desconectando socket...');
                newSocket.disconnect();
                setSocket(null);
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                console.log('Socket desconectado por falta de token/usuario.');
            }
            // Limpiar estados relacionados con el chat si no hay token
            setConversations([]);
            setCurrentChat(null);
            setMessages([]);
            setOnlineUsers([]);
            setIsAIChatActive(false);
            setAiConversationId(null);
        }

    }, [token, user?._id]);

    // Configuración de listeners de socket
    const setupSocketListeners = useCallback((socket) => {
        if (!socket) return;

        socket.on('connected', (data) => {
            console.log('Conectado al servidor de chat:', data);
        });

        // Escuchar nuevos mensajes
        socket.on('newMessage', (message) => {
            console.log('Mensaje recibido vía socket:', message);
            const finalCurrentChat = currentChatRef.current; // Use the ref to get the latest currentChat

            // Actualizar la lista de mensajes si es la conversación actual
            if (message.conversationId === finalCurrentChat?.activeConversationId) {
                setMessages(prevMessages => {
                    // Evitar duplicados si el mensaje ya existe (por ID)
                    if (prevMessages.find(m => m._id === message._id)) {
                        return prevMessages;
                    }
                    return [...prevMessages, message];
                });
            }

            // Actualizar el lastMessage de la conversación
            setConversations(prev => prev.map(conv =>
                conv._id === message.conversationId ? { ...conv, lastMessage: message } : conv
            ));

            // Marcar conversación como leída si el mensaje es del usuario actual
            const finalCurrentChatForRead = currentChatRef.current; // Use the ref again
            if (message.conversationId === finalCurrentChatForRead?.activeConversationId) {
                console.log('Marcando conversación como leída', message.conversationId);
                markConversationAsRead(message.conversationId);
            }

            // Si el mensaje es de otro usuario no actual, incrementar el contador de mensajes no leídos
            if (message.conversationId !== finalCurrentChat?.activeConversationId) {
                console.log('Incrementando contador de mensajes no leídos', message.conversationId);
                setConversations(prev => prev.map(conv =>
                    conv._id === message.conversationId ? {
                        ...conv,
                        unreadCounts: conv.unreadCounts.map(uc => uc.userId === user._id ? { ...uc, count: uc.count + 1 } : uc)
                    } : conv
                ));
            }
        });

        // Escuchar eventos de usuarios en línea
        socket.on('userOnline', (userId) => {
            console.log('Usuario en línea:', userId);
            setOnlineUsers(prev => [...prev, userId]);
        });

        socket.on('userOffline', (userId) => {
            console.log('Usuario fuera de línea:', userId);
            setOnlineUsers(prev => prev.filter(id => id !== userId));
        });

        // ------------------ IA EVENTS ------------------

        // Confirmación de mensaje del usuario enviado a IA
        socket.on('userMessageToIASent', ({ message, tempId }) => {
            console.log('userMessageToIASent:', { message, tempId });
            if (isAIChatActiveRef.current) {
                // Si todavía no tenemos conversationId, establecerlo
                if (!aiConversationIdRef.current && message.conversationId) {
                    setAiConversationId(message.conversationId);
                }

                // Reemplazar mensaje temporal en UI
                setMessages(prev => prev.map(m =>
                    m._id === tempId ? { ...message, temporary: false } : m
                ));
            }
            // IA está procesando, mantener isAISending true hasta respuesta final
        });

        // Respuesta de la IA
        socket.on('newMessageFromIA', ({ message, conversationId }) => {
            console.log('newMessageFromIA:', { message, conversationId });
            if (isAIChatActiveRef.current && conversationId === aiConversationIdRef.current) {
                setMessages(prev => [...prev, message]);
            }
            setIsAISending(false);
        });

        // Escalación en progreso
        socket.on('escalationInProgress', ({ conversationId, message }) => {
            console.log('escalationInProgress:', conversationId);
            if (isAIChatActiveRef.current && conversationId === aiConversationIdRef.current) {
                setMessages(prev => [...prev, {
                    _id: `system_${Date.now()}`,
                    senderType: 'systemNotification',
                    content: message || 'Estamos conectándote con un agente...',
                    createdAt: new Date().toISOString(),
                    conversationId
                }]);
            }
        });

        // ------------------ USER CHAT EVENTS ------------------

        // Escuchar eventos de escritura
        socket.on('userTyping', ({ senderId, conversationId, isTyping }) => {
            console.log(`Usuario ${senderId} ${isTyping ? 'escribiendo' : 'dejó de escribir'} en ${conversationId}`);
            setTypingUsers(prev => {
                const currentTypingData = prev[conversationId];
                // Solo actualizar si los datos son diferentes o no existen
                if (!currentTypingData || currentTypingData.senderId !== senderId || currentTypingData.isTyping !== isTyping) {
                    return {
                        ...prev,
                        [conversationId]: { senderId, isTyping }
                    };
                }
                return prev; // No hay cambios, devolver el estado anterior para evitar re-render
            });
        });

        // Escuchar eventos de leído
        socket.on('messageRead', ({ messageId, conversationId }) => {
            console.log(`Mensaje ${messageId} marcado como leído en conversación ${conversationId}`);
            // Actualizar el estado 'read' de ese mensaje si corresponde a la conversación actual
            setMessages(prev => prev.map(msg =>
                msg._id === messageId ? { ...msg, read: true } : msg
            ));
        });

        // Notificación de nueva conversación
        socket.on('newConversation', (conversation) => {
            console.log('Nueva conversación recibida:', conversation);
            setConversations(prev => [conversation, ...prev]);
        });

        return () => {
            // Limpiar todos los listeners cuando el componente se desmonta
            socket.off('connected');
            socket.off('newMessage');
            socket.off('userOnline');
            socket.off('userOffline');
            socket.off('userTyping');
            socket.off('messageRead');
            socket.off('newConversation');

            // IA events
            socket.off('userMessageToIASent');
            socket.off('newMessageFromIA');
            socket.off('escalationInProgress');
        };
    }, [setMessages, setOnlineUsers, setTypingUsers, setConversations, markConversationAsRead, setCurrentChat, setIsAIChatActive, setAiConversationId, setIsAISending]);

    // Función para enviar eventos de typing
    const handleTypingEvent = useCallback((isTypingValue, currentChatValue, isAIChatActiveValue) => {
        // 'socket' here refers to the 'socket' prop passed to useChatSocket.
        if (!socket || !currentChatValue || isAIChatActiveValue) return;

        console.log(`Enviando evento typing: ${isTypingValue ? 'escribiendo' : 'dejó de escribir'} para conv: ${currentChatValue?.activeConversationId}`);
        socket.emit('typing', { receiverId: currentChatValue._id, conversationId: currentChatValue.activeConversationId, isTyping: isTypingValue });
    }, [socket]); // Depends only on the 'socket' prop from useChatSocket args.

    return {
        setupSocketListeners,
        handleTypingEvent
    };
};