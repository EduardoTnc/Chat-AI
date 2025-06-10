import { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import axios from 'axios';
import { ChatContext } from './ChatContext';
import { useChatState } from './ChatState';
import { useChatSocket } from './ChatSocket';
import { useChatActions } from './ChatActions';
import { useChatFetchers } from './ChatFetchers';
import { useChatSelectors } from './ChatSelectors';

const ChatContextProvider = ({ children }) => {
    // Obtener datos de autenticación
    const { urlBase, urlApi, token, user } = useAuth();

    // MARK: Estados
    // Obtener estados y setters de ChatState
    const {
        // Estados básicos
        socket, setSocket,
        conversations, setConversations,
        currentChat, setCurrentChat,
        messages, setMessages,
        onlineUsers, setOnlineUsers,
        typingUsers, setTypingUsers,
        newMessageInput, setNewMessageInput,
        loadingMessages, setLoadingMessages,
        loadingConversations, setLoadingConversations,

        // Estados IA
        isAIChatActive, setIsAIChatActive,
        aiModels, setAiModels,
        selectedAIModel, setSelectedAIModel,
        aiConversationId, setAiConversationId,
        isAISending, setIsAISending,
        tempMessageIdCounter, setTempMessageIdCounter
    } = useChatState();

    // Primero obtenemos las acciones básicas sin socket para obtener markConversationAsRead
    const initialActions = useChatActions(
        null, // Pasamos null inicialmente para el socket
        setCurrentChat,
        setMessages,
        setIsAIChatActive,
        setAiConversationId,
        tempMessageIdCounter,
        setTempMessageIdCounter,
        conversations,
        setConversations,
        setIsAISending,
        setNewMessageInput,
        urlApi,
        token,
        user,
        currentChat,
        isAIChatActive,
        isAISending,
        aiConversationId,
        selectedAIModel
    );

    // Extraemos markConversationAsRead de las acciones iniciales
    const { markConversationAsRead } = initialActions;

    // MARK: Socket
    // Inicializamos el socket con markConversationAsRead
    const socketHandlers = useChatSocket(
        urlBase,
        token,
        user,
        socket,
        setSocket,
        conversations,
        setConversations,
        currentChat,
        setCurrentChat,
        setMessages,
        setOnlineUsers,
        setTypingUsers,
        setIsAIChatActive,
        setAiConversationId,
        markConversationAsRead
    );

    // MARK: Fetchers
    // Obtener funciones para llamadas a la API desde ChatFetchers
    const {
        fetchConversations,
        fetchMessages,
        fetchAIMessages,
        fetchAIModels,
        startConversationAPI
    } = useChatFetchers(
        urlApi,
        token,
        setConversations,
        setMessages,
        setLoadingConversations,
        setLoadingMessages,
        setAiModels
    );

    // MARK: Acciones
    // Obtener acciones desde ChatActions
    const {
        selectConversation,
        selectAIChat,
        sendMessageToUser,
        sendMessageToIA,
        requestNotificationPermission,
    } = useChatActions(
        socket, // Ahora pasamos el socket real
        setCurrentChat,
        setMessages,
        setIsAIChatActive,
        setAiConversationId,
        tempMessageIdCounter,
        setTempMessageIdCounter,
        conversations,
        setConversations,
        setIsAISending,
        setNewMessageInput,
        urlApi,
        token,
        user,
        currentChat,
        isAIChatActive,
        isAISending,
        aiConversationId,
        selectedAIModel,
        startConversationAPI
    );



    // MARK: Selectores
    // Obtener selectores desde ChatSelectors
    const {
        isUserOnline,
        isUserTyping,
        getOtherParticipant,
        getTotalUnreadCount,
        getSortedConversations
    } = useChatSelectors(
        onlineUsers,
        typingUsers,
        user
    );

    // MARK: useEffect
    // Extraer las funciones del manejador de socket
    const { setupSocketListeners, handleTypingEvent } = socketHandlers;

    // Actualizar los manejadores de socket con las funciones de acciones
    useEffect(() => {
        if (socket) {
            // setupSocketListeners returns a cleanup function directly
            const cleanupListeners = setupSocketListeners(socket);
            // Return this cleanup function so useEffect can call it on unmount or when dependencies change
            return cleanupListeners;
        }
    }, [socket, setupSocketListeners]);

    // Cargar conversaciones y modelos de IA cuando hay un token válido
    useEffect(() => {
        if (token) {
            fetchConversations(1, 20);
            fetchAIModels();
        }
    }, [token]);

    // Cargar mensajes cuando cambia la conversación seleccionada
    useEffect(() => {
        if (currentChat?.activeConversationId && !isAIChatActive) {
            fetchMessages(currentChat.activeConversationId, 1, 50);
        }
    }, [currentChat?.activeConversationId, isAIChatActive]);

    // Cargar mensajes de IA cuando cambia la conversación de IA
    useEffect(() => {
        if (isAIChatActive && aiConversationId) {
            fetchAIMessages(aiConversationId, 1, 50);
        }
    }, [isAIChatActive, aiConversationId]);

    // Manejar eventos de escritura cuando cambia el input de mensaje
    const prevMessageInputRef = useRef('');

    useEffect(() => {
        if (socket && currentChat && !isAIChatActive) {
            const wasTyping = prevMessageInputRef.current.length > 0;
            const isTyping = newMessageInput.length > 0;

            // Solo emitir evento si el estado de typing ha cambiado
            if (wasTyping !== isTyping) {
                handleTypingEvent(isTyping, currentChat, isAIChatActive);
            }

            // Actualizar la referencia con el valor actual
            prevMessageInputRef.current = newMessageInput;
        }
    }, [socket, currentChat, newMessageInput, isAIChatActive, socketHandlers]);

    // MARK: Funciones
    // Iniciar conversación con un usuario
    const startConversation = async (targetUser) => {
        console.log("startConversation - Target user:", targetUser);

        if (!targetUser || !targetUser._id) {
            console.error('Usuario inválido para iniciar conversación');
            return { success: false, error: 'Usuario inválido' };
        }

        try {
            // Llamar a la API para iniciar la conversación
            const result = await startConversationAPI(targetUser._id);

            if (result?.success) {
                // Formatear el objeto para selectConversation
                const conversation = result.data;

                // Seleccionar la conversación creada/encontrada
                await selectConversation(conversation);

                return { success: true, data: conversation };
            } else {
                console.error('Error al iniciar conversación:', result?.error);
                return { success: false, error: result?.error || 'Error desconocido' };
            }
        } catch (error) {
            console.error('Error en startConversation:', error);
            return { success: false, error: error.message };
        }
    };

    // MARK: Context
    // Valores a exponer en el contexto
    const contextValue = {
        // Estado básico
        socket,
        conversations: getSortedConversations(conversations),
        currentChat,
        messages,
        newMessageInput,
        setNewMessageInput,
        typingUsers,
        loadingMessages,
        loadingConversations,

        // Estado IA
        isAIChatActive,
        aiModels,
        selectedAIModel,
        setSelectedAIModel,
        aiConversationId,
        isAISending,

        // Acciones de chat con usuarios
        selectConversation,
        startConversation,
        sendMessageToUser,
        requestNotificationPermission,

        // Acciones de chat con IA
        selectAIChat,
        sendMessageToIA,

        // Fetchers (para paginación o recarga)
        fetchConversations,
        fetchMessages,
        fetchAIModels,

        // Selectores y utilidades
        isOnline: isUserOnline,
        isTyping: isUserTyping,
        getOtherParticipant,
        getTotalUnreadCount: () => getTotalUnreadCount(conversations),

        handleTypingEvent: (isTyping) => socketHandlers.handleTypingEvent(isTyping, currentChat, isAIChatActive)
    };

    return (
        <ChatContext.Provider value={contextValue}>
            {children}
        </ChatContext.Provider>
    );
};

export default ChatContextProvider;