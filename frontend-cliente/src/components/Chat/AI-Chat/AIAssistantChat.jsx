import React, { useState, useEffect, useRef, useContext } from 'react';
import { ChatContext } from '../../../context/chat/ChatContext'; // Ajusta la ruta
import { useAuth } from '../../../context/AuthContext';
import MessageItem from '../MessageItem';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './AIAssistantChat.css'; // Mantienes tus estilos

const AIAssistantChat = () => {
  const {
    socket, // Socket para emitir
    messages, // Mensajes del chat actual (filtrados para IA en ChatContext)
    newMessageInput, setNewMessageInput,
    sendMessageToIA, // Nueva función específica
    aiModels, selectedAIModel, setSelectedAIModel,
    fetchAIModels, // Para cargar modelos
    isAISending,
    aiConversationId, // ID de la conversación con la IA
    loadingMessages, // Para cuando se cargan mensajes de IA
    // selectAIChat, // Ya estamos en el chat de IA
  } = useContext(ChatContext);
  const { user: currentUser } = useAuth();

  const [showModelSelection, setShowModelSelection] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (aiModels.length === 0) {
      fetchAIModels();
    }
  }, [fetchAIModels, aiModels.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!selectedAIModel) {
      // Mostrar toast de error si no hay modelo seleccionado
      toast.error('Por favor selecciona un modelo de IA antes de enviar un mensaje');
      return;
    }
    
    if (newMessageInput.trim()) {
      console.log('Enviando mensaje con modelo:', selectedAIModel);
      sendMessageToIA(newMessageInput, selectedAIModel);
    }
  };

  const isConversationClosed = messages.some(
    (msg) => msg.type === 'systemNotification' && msg.content?.toLowerCase().includes('conversación cerrada')
  );

  return (
    <div className="ai-chat-container">
      <div className="ai-chat-header">
        <div className="ai-header-info">
          <div className="ai-avatar"><span>AI</span></div>
          <div className="ai-details">
            <h3>Asistente IA</h3>
            <p className="ai-status">
              {selectedAIModel 
                ? `Usando: ${selectedAIModel.name} (${selectedAIModel.provider || 'Proveedor no especificado'})` 
                : 'Selecciona un modelo'}
            </p>
          </div>
        </div>

        <div className="model-selector">
          <button
            className="model-button"
            onClick={() => setShowModelSelection(!showModelSelection)}
            title="Cambiar modelo de IA"
            disabled={aiModels.length === 0}
          >
            {selectedAIModel?.name || (aiModels.length > 0 ? 'Seleccionar modelo' : 'Cargando modelos...')}
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {showModelSelection && (
            <div className="model-dropdown">
              {aiModels.length === 0 ? (
                <div className="no-models">No hay modelos disponibles</div>
              ) : (
                aiModels.map(model => {
                  // Asegurarse de que el modelo tenga _id, si no usar modelId
                  const modelId = model._id || model.modelId;
                  return (
                    <button
                      key={modelId}
                      className={`model-option ${selectedAIModel?._id === modelId ? 'selected' : ''}`}
                      onClick={() => {
                        // Crear un nuevo objeto con _id garantizado
                        const modelToSelect = { ...model, _id: modelId };
                        console.log('Modelo seleccionado:', modelToSelect);
                        setSelectedAIModel(modelToSelect);
                        setShowModelSelection(false);
                      }}
                    >
                      {model.name} ({model.provider})
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      <div className="ai-messages-area">
        {loadingMessages && messages.length === 0 ? (
          <div className="ai-loading-conversation">
            <div className="ai-loading-spinner"></div> <p>Cargando...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="ai-empty-conversation">
            <div className="ai-welcome">
              <h3>¡Hola! Soy tu Asistente IA</h3>
              <p>Selecciona un modelo y pregúntame lo que necesites.</p>
            </div>
            {/* ... (sugerencias como antes) ... */}
          </div>
        ) : (
          messages.map((message, idx) => (
            <MessageItem
              key={message._id || message.tempId || idx}
              message={message}
              isOwn={message.senderId?._id === currentUser?._id && message.senderType === 'user'}
            />
          ))
        )}
        {isAISending && (
          <div className="ai-typing">
            <div className="ai-typing-indicator"><span></span><span></span><span></span></div>
            <p>El asistente está pensando...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="ai-message-form" onSubmit={handleSendMessage}>
        {!selectedAIModel && (
          <div className="ai-model-prompt">
            <p>Por favor selecciona un modelo de IA para comenzar a chatear</p>
          </div>
        )}
        <div className="ai-message-form-container">
          <input
            type="text"
            value={newMessageInput}
            onChange={(e) => setNewMessageInput(e.target.value)}
            placeholder={
              !selectedAIModel 
                ? "Selecciona un modelo para habilitar el chat" 
                : isConversationClosed 
                  ? "Esta conversación ha sido cerrada." 
                  : "Escribe tu pregunta aquí..."
            }
            disabled={isAISending || !selectedAIModel || loadingMessages || isConversationClosed}
          />
          <button
            type="submit"
            disabled={isAISending || !newMessageInput.trim() || !selectedAIModel || loadingMessages || isConversationClosed}
            title={!selectedAIModel ? "Selecciona un modelo de IA primero" : "Enviar mensaje"}
          >
            {isAISending ? ( 
              <div className="ai-send-loading"></div> 
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AIAssistantChat;