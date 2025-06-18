import { useCallback } from 'react';
import axios from 'axios';

export const useChatFetchers = (
    urlApi,
    token,
    setConversations,
    setMessages,
    setLoadingConversations,
    setLoadingMessages,
    setAiModels
) => {

    // MARK: fetchConversations
    // Función para cargar conversaciones
    const fetchConversations = useCallback(async (page = 1, limit = 20) => {
        if (!token) return;

        setLoadingConversations(true);

        try {
            const endpoint = `${urlApi}/chat-api/?page=${page}&limit=${limit}`;
            console.log('Obteniendo conversaciones desde:', endpoint);

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const newConversations = response.data.data.conversations;
                console.log(`${newConversations.length} conversaciones obtenidas`);
                console.log("newConversations", newConversations);

                // Si es la primera página, reemplazar; si no, añadir
                if (page === 1) {
                    setConversations(newConversations);
                } else {
                    setConversations(prev => [...prev, ...newConversations]);
                }

                return {
                    success: true,
                    data: newConversations,
                    hasMore: newConversations.length === limit
                };
            } else {
                console.error('Error al obtener conversaciones:', response.data.message);
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Error en la llamada a la API de conversaciones:', error);
            return { success: false, error: error.message };
        } finally {
            setLoadingConversations(false);
        }
    }, [urlApi, token]);

    // MARK: fetchMessages
    // Función para cargar mensajes de una conversación
    const fetchMessages = useCallback(async (conversationId, page = 1, limit = 20) => {
        if (!token || !conversationId) return;

        setLoadingMessages(true);

        try {
            const endpoint = `${urlApi}/chat-api/${conversationId}/messages/?page=${page}&limit=${limit}`;
            console.log('Obteniendo mensajes desde:', endpoint);

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const newMessages = response.data.data;
                console.log(`${newMessages.length} mensajes obtenidos`);

                // Si es la primera página, reemplazar; si no, añadir al principio (mensajes más antiguos)
                if (page === 1) {
                    // Cuando se carga la primera página de mensajes, estos vienen ordenados del más nuevo al más antiguo
                    // Se invierte el array para que en el estado se guarden del más antiguo al más nuevo,
                    // permitiendo que la UI los muestre en orden cronológico (los más nuevos abajo)
                    setMessages(newMessages.slice().reverse());
                } else {
                    setMessages(prev => [...newMessages, ...prev]);
                }

                return {
                    success: true,
                    data: newMessages,
                    hasMore: newMessages.length === limit
                };
            } else {
                console.error('Error al obtener mensajes:', response.data.message);
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Error en la llamada a la API de mensajes:', error);
            return { success: false, error: error.message };
        } finally {
            setLoadingMessages(false);
        }
    }, [urlApi, token]);

    // MARK: fetchAIMessages
    // Función para cargar mensajes de una conversación con IA
    const fetchAIMessages = useCallback(async (conversationId, page = 1, limit = 20) => {
        if (!token || !conversationId) return;

        setLoadingMessages(true);

        try {
            const endpoint = `${urlApi}/ai-api/conversations/${conversationId}/messages?page=${page}&limit=${limit}`;
            console.log('Obteniendo mensajes IA desde:', endpoint);

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const newMessages = response.data.data;
                console.log(`${newMessages.length} mensajes IA obtenidos`);

                // Si es la primera página, reemplazar; si no, añadir al principio (mensajes más antiguos)
                if (page === 1) {
                    setMessages(newMessages);
                } else {
                    setMessages(prev => [...newMessages, ...prev]);
                }

                return {
                    success: true,
                    data: newMessages,
                    hasMore: newMessages.length === limit
                };
            } else {
                console.error('Error al obtener mensajes IA:', response.data.message);
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Error en la llamada a la API de mensajes IA:', error);
            return { success: false, error: error.message };
        } finally {
            setLoadingMessages(false);
        }
    }, [urlApi, token]);

    // MARK: fetchAIModels
    // Función para cargar modelos de IA disponibles
    const fetchAIModels = useCallback(async (setSelectedAIModel) => {
        if (!token) return;

        try {
            const endpoint = `${urlApi}/ai-api/models`;
            console.log('Obteniendo modelos IA desde:', endpoint);

            const response = await axios.get(endpoint, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                const models = response.data.data;
                console.log("models", response.data);
                console.log(`${models.length} modelos IA obtenidos`);
                setAiModels(models);

                // Seleccionar el modelo predeterminado (isDefault: true) si existe
                if (models && models.length > 0) {
                    const defaultModel = models.find(model => model.isDefault) || models[0];
                    console.log('Modelo seleccionado por defecto:', defaultModel);
                    if (setSelectedAIModel) {
                        setSelectedAIModel(defaultModel);
                    }
                }

                return { success: true, data: models };
            } else {
                console.error('Error al obtener modelos IA:', response.data.message);
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Error en la llamada a la API de modelos IA:', error);
            return { success: false, error: error.message };
        }
    }, [urlApi, token]);

    // MARK: startConversation
    // Función para iniciar una nueva conversación
    const startConversationAPI = useCallback(async (targetUserId) => {
        if (!token || !targetUserId) return;

        try {
            const endpoint = `${urlApi}/chat-api/conversations`;
            console.log('Iniciando conversación:', endpoint);

            const response = await axios.post(
                endpoint,
                { targetUserId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                const newConversation = response.data.data;
                console.log('Conversación iniciada:', newConversation);

                // Añadir a la lista de conversaciones si es nueva
                setConversations(prev => {
                    // Verificar si ya existe
                    const exists = prev.some(c => c._id === newConversation._id);
                    if (exists) return prev;

                    // Si no existe, añadirla al principio
                    return [newConversation, ...prev];
                });

                return { success: true, data: newConversation };
            } else {
                console.error('Error al iniciar conversación:', response.data.message);
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Error en la llamada a la API para iniciar conversación:', error);
            return { success: false, error: error.message };
        }
    }, [urlApi, token]);

    return {
        fetchConversations,
        fetchMessages,
        fetchAIMessages,
        fetchAIModels,
        startConversationAPI
    };
};