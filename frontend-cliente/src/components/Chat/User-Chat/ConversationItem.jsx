import React, { useContext } from 'react';
import { ChatContext } from '../../../context/chat/ChatContext'; // Ajusta la ruta si es necesario
import { useAuth } from '../../../context/AuthContext';
import './ConversationItem.css';

const ConversationItem = ({ conversation, active, onSelect }) => {

  const { isTyping } = useContext(ChatContext);
  const { user: currentUser } = useAuth();

  if (!conversation || !currentUser) return null;

  // Determinar el "otro" participante para mostrar nombre e info
  let displayUser = null;
  if (conversation.type === 'user-to-user' || conversation.type === 'user-to-agent') {
    displayUser = conversation.participants?.find(p => p._id !== currentUser._id);
  }
  // Para 'user-to-ia', el backend podría no popular 'participants' con un objeto User para la IA.
  // El nombre se tomaría de conversation.name o conversation.modelId.
  // Pero este componente ahora filtra conversaciones 'user-to-ia'.

  const displayName = displayUser?.name || conversation.name || 'Chat Desconocido';
  const displayAvatarChar = displayName.charAt(0).toUpperCase();
  const otherUserId = displayUser?._id;

  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const messageDate = new Date(timestamp);
    const today = new Date();
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) return 'Ayer';
    if (messageDate.getFullYear() === today.getFullYear()) {
      return messageDate.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
    return messageDate.toLocaleDateString();
  };

  const lastMessageContent = conversation.lastMessage?.content || 'No hay mensajes aún.';
  const lastMessageTime = conversation.lastMessage?.createdAt || conversation.updatedAt;

  // El `unreadCount` debe ser específico para el `currentUser`
  const unreadForCurrentUser = conversation.unreadCounts?.find(uc => uc.userId === currentUser._id)?.count || 0;

  return (
    <div
      className={`conversation-item ${active ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="conversation-avatar">
        <span className="avatar-placeholder">{displayAvatarChar}</span>
        {/* isOnline no está implementado en el backend actual, lo comento */}
        {/* {isOnline(otherUserId) && <span className="online-indicator"></span>} */}
      </div>

      <div className="conversation-info">
        <div className="conversation-header">
          <h4 className="conversation-name">{displayName}</h4>
          {lastMessageTime && (
            <span className="conversation-time">
              {formatLastMessageTime(lastMessageTime)}
            </span>
          )}
        </div>

        <div className="conversation-preview">
          {otherUserId && isTyping(conversation._id, otherUserId) ? (
            <span className="typing-indicator-item">Escribiendo...</span>
          ) : (
            <p className="last-message" title={lastMessageContent}>
                {conversation.lastMessage?.senderId?._id === currentUser._id ? "Tú: " : ""}
                {lastMessageContent}
            </p>
          )}

          {unreadForCurrentUser > 0 && (
            <span className="unread-badge-item">{unreadForCurrentUser}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;