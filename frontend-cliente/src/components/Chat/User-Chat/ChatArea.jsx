import React, { useContext, useEffect, useState, useRef } from 'react';
import { ChatContext } from '../../../context/ChatContext';
import MessageItem from '../MessageItem';
import './ChatArea.css';

const ChatArea = () => {
  const {
    currentChat,
    messages,
    newMessage,
    setNewMessage,
    sendMessage,
    handleTyping,
    isTyping
  } = useContext(ChatContext);

  const messagesEndRef = useRef(null);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Desplazamiento automático al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Manejar cambios en el input del mensaje
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);

    // Manejar eventos de escritura
    if (currentChat) {
      handleTyping(true);

      // Limpiar el timeout anterior si existe
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      // Establecer un nuevo timeout
      const newTimeout = setTimeout(() => {
        handleTyping(false);
      }, 1000);

      setTypingTimeout(newTimeout);
    }
  };

  // Manejar el envío del mensaje
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && currentChat) {
      sendMessage();
    }
  };

  if (!currentChat) {
    return (
      <div className="empty-chat-area">
        <div className="empty-chat-message">
          <h3>Selecciona una conversación para comenzar a chatear</h3>
          <p>O inicia una nueva conversación buscando un usuario</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-avatar">
            <span>{currentChat.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="chat-user-details">
            <h4>{currentChat.name}</h4>
            {isTyping(currentChat._id) ? (
              <span className="chat-status typing">Escribiendo...</span>
            ) : (
              <span className="chat-status">En línea</span>
            )}
          </div>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No hay mensajes aún. ¡Envía el primero!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message._id}
              message={message}
              isOwn={message.sender !== currentChat._id}
            />
          ))
        )}
        {isTyping(currentChat._id) && (
          <div className="typing-indicator-container">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-container" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          value={newMessage}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!newMessage.trim()}
        >
          Enviar
        </button>
      </form>
    </div>
  );
};

export default ChatArea;
