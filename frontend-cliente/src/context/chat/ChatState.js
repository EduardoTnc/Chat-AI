import { useState } from 'react';

export const useChatState = () => {
  // Chat state
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

  return {
    // Estado básico
    socket, setSocket,
    conversations, setConversations,
    currentChat, setCurrentChat,
    messages, setMessages,
    onlineUsers, setOnlineUsers,
    typingUsers, setTypingUsers,
    newMessageInput, setNewMessageInput,
    loadingMessages, setLoadingMessages,
    loadingConversations, setLoadingConversations,
    
    // Estado IA
    isAIChatActive, setIsAIChatActive,
    aiModels, setAiModels,
    selectedAIModel, setSelectedAIModel,
    aiConversationId, setAiConversationId,
    isAISending, setIsAISending,
    tempMessageIdCounter, setTempMessageIdCounter
  };
};
