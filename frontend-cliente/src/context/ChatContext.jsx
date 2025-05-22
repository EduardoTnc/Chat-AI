import { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import { TiendaContext } from './TiendaContext';
import axios from 'axios';

export const ChatContext = createContext(null);

const ChatContextProvider = (props) => {
  const { token, urlApi } = useContext(TiendaContext);
  
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Estado para el asistente IA
  const [showingAIChat, setShowingAIChat] = useState(false);
  const [aiAssistant, setAiAssistant] = useState(null);
  
  // Conectar al socket cuando el usuario inicia sesión
  useEffect(() => {
    if (!token) {
      // Desconectar socket si el usuario cierra sesión
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }
    
    // Crear conexión con Socket.IO
    const newSocket = io(urlApi, {
      auth: { token }
    });
    
    setSocket(newSocket);
    
    // Limpiar al desmontar
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, urlApi]);
  
  // Configurar eventos del socket
  useEffect(() => {
    if (!socket) return;
    
    // Manejar recepción de nuevos mensajes
    socket.on('newMessage', (message) => {
      // Agregar mensaje a la conversación actual si corresponde
      if (currentChat && (currentChat._id === message.sender)) {
        setMessages((prev) => [...prev, message]);
        
        // Marcar como leído automáticamente
        socket.emit('markAsRead', { messageId: message._id });
      }
      
      // Actualizar lista de conversaciones
      getConversationList();
    });
    
    // Manejar confirmación de envío de mensaje
    socket.on('messageSent', (message) => {
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    });
    
    // Manejar errores
    socket.on('messageError', (error) => {
      console.error('Error en mensaje:', error);
      // Aquí podrías mostrar una notificación al usuario
    });
    
    // Obtener usuarios en línea
    socket.on('onlineUsers', (users) => {
      setOnlineUsers(users);
    });
    
    // Manejar cambios de estado de usuarios
    socket.on('userStatus', ({ userId, status }) => {
      if (status === 'online') {
        setOnlineUsers((prev) => [...prev, userId]);
      } else {
        setOnlineUsers((prev) => prev.filter(id => id !== userId));
      }
    });
    
    // Manejar eventos de escritura
    socket.on('userTyping', ({ userId }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: true }));
    });
    
    socket.on('userStopTyping', ({ userId }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: false }));
    });
    
    return () => {
      socket.off('newMessage');
      socket.off('messageSent');
      socket.off('messageError');
      socket.off('onlineUsers');
      socket.off('userStatus');
      socket.off('userTyping');
      socket.off('userStopTyping');
    };
  }, [socket, currentChat]);
  
  // Obtener lista de conversaciones
  const getConversationList = async () => {
    if (!token) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${urlApi}/api/messages/conversations`, {
        headers: { token }
      });
      
      if (response.data.success) {
        setConversations(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener conversaciones:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Obtener mensajes de una conversación específica
  const getMessages = async (userId) => {
    if (!token || !userId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${urlApi}/api/messages/conversations/${userId}`, {
        headers: { token }
      });
      
      if (response.data.success) {
        setMessages(response.data.data);
      }
    } catch (error) {
      console.error('Error al obtener mensajes:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Enviar un mensaje
  const sendMessage = () => {
    if (!socket || !currentChat || !newMessage.trim()) return;
    
    // Indicar que el usuario ha dejado de escribir
    socket.emit('stopTyping', { receiverId: currentChat._id });
    
    // Enviar mensaje a través de Socket.IO
    socket.emit('sendMessage', {
      receiverId: currentChat._id,
      content: newMessage.trim()
    });
  };
  
  // Manejar evento de escritura
  const handleTyping = (isTyping) => {
    if (!socket || !currentChat) return;
    
    if (isTyping) {
      socket.emit('typing', { receiverId: currentChat._id });
    } else {
      socket.emit('stopTyping', { receiverId: currentChat._id });
    }
  };
  
  // Establecer la conversación actual
  const startConversation = async (user) => {
    setShowingAIChat(false);
    setCurrentChat(user);
    await getMessages(user._id);
  };
  
  // Iniciar chat con el asistente IA
  const startAIChat = () => {
    setShowingAIChat(true);
    setCurrentChat(null);
    setMessages([]);
  };
  
  // Cargar datos iniciales cuando el usuario inicia sesión
  useEffect(() => {
    if (token) {
      getConversationList();
    } else {
      setConversations([]);
      setMessages([]);
      setCurrentChat(null);
    }
  }, [token]);
  
  const contextValue = {
    conversations,
    currentChat,
    messages,
    newMessage,
    setNewMessage,
    onlineUsers,
    typingUsers,
    loading,
    sendMessage,
    startConversation,
    handleTyping,
    isOnline: (userId) => onlineUsers.includes(userId),
    isTyping: (userId) => typingUsers[userId],
    getConversationList,
    // Funcionalidades del asistente IA
    showingAIChat,
    startAIChat,
    aiAssistant
  };
  
  return (
    <ChatContext.Provider value={contextValue}>
      {props.children}
    </ChatContext.Provider>
  );
};

export default ChatContextProvider;
