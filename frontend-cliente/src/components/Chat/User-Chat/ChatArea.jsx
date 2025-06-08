import React, { useContext, useEffect, useRef } from 'react';
import { ChatContext } from '../../../context/chat/ChatContext';
import { useAuth } from '../../../context/AuthContext';
import MessageItem from '../MessageItem';
import './ChatArea.css';

const ChatArea = () => {
  const {
    currentChat, // Ahora es { _id (del otro), name, role, activeConversationId, type }
    messages,
    newMessageInput,
    setNewMessageInput,
    sendMessageToUser, // Nueva función específica
    handleTypingEvent, // Nueva función específica
    isTyping, // { conversationId: { userId, isTyping }}
    loadingMessages,
  } = useContext(ChatContext);
  const { user } = useAuth(); // Obtenemos el usuario actual desde AuthContext

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  }, [newMessageInput, isTyping]);


  const handleInputChange = (e) => {
    setNewMessageInput(e.target.value);
    if (currentChat?.activeConversationId && currentChat?._id) { // Asegurar que hay un destinatario
      handleTypingEvent(true);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (newMessageInput.trim() && currentChat?.activeConversationId) {
      sendMessageToUser(newMessageInput);
    }
  };

  if (!currentChat || !currentChat.activeConversationId) { // Si no hay una conversación activa seleccionada
    return (
      <div className="empty-chat-area">
        <div className="empty-chat-message">
          <h3>Selecciona una conversación para comenzar.</h3>
          <p>Puedes chatear con otros usuarios o con nuestro asistente de IA.</p>
        </div>
      </div>
    );
  }

  // Determinar si la conversación está cerrada
  const isConversationClosed = messages.some(
    (msg) => msg.type === 'systemNotification' && msg.content?.toLowerCase().includes('conversación cerrada')
  );
  const otherUserIdInChat = currentChat._id; // ID del otro usuario

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-avatar">
            <span>{currentChat.name?.charAt(0).toUpperCase() || '?'}</span>
          </div>
          <div className="chat-user-details">
            <h4>{currentChat.name || 'Chat'}</h4>
            {isTyping(currentChat.activeConversationId, otherUserIdInChat) ? (
              <span className="chat-status typing">Escribiendo...</span>
            ) : (
              <span className="chat-status">{/* Aquí podrías poner 'Online' si tienes esa info */}</span>
            )}
          </div>
        </div>
        {/* Aquí podrías añadir opciones como ver perfil, etc. */}
      </div>

      <div className="messages-container">
        {loadingMessages ? (
          <div className="loading-spinner" style={{ margin: 'auto' }}>Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>No hay mensajes aún. ¡Envía el primero!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageItem
              key={message._id} // Usar _id real si existe, sino el tempId
              message={message}
              // isOwn si el senderId del mensaje es el user
              isOwn={
                // Compara IDs teniendo en cuenta que senderId puede ser un objeto o un string
                (message.senderId && user &&
                  (typeof message.senderId === 'string'
                    ? message.senderId === user._id
                    : message.senderId._id === user._id)
                ) ||
                // O si es un mensaje optimista de tipo 'user' sin senderId
                (message.senderType === 'user' && !message.senderId)
              }
            />
          ))
        )}
        {/* Indicador de "escribiendo" para el otro usuario */}
        {otherUserIdInChat && isTyping(currentChat.activeConversationId, otherUserIdInChat) && (
          <div className="typing-indicator-container other-message"> {/* Estilo como mensaje del otro */}
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input-container" onSubmit={handleFormSubmit}>
        <input
          type="text"
          placeholder={isConversationClosed ? "Esta conversación ha sido cerrada." : "Escribe un mensaje..."}
          value={newMessageInput}
          onChange={handleInputChange}
          disabled={isConversationClosed || loadingMessages}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!newMessageInput.trim() || isConversationClosed || loadingMessages}
        >
          Enviar
        </button>
      </form>
    </div>
  );
};

export default ChatArea;