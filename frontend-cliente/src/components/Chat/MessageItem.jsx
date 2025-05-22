import React from 'react';
import './MessageItem.css';

const MessageItem = ({ message, isOwn }) => {
  // Formatear la fecha y hora del mensaje
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message-item ${isOwn ? 'own-message' : 'other-message'}`}>
      <div className="message-content">
        <p>{message.content}</p>
        <span className="message-time">{formatTime(message.createdAt)}</span>
      </div>
    </div>
  );
};

export default MessageItem;
