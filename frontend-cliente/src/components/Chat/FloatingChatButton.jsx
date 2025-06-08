import React, { useState, useContext, useEffect } from 'react';
import { ChatContext } from '../../context/chat/ChatContext';
import { useAuth } from '../../context/AuthContext';
import ConversationList from './ConversationList';
import ChatArea from './User-Chat/ChatArea';
import AIAssistantChat from './AI-Chat/AIAssistantChat';
import './FloatingChatButton.css';

const FloatingChatButton = () => {
  const { isAuthenticated } = useAuth();
  const { conversations, selectAIChat, isAIChatActive } = useContext(ChatContext);

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
  if (!isAuthenticated) {
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
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor" />
          </svg>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            selectAIChat();
            setIsOpen(true);
          }}
          aria-label="Asistente IA"
          title="Hablar con el asistente IA"
        >
          <svg fill="#ffffff" width="44" height="44" viewBox="0 0 100 100" stroke="#ffffff">
            <g>
              <path d="M49.6,25.8c7.2,0,13,5.8,13,13v3.3c-4.3-0.5-8.7-0.7-13-0.7c-4.3,0-8.7,0.2-13,0.7v-3.3C36.6,31.7,42.4,25.8,49.6,25.8z"></path>
              <path d="M73.2,63.8l1.3-11.4c2.9,0.5,5.1,2.9,5.1,5.6C79.6,61.2,76.7,63.8,73.2,63.8z"></path>
              <path d="M25.9,63.8c-3.5,0-6.4-2.6-6.4-5.8c0-2.8,2.2-5.1,5.1-5.6L25.9,63.8z"></path>
              <path d="M68.7,44.9c-6.6-0.7-12.9-1-19-1c-6.1,0-12.5,0.3-19,1c-2.2,0.2-3.8,2.2-3.5,4.3l2,19.4c0.2,1.8,1.6,3.3,3.5,3.5c5.6,0.7,11.3,1,17.1,1s11.5-0.3,17.1-1c1.8-0.2,3.3-1.7,3.5-3.5l2-19.4C72.4,47,70.9,45.1,68.7,44.9z M38.6,62.5c-1.6,0-2.8-1.6-2.8-3.7s1.3-3.7,2.8-3.7s2.8,1.6,2.8,3.7S40.2,62.5,38.6,62.5z M55.3,66.6c0,0.2-0.1,0.4-0.2,0.5c-0.1,0.1-0.3,0.2-0.5,0.2h-9.9c-0.2,0-0.4-0.1-0.5-0.2c-0.1-0.1-0.2-0.3-0.2-0.5v-1.8c0-0.4,0.3-0.7,0.7-0.7h0.2c0.4,0,0.7,0.3,0.7,0.7v0.9h8.1v-0.9c0-0.4,0.3-0.7,0.7-0.7h0.2c0.4,0,0.7,0.3,0.7,0.7V66.6z M60.6,62.5c-1.6,0-2.8-1.6-2.8-3.7s1.3-3.7,2.8-3.7s2.8,1.6,2.8,3.7S62.2,62.5,60.6,62.5z"></path>
            </g>
          </svg>
        </button>
      )}

      {/* Panel de chat flotante */}
      <div className={`floating-chat-panel ${isOpen ? 'open' : ''}`}>
        <div className="floating-chat-container">
          <ConversationList />
          {isAIChatActive ? <AIAssistantChat /> : <ChatArea />}
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
