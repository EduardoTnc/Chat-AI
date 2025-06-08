import { useCallback } from 'react';

export const useChatSelectors = (onlineUsers, typingUsers, user) => {
  // MARK: isUserOnline
  // Verificar si un usuario está en línea
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.includes(userId);
  }, [onlineUsers]);

  // MARK: isUserTyping
  // Verificar si un usuario está escribiendo en una conversación
  const isUserTyping = useCallback((conversationId, userIdToExclude) => {
    const typingData = typingUsers[conversationId];
    return typingData && typingData.userId !== userIdToExclude && typingData.isTyping;
  }, [typingUsers]);

  // MARK: getOtherParticipant
  // Obtener el otro participante de una conversación (no el usuario actual)
  const getOtherParticipant = useCallback((conversation) => {
    if (!conversation || !conversation.participants || !user) return null;
    return conversation.participants.find(p => p._id !== user._id) || null;
  }, [user]);

  // MARK: getTotalUnreadCount
  // Obtener el total de mensajes no leídos en todas las conversaciones
  const getTotalUnreadCount = useCallback((conversations) => {
    if (!conversations || !conversations.length) return 0;
    return conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);
  }, []);

  // MARK: getSortedConversations
  // Ordenar conversaciones por fecha del último mensaje
  const getSortedConversations = useCallback((conversations) => {
    if (!conversations || !conversations.length) return [];
    
    return [...conversations].sort((a, b) => {
      // Fechas de actualización o del último mensaje
      const dateA = a.lastMessage?.createdAt || a.updatedAt || '';
      const dateB = b.lastMessage?.createdAt || b.updatedAt || '';
      
      // Ordenar de más reciente a más antiguo
      return new Date(dateB) - new Date(dateA);
    });
  }, []);

  return {
    isUserOnline,
    isUserTyping,
    getOtherParticipant,
    getTotalUnreadCount,
    getSortedConversations
  };
};