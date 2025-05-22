import React, { useContext, useEffect, useState } from 'react';
import { ChatContext } from '../../context/ChatContext';
import ConversationItem from './ConversationItem';
import UserSearch from './UserSearch';
import './ConversationList.css';

const ConversationList = () => {
  const { conversations, currentChat, getConversationList, loading, startAIChat, showingAIChat } = useContext(ChatContext);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    getConversationList();
  }, []);
  
  // Si estamos mostrando la búsqueda, mostrar el componente UserSearch
  if (showSearch) {
    return <UserSearch onClose={() => setShowSearch(false)} />;
  }

  return (
    <div className="conversation-list">
      <div className="conversation-list-header">
        <h3>Mensajes</h3>
        <div className="conversation-actions">
          <button 
            className="ai-assistant-button" 
            onClick={() => startAIChat()}
            title="Hablar con el asistente IA"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
            </svg>
          </button>
          <button 
            className="new-chat-button" 
            onClick={() => setShowSearch(true)}
            title="Buscar usuarios"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="conversation-items">
        {/* Botón de Asistente IA destacado */}
        <div className="ai-assistant-card" onClick={() => startAIChat()}>
          <div className="ai-assistant-avatar">
            <span>AI</span>
          </div>
          <div className="ai-assistant-info">
            <h4>Asistente IA</h4>
            <p>Consulta información sobre nuestros productos y servicios</p>
          </div>
        </div>
        
        {/* Separador */}
        <div className="conversations-separator">
          <span>Conversaciones recientes</span>
        </div>
        
        {/* Conversaciones normales */}
        {loading ? (
          <div className="loading-spinner">Cargando...</div>
        ) : conversations.length === 0 ? (
          <div className="no-conversations">
            <p>No tienes conversaciones activas</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <ConversationItem
              key={conversation._id}
              conversation={conversation}
              active={currentChat && currentChat._id === conversation._id && !showingAIChat}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
