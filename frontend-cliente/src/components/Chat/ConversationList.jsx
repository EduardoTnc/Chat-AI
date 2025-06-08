import React, { useContext, useEffect, useState } from 'react';
import { ChatContext } from '../../context/chat/ChatContext';
import ConversationItem from './User-Chat/ConversationItem';
import UserSearch from './User-Chat/UserSearch';
import './ConversationList.css';

const ConversationList = () => {
  const {
    conversations,
    currentChat,
    selectConversation,
    loadingConversations,
    fetchConversations, // Para recargar o paginar
    selectAIChat,
    isAIChatActive
  } = useContext(ChatContext);

  const [showUserSearch, setShowUserSearch] = useState(false);

  useEffect(() => {
    // Cargar conversaciones iniciales si no se han cargado
    if (conversations.length === 0 && !loadingConversations) {
      fetchConversations();
    }
  }, []); // Solo al montar

  if (showUserSearch) {
    return <UserSearch onClose={() => setShowUserSearch(false)} />;
  }

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h3>Mensajes</h3>
        <div className="conversation-actions">
          <button
            className={`ai-assistant-button ${isAIChatActive ? 'active' : ''}`} // Clase active si está seleccionado
            onClick={selectAIChat}
            title="Hablar con el asistente IA"
          >
            {/* Icono de IA */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor" />
            </svg>
          </button>
          <button
            className="new-chat-button"
            onClick={() => setShowUserSearch(true)}
            title="Iniciar nuevo chat con usuario"
          >
            {/* Icono de nuevo chat */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      <div className="conversation-items">
        {/* Tarjeta del Asistente IA */}
        <div
          className={`ai-assistant-card ${isAIChatActive ? 'active' : ''}`}
          onClick={selectAIChat}
        >
          <div className="ai-assistant-avatar"><span>AI</span></div>
          <div className="ai-assistant-info">
            <h4>Asistente IA</h4>
            <p>Tu ayudante virtual inteligente</p>
          </div>
        </div>

        <div className="conversations-separator"><span>Conversaciones</span></div>

        {loadingConversations && conversations.length === 0 ? (
          <div className="loading-spinner">Cargando conversaciones...</div>
        ) : !loadingConversations && conversations.length === 0 ? (
          <div className="no-conversations"><p>No tienes conversaciones activas.</p></div>
        ) : (
          conversations
            .filter(conv => conv.type !== 'user-to-ia') // No mostrar conversaciones de IA aquí, ya tienen su card
            .map((conversation) => (
              <ConversationItem
                key={conversation._id}
                conversation={conversation}
                // 'active' para user-to-user o user-to-agent
                active={!isAIChatActive && currentChat && currentChat.activeConversationId === conversation._id}
                onSelect={() => selectConversation(conversation)}
              />
            ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;