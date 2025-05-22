import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { TiendaContext } from '../../context/TiendaContext';
import { ChatContext } from '../../context/ChatContext';
import ConversationList from './ConversationList';
import ChatArea from './ChatArea';
import AIAssistantChat from './AIAssistantChat';
import './ChatPage.css';

const ChatPage = () => {
  const { token } = useContext(TiendaContext);
  const { showingAIChat } = useContext(ChatContext);
  
  // Redireccionar si el usuario no está autenticado
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return (
    <div className="chat-page">
      <div className="chat-container">
        <ConversationList />
        {showingAIChat ? <AIAssistantChat /> : <ChatArea />}
      </div>
    </div>
  );
};

export default ChatPage;
