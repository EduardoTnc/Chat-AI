import './MessageItem.css';

const MessageItem = ({ message, isOwn }) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determinar clase de estilo adicional basada en senderType si no es 'own'
  let extraClass = '';
  if (!isOwn) {
    if (message.senderType === 'IA') extraClass = 'ia-message';
    else if (message.senderType === 'agent') extraClass = 'agent-message';
    else if (message.senderType === 'systemNotification' || message.senderType === 'tool') extraClass = 'system-message';
  }

  return (
    <div className={`message-item ${isOwn ? 'own-message' : `other-message ${extraClass}`}`}>
      <div className="message-content">
        {/* Añadir el nombre del remitente si no es 'own' y no es IA */}
        {!isOwn && message.senderType === 'agent' && message.senderId?.name && (
          <p className="message-sender-name">{message.senderId.name}</p>
        )}
        {(() => {
          try {
            const parsedContent = JSON.parse(message.content);
            // If it's a valid JSON object, check if it has a single key-value pair
            if (typeof parsedContent === 'object' && parsedContent !== null) {
              const keys = Object.keys(parsedContent);
              if (keys.length > 0) {
                // Display the value of the first key
                return <p>{parsedContent[keys[0]]}</p>;
              }
            }
            // If not a simple key-value JSON, or if it's empty, stringify and pretty-print
            return <pre>{JSON.stringify(parsedContent, null, 2)}</pre>;
          } catch (e) {
            // If not a valid JSON, render as plain text
            return <p>{message.content}</p>;
          }
        })()}
        <span className="message-time">{formatTime(message.createdAt || message.timestamp)}</span>
      </div>
    </div>
  );
};

export default MessageItem;