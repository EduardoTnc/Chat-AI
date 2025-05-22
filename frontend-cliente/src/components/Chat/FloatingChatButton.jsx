import React, { useState, useContext, useEffect } from 'react';
import { TiendaContext } from '../../context/TiendaContext';
import { ChatContext } from '../../context/ChatContext';
import ConversationList from './ConversationList';
import ChatArea from './ChatArea';
import AIAssistantChat from './AIAssistantChat';
import './FloatingChatButton.css';

const FloatingChatButton = () => {
  const { token } = useContext(TiendaContext);
  const { conversations, showingAIChat, startAIChat } = useContext(ChatContext);
  
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Calcular el número de mensajes no leídos
  useEffect(() => {
    if (conversations.length > 0) {
      const count = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
      setUnreadCount(count);
    }
  }, [conversations]);
  
  // No mostrar el botón si el usuario no está logeado
  if (!token) {
    return null;
  }
  
  return (
    <>
      {/* Botón flotante circular principal */}
      <button 
        className={`floating-chat-button ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Chat"
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor" />
          </svg>
        ) : (
          <>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" fill="currentColor" />
            </svg>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount}</span>
            )}
          </>
        )}
      </button>
      
      {/* Botón de acceso rápido al asistente IA */}
      {!isOpen && (
        <button 
          className="floating-ai-button"
          onClick={() => {
            startAIChat();
            setIsOpen(true);
          }}
          aria-label="Asistente IA"
          title="Hablar con el asistente IA"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
          </svg>
        </button>
      )}
      
      {/* Panel de chat flotante */}
      <div className={`floating-chat-panel ${isOpen ? 'open' : ''}`}>
        <div className="floating-chat-container">
          <ConversationList />
          {showingAIChat ? <AIAssistantChat /> : <ChatArea />}
        </div>
      </div>
      
      {/* Overlay para cerrar el chat al hacer clic fuera de él */}
      {isOpen && (
        <div className="chat-overlay" onClick={() => setIsOpen(false)} />
      )}
    </>
  );
};

export default FloatingChatButton;
