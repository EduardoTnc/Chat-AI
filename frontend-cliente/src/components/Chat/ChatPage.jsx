import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { ChatContext } from '../../context/chat/ChatContext';
import ConversationList from './ConversationList';
import ChatArea from './User-Chat/ChatArea';
import AIAssistantChat from './AI-Chat/AIAssistantChat';
import './ChatPage.css';
import { useAuth } from '../../context/AuthContext';

const ChatPage = () => {
  const { token } = useAuth();
  const { isAIChatActive } = useContext(ChatContext);

  // Redireccionar si el usuario no está autenticado
  if (!token) {
    return <Navigate to="/" />;
  }

  return (
    <div className="chat-page">
      <div className="chat-container">
        <ConversationList />
        {isAIChatActive ? <AIAssistantChat /> : <ChatArea />}
      </div>
    </div>
  );
};

export default ChatPage;
