import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { useAuth } from './AuthContext';

export const ChatContext = createContext(null);

const ChatContextProvider = (props) => {
  // Usar urlBase para la conexión de socket, y urlApi para las llamadas HTTP
  const { urlBase, urlApi, token, user } = useAuth();

  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null); // Puede ser un objeto User o un objeto especial para IA
  const [messages, setMessages] = useState([]); // Mensajes de la conversación actual
  const [onlineUsers, setOnlineUsers] = useState([]); // IDs de usuarios online
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId_o_userId: { userId, isTyping }}

  const [newMessageInput, setNewMessageInput] = useState(''); // Para el input del chat
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Estado para el asistente IA
  const [isAIChatActive, setIsAIChatActive] = useState(false); // True si la UI de chat actual es con IA
  const [aiModels, setAiModels] = useState([]);
  const [selectedAIModel, setSelectedAIModel] = useState(null); // Objeto del modelo seleccionado
  const [aiConversationId, setAiConversationId] = useState(null); // ID de la conversación actual con IA
  const [isAISending, setIsAISending] = useState(false); // Para el spinner de envío a IA
  const [tempMessageIdCounter, setTempMessageIdCounter] = useState(0);

  // MARK: connection
  // Conectar/Desconectar Socket.IO
  useEffect(() => {
    console.log('Inicializando socket - Token disponible:', !!token);
    console.log('Inicializando socket - Usuario disponible:', !!user?._id);

    if (token && user?._id) { // Solo conectar si hay token y usuario efectivos
      console.log('Conectando socket...');
      console.log('URL Base:', urlBase);
      console.log('URL API:', urlApi);
      const newSocket = io(urlBase, {
        auth: { token },
        transports: ['websocket', 'polling'], // Permitir fallback a polling si websocket falla
        reconnectionAttempts: 5,              // Intentar reconectar varias veces
        reconnectionDelay: 1000,              // Esperar 1 segundo entre intentos
        query: { userId: user._id }
      });

      newSocket.on('connect', () => {
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

  // MARK: listeners socket.on
  useEffect(() => {
    if (!socket) return;

    socket.on('connected', (data) => {
      console.log('Conectado al servidor de chat:', data);
      // Podrías solicitar onlineUsers aquí si el backend no los envía al conectar
      // socket.emit('getOnlineUsers');
    });

    socket.on('socketError', (error) => {
      console.error('Error de Socket:', error.message, error.event);
      // Aquí podrías mostrar una notificación al usuario
    });

    // MARK: newMessage
    // Mensaje de otro usuario o agente
    socket.on('newMessage', (newMessageData) => {
      console.log('Nuevo mensaje recibido:', newMessageData);
      const { content: newMsg, conversationId: msgConvId } = newMessageData;

      if (!newMsg || !msgConvId) {
        console.error('Mensaje recibido inválido:', newMessageData);
        return;
      }

      // Determinar si el mensaje es para la conversación activa o no
      const isActiveConversation = !isAIChatActive &&
        currentChat &&
        currentChat.activeConversationId === msgConvId;

      // Incrementar contador de no leídos solo si el mensaje es de otro usuario y no es la conversación activa
      const shouldIncrementUnread = !isActiveConversation;

      console.log('Actualizar conversaciones - isActiveConversation:', isActiveConversation);
      console.log('Actualizar conversaciones - shouldIncrementUnread:', shouldIncrementUnread);

      // Actualizar la lista de conversaciones
      setConversations(prevConvs => {
        console.log('Conversaciones previas:', prevConvs);
        // Buscar si la conversación ya existe en el estado
        const existingConvIndex = prevConvs.findIndex(conv => conv._id === msgConvId);

        // Si existe, actualizar la conversación existente
        const updatedConvs = [...prevConvs];
        const currentUnreadCount = updatedConvs[existingConvIndex].unreadCount || 0;

        updatedConvs[existingConvIndex] = {
          ...updatedConvs[existingConvIndex],
          lastMessage: newMessageData,
          updatedAt: newMessageData.createdAt,
          unreadCount: shouldIncrementUnread ? currentUnreadCount + 1 : currentUnreadCount
        };
        console.log('Conversaciones actualizadas:', updatedConvs);

        // Reordenar conversaciones por fecha de actualización (más recientes primero)
        return updatedConvs.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      });


      // Si es el chat actual (user-to-user o user-to-agent)
      if (!isAIChatActive && currentChat && currentChat.activeConversationId === msgConvId) {
        // Verificar si el mensaje es del usuario con el que estamos chateando actualmente
        const isFromCurrentChatUser = newMessageData.senderId && newMessageData.senderId._id === currentChat._id;

        console.log('Mensaje en conversación activa - isFromCurrentChatUser:', isFromCurrentChatUser);

        // Añadir mensaje a la conversación actual
        setMessages(prev => [...prev, newMessageData]);

        // Si el mensaje es de otro usuario y estamos viendo la conversación, marcar como leído
        if (isFromCurrentChatUser && socket) {
          console.log('Marcando mensaje como leído:', newMessageData._id);
          socket.emit('markMessageAsRead', {
            messageId: newMessageData._id,
            conversationId: msgConvId,
            readerId: user._id
          });

          // Restablecer el contador de no leídos para esta conversación
          setConversations(prevConvs => {
            return prevConvs.map(conv =>
              conv._id === msgConvId ? { ...conv, unreadCount: 0 } : conv
            );
          });
        }
      } else {
        // Notificación para otro chat (ej. un badge)
        console.log('Mensaje para otra conversación o IA no activa:', newMessageData);



        // Aquí podríamos añadir notificaciones de escritorio si el navegador lo soporta
        if (Notification && Notification.permission === 'granted') {
          const senderName = newMessageData.senderId?.name || 'Usuario';
          new Notification('Nuevo mensaje', {
            body: `${senderName}: ${newMessageData.content.substring(0, 50)}${newMessageData.content.length > 50 ? '...' : ''}`,
          });
        }
      }
    });

    // MARK: messageSent
    // Confirmación de tu propio mensaje enviado a otro usuario
    socket.on('messageSent', (data) => {
      console.log('Mensaje enviado (confirmación):', data);
      const { message: sentMsg, tempId } = data;
      // Actualizar el mensaje temporal con el real del servidor
      setMessages(prevMsgs => prevMsgs.map(m => (m._id === tempId ? { ...sentMsg, _id: sentMsg._id } : m)));
      // Actualizar la lista de conversaciones
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv._id === sentMsg.conversationId
            ? { ...conv, lastMessage: sentMsg, updatedAt: sentMsg.createdAt }
            : conv
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
    });

    // MARK: userMessageToIASent
    socket.on('userMessageToIASent', (data) => { // Confirmación de tu mensaje a IA
      console.log('Mensaje a IA enviado (confirmación):', data);
      const { message: sentQuery, tempId } = data;
      if (isAIChatActive) {
        // Si no hay aiConversationId, establecerlo con el de la primera query
        if (!aiConversationId && sentQuery.conversationId) {
          setAiConversationId(sentQuery.conversationId);
        }
        setMessages(prevMsgs => prevMsgs.map(m => (m._id === tempId ? { ...sentQuery, _id: sentQuery._id } : m)));
      }
      setIsAISending(false); // La IA está procesando
    });

    // MARK: newMessageFromIA
    socket.on('newMessageFromIA', (data) => {
      console.log('Nuevo mensaje de IA:', data);
      const { message: aiMsg, conversationId: aiMsgConvId, isError } = data;
      if (isAIChatActive && aiMsgConvId === aiConversationId) {
        setMessages(prev => [...prev, aiMsg]);
      }
      // Actualizar la conversación de IA en la lista (si se muestra)
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv._id === aiMsgConvId && conv.type === 'user-to-ia' // O un identificador especial para la conv IA
            ? { ...conv, lastMessage: aiMsg, updatedAt: aiMsg.createdAt }
            : conv
        ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      );
      setIsAISending(false);
    });

    // MARK: escalationInProgress
    socket.on('escalationInProgress', (data) => {
      console.log('Escalación en progreso:', data);
      if (isAIChatActive && data.conversationId === aiConversationId) {
        // Mostrar un mensaje de sistema o actualizar UI
        const systemMessage = {
          _id: `system_${Date.now()}`,
          senderType: 'systemNotification',
          content: data.message || "Estamos conectándote con un agente...",
          createdAt: new Date().toISOString(),
          conversationId: data.conversationId,
        };
        setMessages(prev => [...prev, systemMessage]);
      }
    });

    // MARK: agentJoinedChat
    socket.on('agentJoinedChat', (data) => {
      console.log('Agente se unió al chat:', data);
      if (!isAIChatActive && currentChat && currentChat.activeConversationId === data.conversationId) {
        const systemMessage = {
          _id: `system_agent_join_${Date.now()}`,
          senderType: 'systemNotification',
          content: data.message || `El agente ${data.agent?.name || ''} se ha unido.`,
          createdAt: new Date().toISOString(),
          conversationId: data.conversationId,
        };
        setMessages(prev => [...prev, systemMessage]);
        // Podrías actualizar el 'currentChat' para reflejar que ahora es con un agente
        // setCurrentChat(prev => ({ ...prev, type: 'user-to-agent', agent: data.agent }));
      }
    });

    // MARK: conversationClosed
    socket.on('conversationClosed', (data) => {
      console.log('Conversación cerrada:', data);
      if ((!isAIChatActive && currentChat && currentChat.activeConversationId === data.conversationId) ||
        (isAIChatActive && aiConversationId === data.conversationId)) {
        // Mostrar mensaje y deshabilitar input
        const systemMessage = {
          _id: `system_closed_${Date.now()}`,
          senderType: 'systemNotification',
          content: `Esta conversación ha sido cerrada por un ${data.closedBy === 'agent' ? 'agente' : 'usuario'}.`,
          createdAt: new Date().toISOString(),
          conversationId: data.conversationId,
        };
        setMessages(prev => [...prev, systemMessage]);
        // Aquí el UI debería deshabilitar el input de mensajes.
      }
      // Actualizar estado de la conversación en la lista
      setConversations(prevConvs =>
        prevConvs.map(conv =>
          conv._id === data.conversationId
            ? { ...conv, status: `closed_by_${data.closedBy}` }
            : conv
        )
      );
    });

    // MARK: messageRead
    socket.on('messageRead', (data) => { // { messageId, conversationId, readerId }
      console.log('Mensaje leído por otro:', data);
      if (!isAIChatActive && currentChat && currentChat.activeConversationId === data.conversationId) {
        setMessages(prevMsgs => prevMsgs.map(msg =>
          msg._id === data.messageId
            ? { ...msg, readBy: [...(msg.readBy || []), data.readerId] }
            : msg
        ));
      }
    });

    // MARK: messageReadAck
    socket.on('messageReadAck', (data) => { // { messageId, conversationId }
      console.log('Confirmación de mi marca de lectura:', data);
      // El UI podría usar esto si necesita una confirmación explícita del servidor.
    });

    // MARK: userTyping
    socket.on('userTyping', ({ senderId, conversationId: typingConvId, isTyping }) => {
      // console.log('User typing:', senderId, typingConvId, isTyping);
      if (!isAIChatActive && currentChat && currentChat._id === senderId && typingConvId === currentChat.activeConversationId) {
        setTypingUsers(prev => ({ ...prev, [typingConvId]: { userId: senderId, isTyping } }));
      }
    });


    //! MARK: Falta onlineUsers
    // No hay 'onlineUsers' o 'userStatus' en el backend actual, los comento.
    // socket.on('onlineUsers', setOnlineUsers);
    // socket.on('userStatus', ({ userId, status }) => { ... });


    return () => {
      socket.off('connected');
      socket.off('socketError');
      socket.off('newMessage');
      socket.off('messageSent');
      socket.off('userMessageToIASent');
      socket.off('newMessageFromIA');
      socket.off('escalationInProgress');
      socket.off('agentJoinedChat');
      socket.off('conversationClosed');
      socket.off('messageRead');
      socket.off('messageReadAck');
      socket.off('userTyping');
    };
  }, [socket, currentChat, isAIChatActive, aiConversationId, user?._id]);



  // MARK: fetchConversations
  const fetchConversations = useCallback(async (page = 1, limit = 20) => {
    if (!token) return { conversations: [], totalPages: 0, currentPage: 1 };
    setLoadingConversations(true);
    try {
      const response = await axios.get(`${urlApi}/chat-api/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit }
      });

      if (response.data.success) {
        // Añadir un identificador 'type' a las conversaciones para el UI si no viene del backend
        const convs = response.data.data.conversations.map(c => ({ ...c, type: c.type || 'user-to-user' }));
        setConversations(convs);
        console.log("fetchConversations, Conversaciones obtenidas:", response.data.data.conversations, "TotalPages:", response.data.data.totalPages, "CurrentPage:", response.data.currentPage);
        return { conversations: convs, totalPages: response.data.data.totalPages, currentPage: response.data.currentPage };
      }
    } catch (error) {
      console.error('Error al obtener conversaciones:', error);
    } finally {
      setLoadingConversations(false);
    }
    return { conversations: [], totalPages: 0, currentPage: 1 };
  }, [token, urlApi]);

  // MARK: fetchMessages
  const fetchMessages = useCallback(async (conversationId, type = 'user-to-user') => { // type: 'user-to-user' o 'user-to-ia'
    console.log("fetchMessages, Conversación seleccionada:", conversationId, "Tipo:", type);

    if (!token || !conversationId) return [];
    setLoadingMessages(true);
    setMessages([]); // Limpiar mensajes anteriores
    try {
      const endpoint = type === 'user-to-ia'
        ? `${urlApi}/ai-api/conversations/${conversationId}/messages`
        : `${urlApi}/chat-api/${conversationId}/messages`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('fetchMessages, Mensajes obtenidos:', response.data);
      if (response.data.success) {
        setMessages(response.data.data);
        // Marcar la conversación como leída al cargar los mensajes
        markConversationAsReadHttp(conversationId, type);
        return response.data.data;
      }
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
    } finally {
      setLoadingMessages(false);
    }
    return [];
  }, [token, urlApi]);

  // MARK: markConversationAsReadHttp
  const markConversationAsReadHttp = useCallback(async (conversationId, type = 'user-to-user') => {
    if (!token || !conversationId) return;
    try {
      const endpoint = type === 'user-to-ia'
        ? `${urlApi}/ai-api/conversations/${conversationId}/mark-as-read`
        : `${urlApi}/chat-api/${conversationId}/mark-as-read`;
      await axios.post(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } });
      // Actualizar el contador de no leídos en el estado local
      setConversations(prev => prev.map(c => c._id === conversationId ? { ...c, unreadCount: 0 } : c));
    } catch (error) {
      console.error('Error marcando conversación como leída:', error);
    }
  }, [token, urlApi]);

  // MARK: requestNotificationPermission
  // Función para solicitar permisos de notificaciones de escritorio
  const requestNotificationPermission = useCallback(async () => {
    if (Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Permiso de notificación:', permission);
        return permission === 'granted';
      } catch (error) {
        console.error('Error al solicitar permiso de notificación:', error);
        return false;
      }
    }
    return Notification && Notification.permission === 'granted';
  }, []);

  // MARK: markConversationAsRead
  // Función para marcar todos los mensajes de una conversación como leídos
  const markConversationAsRead = useCallback((conversationId) => {
    if (!socket || !conversationId) return;

    console.log('Marcando conversación como leída:', conversationId);
    socket.emit('markConversationAsRead', { conversationId });

    // Actualizar contador de no leídos localmente
    setConversations(prevConvs => {
      return prevConvs.map(conv =>
        conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
      );
    });
  }, [socket]);

  const fetchAIModels = useCallback(async () => {
    console.log("Fetching AI models...");

    try {
      const response = await axios.get(`${urlApi}/ai-api/models`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Response data:", response.data);
      if (response.data.data.length > 0) {
        setAiModels(response.data.data);
        if (!selectedAIModel) { // Si no hay modelo seleccionado, tomar el primero
          setSelectedAIModel(response.data.data[0]);
        }
      } else {
        setAiModels([]);
      }
    } catch (error) {
      console.error('Error al cargar modelos de IA:', error);
      setAiModels([]);
    }
  }, [urlApi, token]);

  // MARK: - selectConversation
  const selectConversation = useCallback(async (conversationData) => {
    if (!conversationData || !conversationData._id) {
      console.warn("Intento de seleccionar conversación inválida", conversationData);
      return;
    }

    setIsAIChatActive(false); // Asegurar que no estamos en modo IA
    setAiConversationId(null);
    // El objeto 'conversationData' de la lista ya tiene los participantes.
    // Necesitamos identificar al 'otro' participante para mostrar su nombre.
    const otherParticipant = conversationData.participants.find(p => p._id !== user._id);
    setCurrentChat({
      _id: otherParticipant ? otherParticipant._id : conversationData._id, // ID del otro usuario o de la conversación si es IA/grupo
      name: otherParticipant ? otherParticipant.name : conversationData.name || 'Chat',
      role: otherParticipant ? otherParticipant.role : null,
      activeConversationId: conversationData._id, // Guardar el ID real de la conversación
      type: conversationData.type,
      // Podrías añadir más info del 'otherParticipant' si es necesario
    });
    await fetchMessages(conversationData._id, conversationData.type);

    // Marcar la conversación como leída si tiene mensajes no leídos
    if (conversationData.unreadCount && conversationData.unreadCount > 0) {
      markConversationAsRead(conversationData._id);
    }

    // Solicitar permisos de notificación si aún no se han concedido
    requestNotificationPermission();
  }, [user?._id, fetchMessages, markConversationAsRead, requestNotificationPermission]);

  const selectAIChat = useCallback(async () => {
    console.log("Seleccionando chat con IA");
    setIsAIChatActive(true);
    setCurrentChat(null); // No hay 'otro usuario' en el chat con IA
    setLoadingMessages(true);
    setMessages([]); // Limpiar mensajes previos
    if (!selectedAIModel && aiModels.length > 0) {
      setSelectedAIModel(aiModels[0]);
    }

    // Buscar si ya existe una conversación con el modelo seleccionado
    // O permitir que se cree al enviar el primer mensaje.
    // Por ahora, asumimos que `aiConversationId` se setea con la primera respuesta o es null.
    if (aiConversationId) {
      await fetchMessages(aiConversationId, 'user-to-ia');
    } else {
      // Podrías cargar un mensaje de bienvenida o esperar al primer mensaje del usuario
      setMessages([
        { _id: 'ai-welcome', senderType: 'IA', content: `Hola, soy tu asistente IA. Estoy usando el modelo ${selectedAIModel?.name || ''}. ¿Cómo puedo ayudarte?`, createdAt: new Date().toISOString() }
      ]);
      setLoadingMessages(false);
    }
  }, [selectedAIModel, aiModels, fetchMessages, aiConversationId]);

  // MARK: - User to User
  const sendMessageToUser = useCallback(() => {
    console.log("sendMessageToUser");
    console.log("Socket conectado:", socket?.connected);

    if (!socket || !currentChat || !newMessageInput.trim() || isAIChatActive) return;

    // Verificar que tenemos un usuario válido
    if (!user?._id) {
      console.error("No se puede enviar mensaje: Usuario no disponible");
      return;
    }

    const tempId = `temp_${Date.now()}_${tempMessageIdCounter}`;
    setTempMessageIdCounter(prev => prev + 1);

    const message = {
      _id: tempId,
      conversationId: currentChat.activeConversationId,
      senderId: user._id,
      senderType: 'user',
      receiverId: currentChat._id, // ID del otro usuario
      receiverType: 'user',
      content: newMessageInput.trim(),
      type: 'userMessage',
      createdAt: new Date().toISOString(),
      readBy: [user._id]
    };
    setMessages(prev => [...prev, message]);

    socket.emit('sendMessageToUser', {
      receiverId: currentChat._id, // ID del otro usuario
      content: newMessageInput.trim(),
      conversationId: currentChat.activeConversationId,
      tempId,
      clientInfo: { device: 'web', pageUrl: window.location.pathname } // Ejemplo
    });
    setNewMessageInput('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    handleTypingEvent(false); // Dejar de escribir
  }, [socket, currentChat, newMessageInput, isAIChatActive, user, tempMessageIdCounter]);

  // MARK: - User to IA
  const sendMessageToIA = useCallback(() => {
    if (!socket || !newMessageInput.trim() || !isAIChatActive || !selectedAIModel) return;
    setIsAISending(true);

    const tempId = `temp_ia_${Date.now()}_${tempMessageIdCounter}`;
    setTempMessageIdCounter(prev => prev + 1);

    const message = {
      _id: tempId,
      conversationId: aiConversationId, // Puede ser null si es la primera query
      senderId: user._id,
      senderType: 'user',
      content: newMessageInput.trim(),
      type: 'userQuery',
      modelId: selectedAIModel.modelId,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, message]);

    socket.emit('sendMessageToIA', {
      modelId: selectedAIModel.modelId,
      content: newMessageInput.trim(),
      conversationId: aiConversationId,
      tempId,
      clientInfo: { device: 'web', pageUrl: window.location.pathname }
    });
    setNewMessageInput('');
  }, [socket, newMessageInput, isAIChatActive, selectedAIModel, aiConversationId, user?._id, tempMessageIdCounter]);

  // MARK: - Typing
  const typingTimeoutRef = useRef(null);
  const handleTypingEvent = useCallback((isCurrentlyTyping) => {
    if (!socket || !currentChat || isAIChatActive) return; // No 'typing' para IA por ahora

    if (isCurrentlyTyping) {
      socket.emit('typing', { receiverId: currentChat._id, conversationId: currentChat.activeConversationId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { receiverId: currentChat._id, conversationId: currentChat.activeConversationId, isTyping: false });
      }, 2000); // Considerar el usuario dejó de escribir después de 2s
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket.emit('typing', { receiverId: currentChat._id, conversationId: currentChat.activeConversationId, isTyping: false });
    }
  }, [socket, currentChat, isAIChatActive]);



  // MARK: - startConversation
  const startConversation = useCallback(async (targetUser) => {
    console.log("startConversation")

    try {

      // Construir la URL con el prefijo API correcto
      const apiUrl = `${urlApi}/chat-api/conversations`;
      console.log("Enviando solicitud a:", apiUrl);
      console.log("Con token:", token ? "Disponible" : "No disponible");

      // Llamar al backend para crear o obtener la conversación
      const response = await axios.post(apiUrl,
        { targetUserId: targetUser._id },
        { headers: { token: token } }
      );

      if (response.data.success) {
        const newConversation = response.data.data;
        console.log("Conversación obtenida/creada:", newConversation);

        // Verificar si la conversación ya existe en el estado local
        const existingConversation = conversations.find(conv => conv._id === newConversation._id);
        if (!existingConversation) {
          // Si no existe, añadirla al principio de la lista
          setConversations(prev => [newConversation, ...prev]);
        }

        // Establecer esta como la conversación actual
        // Asegurarse de que currentChat tenga la estructura esperada por el UI
        setCurrentChat({
          _id: targetUser._id, // ID del usuario con el que se chatea
          name: targetUser.name,
          email: targetUser.email,
          activeConversationId: newConversation._id, // ID de la conversación real
          type: newConversation.type, // 'user-to-user'
          participants: newConversation.participants // Array de participantes
        });
        setMessages([]); // Limpiar mensajes de la conversación anterior
        setIsAIChatActive(false); // Desactivar chat IA
        setAiConversationId(null); // Limpiar ID de conversación IA

      } else {
        console.error("Error al obtener/crear conversación:", response.data.message);
        // Manejar el error, quizás mostrar una notificación al usuario
      }
    } catch (error) {
      console.error("Error en la llamada a la API para crear conversación:", error);
      // Manejar el error de red o del servidor
    }
  }, [user, conversations, token, urlApi]);



  const contextValue = {
    // Estado
    socket,
    conversations,
    currentChat, // Objeto del otro usuario en chat user-to-user, o null para IA
    messages,
    newMessageInput,
    setNewMessageInput,
    // onlineUsers, // Descomentar si el backend los provee
    typingUsers, // { conversationId: { userId, isTyping }}
    loadingMessages,
    loadingConversations,
    isAISending,

    // Funciones para chat entre usuarios
    selectConversation, // Para user-to-user o user-to-agent
    sendMessageToUser,
    handleTypingEvent,
    startConversation, // Para iniciar una nueva conversación con un usuario
    markConversationAsRead, // Para marcar una conversación como leída
    requestNotificationPermission, // Para solicitar permisos de notificaciones

    // Funciones para chat con IA
    isAIChatActive,
    selectAIChat, // Para activar el modo IA
    aiModels,
    selectedAIModel,
    setSelectedAIModel,
    aiConversationId, // ID de la conversación con IA
    sendMessageToIA,

    // isOnline: (userId) => onlineUsers.includes(userId), // Descomentar si el backend los provee
    isTyping: (conversationId, userIdToExclude) => { // userIdToExclude es el propio usuario actual
      const typingData = typingUsers[conversationId];
      return typingData && typingData.userId !== userIdToExclude && typingData.isTyping;
    },
    fetchConversations, // Para paginación o refresh
    fetchAIModels, // Exportar para que AIAssistantChat lo use
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {props.children}
    </ChatContext.Provider>
  );
};

export default ChatContextProvider;