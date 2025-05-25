import React, { useContext } from 'react';
import { ChatContext } from '../../../context/ChatContext';
import './ConversationItem.css';

const ConversationItem = ({ conversation, active }) => {
  const { startConversation, isOnline, isTyping } = useContext(ChatContext);

  // Formatear la fecha del último mensaje
  const formatLastMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = new Date(timestamp);
    const today = new Date();
    
    // Si es hoy, mostrar la hora
    if (messageDate.toDateString() === today.toDateString()) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Si es ayer, mostrar "Ayer"
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    
    // Si es este año, mostrar día y mes
    if (messageDate.getFullYear() === today.getFullYear()) {
      return messageDate.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    }
    
    // Si es otro año, mostrar fecha completa
    return messageDate.toLocaleDateString();
  };

  return (
    <div 
      className={`conversation-item ${active ? 'active' : ''}`}
      onClick={() => startConversation(conversation)}
    >
      <div className="conversation-avatar">
        <span className="avatar-placeholder">
          {conversation.name.charAt(0).toUpperCase()}
        </span>
        {isOnline(conversation._id) && <span className="online-indicator"></span>}
      </div>
      
      <div className="conversation-info">
        <div className="conversation-header">
          <h4 className="conversation-name">{conversation.name}</h4>
          {conversation.lastMessageTime && (
            <span className="conversation-time">
              {formatLastMessageTime(conversation.lastMessageTime)}
            </span>
          )}
        </div>
        
        <div className="conversation-preview">
          {isTyping(conversation._id) ? (
            <span className="typing-indicator">Escribiendo...</span>
          ) : (
            <p className="last-message">{conversation.lastMessage || 'No hay mensajes'}</p>
          )}
          
          {conversation.unreadCount > 0 && (
            <span className="unread-badge">{conversation.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationItem;
