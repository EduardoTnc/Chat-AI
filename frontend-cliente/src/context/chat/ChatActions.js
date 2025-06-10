import { useCallback } from 'react';
import axios from 'axios';

export const useChatActions = (
    socket,
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
) => {

    // MARK: selectConversation
    // Función para seleccionar una conversación existente
    const selectConversation = useCallback(async (conversation) => {

        if (currentChat?.activeConversationId == conversation._id) {
            console.log('Ya se encuentra seleccionada la conversación');
            return;
        }

        console.log('Seleccionando conversación:', conversation);

        // Extraer el ID del otro usuario para la UI
        const otherUser = conversation.participants.find(p => p._id !== user._id);

        if (!otherUser) {
            console.error('No se pudo encontrar al otro usuario en la conversación');
            return;
        }


        // Formatear el objeto de chat actual para la UI
        setCurrentChat({
            _id: otherUser._id,
            name: otherUser.name,
            email: otherUser.email,
            activeConversationId: conversation._id,
            type: conversation.type,
            participants: conversation.participants
        });

        setMessages([]); // Limpiar mensajes anteriores
        setIsAIChatActive(false);
        setAiConversationId(null);

        // Cargar los mensajes de esta conversación (esto se hará en useEffect)

        // Marcar como leído si hay mensajes no leídos

        if ((conversation.unreadCounts?.find(uc => uc.userId === user._id)?.count || 0) > 0) {
            markConversationAsRead(conversation._id);
        }
    }, [user?._id, currentChat]);

    // MARK: selectAIChat
    // Función para seleccionar el chat con IA
    const selectAIChat = useCallback(() => {
        console.log('Seleccionando chat con IA');
        setCurrentChat(null);
        setMessages([]);
        setIsAIChatActive(true);
    }, [currentChat]);

    // MARK: sendMessageToUser
    // Función para enviar mensaje a usuario
    const sendMessageToUser = useCallback(async (content) => {
        if (!socket || !currentChat || !content.trim()) return;

        console.log(`Enviando mensaje a usuario ${currentChat._id} (${currentChat.name}) en conversación ${currentChat.activeConversationId}`);

        // Crear un mensaje temporal para mostrar inmediatamente en la UI
        const tempId = `temp-${tempMessageIdCounter}`;
        setTempMessageIdCounter(prev => prev + 1);

        const tempMessage = {
            _id: tempId,
            conversation: currentChat.activeConversationId,
            receiverId: currentChat._id,
            content,
            sender: user._id,
            senderType: 'user',
            createdAt: new Date().toISOString(),
            read: false,
            temporary: true // Marcar como temporal para UI
        };

        // Añadir a la UI inmediatamente
        setMessages(prev => [...prev, tempMessage]);
        setNewMessageInput(''); // Limpiar el input
        console.log('Mensaje temporal:', tempMessage);

        // Enviar mediante socket
        socket.emit('sendMessageToUser', {
            tempId,
            conversationId: currentChat.activeConversationId,
            receiverId: currentChat._id,
            content,
        }, (response) => {
            console.log('Respuesta del servidor:', response);
            if (response.success) {
                console.log('Mensaje enviado exitosamente, mensaje creado y guardado:', response.message);

                // Reemplazar el mensaje temporal con el real recibido
                setMessages(prev => prev.map(msg =>
                    msg._id === tempId ? { ...response.message, temporary: false } : msg
                ));

                // Actualizar el lastMessage de la conversación
                setConversations(prev => prev.map(conv =>
                    conv._id === currentChat.activeConversationId ? { ...conv, lastMessage: response.message } : conv
                ));


            } else {
                console.error('Error al enviar mensaje:', response.message);
                // Marcar el mensaje como fallido en la UI
                setMessages(prev => prev.map(msg =>
                    msg._id === tempId ? { ...msg, error: true, temporary: false } : msg
                ));
            }
        });
    }, [socket, currentChat, user, tempMessageIdCounter]);

    // MARK: sendMessageToIA
    // Función para enviar mensaje a IA
    const sendMessageToIA = useCallback(async (text, model = null) => {
        if (!isAIChatActive || !text.trim() || isAISending) return;

        console.log(`Enviando mensaje a IA. Modelo: ${model?._id || selectedAIModel?._id || 'predeterminado'}`);

        setIsAISending(true);
        setNewMessageInput(''); // Limpiar input

        // Crear mensaje temporal del usuario
        const tempId = `temp-${tempMessageIdCounter}`;
        setTempMessageIdCounter(prev => prev + 1);

        const userMessage = {
            _id: tempId,
            text,
            sender: user._id,
            senderType: 'user',
            createdAt: new Date().toISOString(),
            aiConversation: aiConversationId,
            temporary: true,
        };

        // Añadir mensaje del usuario a la UI
        setMessages(prev => [...prev, userMessage]);

        try {
            // Preparar parámetros para la llamada a la API
            const modelId = model?._id || selectedAIModel?._id;

            if (!modelId) {
                throw new Error('No hay modelo de IA seleccionado');
            }

            const endpoint = `${urlApi}/ai-api/chat`;
            const payload = {
                message: text,
                modelId,
                conversationId: aiConversationId // null la primera vez
            };

            console.log('Llamando a la API de IA:', endpoint);
            console.log('Con payload:', payload);

            // Llamar a la API
            const response = await axios.post(
                endpoint,
                payload,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                console.log('Respuesta de IA recibida:', response.data);

                // Actualizar el mensaje del usuario con el ID real
                const realUserMessage = response.data.data.userMessage;
                setMessages(prev => prev.map(msg =>
                    msg._id === tempId ? { ...realUserMessage, temporary: false } : msg
                ));

                // Añadir el mensaje de respuesta de la IA
                const aiMessage = response.data.data.aiMessage;
                setMessages(prev => [...prev, aiMessage]);

                // Guardar el ID de conversación si es nuevo
                if (!aiConversationId && response.data.data.conversationId) {
                    setAiConversationId(response.data.data.conversationId);
                }
            } else {
                throw new Error(response.data.message || 'Error al procesar la solicitud a la IA');
            }
        } catch (error) {
            console.error('Error al enviar mensaje a IA:', error);

            // Marcar mensaje como fallido
            setMessages(prev => prev.map(msg =>
                msg._id === tempId ? { ...msg, error: true, temporary: false } : msg
            ));

            // Añadir mensaje de error de la IA
            const errorMessage = {
                _id: `error-${Date.now()}`,
                text: 'Lo siento, no pude procesar tu mensaje. Por favor, intenta de nuevo más tarde.',
                sender: 'ai-assistant',
                senderType: 'ai',
                createdAt: new Date().toISOString(),
                error: true
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsAISending(false);
        }
    }, [isAIChatActive, isAISending, aiConversationId, selectedAIModel, user, tempMessageIdCounter, urlApi, token]);

    // MARK: markConversationAsRead
    // Función para marcar conversación como leída
    const markConversationAsRead = useCallback(async (conversationId) => {
        if (!token || !conversationId) return;

        try {
            const response = await axios.post(`${urlApi}/chat-api/${conversationId}/mark-as-read`, null, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {
                console.log('Conversación marcada como leída:', response.data);

                // Actualizar el estado de las conversaciones
                setConversations(prev => prev.map(conv => {
                    if (conv._id === conversationId) {
                        // Crear una copia actualizada de la conversación
                        const updatedConversation = { ...conv };

                        // Actualizar el contador de no leídos para el usuario actual
                        updatedConversation.unreadCounts = (updatedConversation.unreadCounts || []).map(uc =>
                            uc.userId === user._id ? { ...uc, count: 0 } : uc
                        );

                        return updatedConversation;
                    }
                    return conv;
                }));
            } else {
                console.error('Error al marcar como leído:', response.data.message);
            }
        } catch (error) {
            console.error('Error al marcar como leído:', error);
        }
    }, [token, urlApi, user?._id, setConversations]);

    // MARK: requestNotificationPermission
    // Solicitar permisos de notificaciones
    const requestNotificationPermission = useCallback(async () => {
        if (!('Notification' in window)) {
            console.log('Este navegador no soporta notificaciones');
            return false;
        }

        if (Notification.permission === 'granted') {
            console.log('Permisos de notificación ya otorgados');
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            console.log(`Permiso de notificación: ${permission}`);
            return permission === 'granted';
        }

        console.log('Permisos de notificación denegados previamente');
        return false;
    }, []);

    return {
        selectConversation,
        selectAIChat,
        sendMessageToUser,
        sendMessageToIA,
        markConversationAsRead,
        requestNotificationPermission
    };
};