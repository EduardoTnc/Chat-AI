import { useCallback } from 'react';
import axios from 'axios';

export const useChatActions = (
    socket,
    setCurrentChat,
    setMessages,
    fetchAIMessages,
    setIsAIChatActive,
    setSelectedAIModel,
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
    const selectAIChat = useCallback(async () => {
        console.log('Seleccionando chat con IA');
        setCurrentChat(null);
        setMessages([]);
        setIsAIChatActive(true);
        
        // Si ya hay una conversación de IA, cargar los mensajes
        if (aiConversationId) {
            console.log('Cargando mensajes de la conversación IA existente:', aiConversationId);
            await fetchAIMessages(aiConversationId, 1, 50);
            return;
        }

        // Función para cargar modelos de IA
        const loadAIModels = async () => {
            try {
                console.log('Cargando modelos de IA...');
                const response = await axios.get(
                    `${urlApi}/ai-api/models`,
                    { 
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                
                if (response.data.success && response.data.data?.length > 0) {
                    const models = response.data.data;
                    console.log('Modelos cargados:', models);
                    return models;
                }
                return [];
            } catch (error) {
                console.error('Error al cargar modelos de IA:', error);
                return [];
            }
        };

        // Función auxiliar para buscar conversación existente con un modelo dado
        const searchExistingConversation = async (model) => {
            if (!model?.modelId) {
                console.error('Modelo no válido para buscar conversación:', model);
                return false;
            }
            
            console.log('Buscando conversación IA existente para el modelo:', model.modelId);
            try {
                const response = await axios.get(
                    `${urlApi}/ai-api/conversations/latest`,
                    { 
                        params: { modelId: model.modelId },
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                if (response.data.success && response.data.data) {
                    const conversation = response.data.data;
                    console.log('Conversación IA existente encontrada:', conversation._id);
                    setAiConversationId(conversation._id);
                    await fetchAIMessages(conversation._id, 1, 50);
                    return true;
                } else {
                    console.log('No se encontró una conversación IA existente para este modelo');
                    return false;
                }
            } catch (error) {
                console.error('Error al buscar conversación IA existente:', error);
                return false;
            }
        };

        // Si ya tenemos un modelo seleccionado, intentar usarlo primero
        if (selectedAIModel?.modelId) {
            console.log('Usando modelo seleccionado:', selectedAIModel.modelId);
            const found = await searchExistingConversation(selectedAIModel);
            if (found) return;
        }

        // Si no se encontró conversación o no hay modelo seleccionado, cargar modelos
        console.log('Cargando modelos de IA...');
        const models = await loadAIModels();
        
        if (models.length > 0) {
            const defaultModel = models.find(model => model.isDefault) || models[0];
            console.log('Modelo seleccionado:', defaultModel);
            setSelectedAIModel(defaultModel);
            await searchExistingConversation(defaultModel);
        } else {
            console.log('No se encontraron modelos de IA disponibles');
        }
    }, [aiConversationId, fetchAIMessages, selectedAIModel, urlApi, token]);

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

    // MARK: escalateToAgent
    // Función para solicitar la escalación de la conversación actual a un agente humano
    const escalateToAgent = useCallback(async () => {
        try {
            if (!aiConversationId) {
                console.warn('No hay conversación de IA para escalar');
                return;
            }
            console.log('Solicitando escalación de la conversación', aiConversationId);
            const response = await axios.post(`${urlApi}/chat-api/conversations/${aiConversationId}/escalate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                // toast.success('Solicitaste hablar con un agente, te conectaremos en breve.');
            }
        } catch (error) {
            console.error('Error solicitando escalación:', error);
        }
    }, [aiConversationId, urlApi, token]);

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
            // Emitir mediante Socket.IO
            if (!socket) {
                throw new Error('Socket no inicializado');
            }

            const payload = {
                modelId: model?.modelId || selectedAIModel?.modelId,
                content: text,
                conversationId: aiConversationId, // Puede ser null
                tempId,
                clientInfo: { userAgent: navigator.userAgent }
            };
            
            if (!payload.modelId) {
                throw new Error('No se pudo determinar el modelo de IA a utilizar');
            }

            console.log('Enviando mensaje a IA vía socket:', payload);

            socket.emit('sendMessageToIA', payload, (ack) => {
                if (ack?.error) {
                    console.error('Error ACK al enviar mensaje IA:', ack.error);

                    // Marcar mensaje como fallido
                    setMessages(prev => prev.map(msg =>
                        msg._id === tempId ? { ...msg, error: true, temporary: false } : msg
                    ));

                    // Añadir mensaje de error
                    setMessages(prev => [...prev, {
                        _id: `error-${Date.now()}`,
                        text: ack.error,
                        sender: 'ai-assistant',
                        senderType: 'ai',
                        createdAt: new Date().toISOString(),
                        error: true
                    }]);

                    setIsAISending(false);
                }
                // Si success, los eventos userMessageToIASent y newMessageFromIA se encargarán de actualizar la UI.
            });
        } catch (error) {
            console.error('Error al enviar mensaje a IA:', error);

            setIsAISending(false);
        }
    }, [isAIChatActive, isAISending, aiConversationId, selectedAIModel, user, tempMessageIdCounter, socket]);

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
        requestNotificationPermission,
        escalateToAgent
    };
};