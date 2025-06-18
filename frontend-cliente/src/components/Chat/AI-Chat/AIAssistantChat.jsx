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
    fetchAIMessages, // Para cargar mensajes
    isAISending,
    aiConversationId, // ID de la conversación con la IA
    loadingMessages, // Para cuando se cargan mensajes de IA
    setMessages, // Para limpiar mensajes
    escalateToAgent, // Función para escalar a agente
  } = useContext(ChatContext);
  const { user: currentUser } = useAuth();

  const [showModelSelection, setShowModelSelection] = useState(false);
  const messagesEndRef = useRef(null);

  // Sort messages by timestamp to ensure correct order
  const sortedMessages = React.useMemo(() => {
    return [...messages].sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0);
      const dateB = new Date(b.createdAt || b.timestamp || 0);
      return dateA - dateB; // Oldest first
    });
  }, [messages]);

  // Load models on mount
  useEffect(() => {
    if (aiModels.length === 0) {
      fetchAIModels();
    }
  }, [fetchAIModels, aiModels.length]);

  // Load messages when conversation or model changes
  useEffect(() => {
    if (aiConversationId) {
      console.log('Loading messages for conversation:', aiConversationId);
      fetchAIMessages(aiConversationId);
    } else if (selectedAIModel) {
      console.log('Attempting to load most recent conversation for model:', selectedAIModel._id);
      // The ChatContext should handle loading the most recent conversation for this model
    } else {
      console.log('No conversation ID and no selected model');
      setMessages([]);
    }
  }, [aiConversationId, selectedAIModel, fetchAIMessages, setMessages]);

  // Scroll to bottom when messages or loading state changes
  useEffect(() => {
    if (!loadingMessages) {
      // Small timeout to ensure DOM is updated
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, loadingMessages]);

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

  // Función para formatear las respuestas de las herramientas
  const formatToolResponse = (toolName, data) => {
    try {
      switch (toolName) {
        case 'searchMenuItems':
          if (!data.success || !data.data || data.data.length === 0) {
            return 'No se encontraron resultados.';
          }
          return data.data.map(item => 
            `• ${item.name} - $${item.price?.toFixed(2)}\n  ${item.description || ''}`
          ).join('\n\n');
        
        case 'getOrderStatus':
          if (!data.success) return data.error || 'No se pudo obtener el estado del pedido.';
          return `Estado del pedido #${data.data._id}: ${data.data.status}\nTotal: $${data.data.totalAmount.toFixed(2)}`;
        
        case 'getOrderHistory':
          if (!data.success || !data.data || data.data.length === 0) {
            return 'No tienes pedidos recientes.';
          }
          return 'Tus pedidos recientes:\n' + data.data.map(order => 
            `• #${order._id} - ${new Date(order.createdAt).toLocaleDateString()}\n  Estado: ${order.status}\n  Total: $${order.totalAmount.toFixed(2)}`
          ).join('\n\n');
        
        case 'getMenuCategories':
          if (!data.success || !data.data || data.data.length === 0) {
            return 'No se encontraron categorías.';
          }
          return 'Categorías disponibles:\n' + data.data.map(cat => `• ${cat}`).join('\n');
        
        default:
          return 'Respuesta recibida.';
      }
    } catch (error) {
      console.error('Error formateando respuesta de herramienta:', error);
      return 'Se recibió una respuesta inesperada.';
    }
  };

  // Renderizado condicional de mensajes
  const renderMessage = (message) => {
    if (message.type === 'toolResult') {
      let toolName = '';
      let toolData = {};
      
      try {
        const content = JSON.parse(message.content);
        toolName = content.toolName || '';
        toolData = content.data || {};
      } catch (e) {
        console.error('Error parsing tool result:', e);
        return (
          <div className="tool-response">
            <div className="tool-name">Error</div>
            <div className="tool-content">
              No se pudo procesar la respuesta de la herramienta.
            </div>
          </div>
        );
      }

      return (
        <div className="tool-response">
          <div className="tool-name">
            {toolName ? `Resultado de ${toolName}` : 'Resultado de herramienta'}
          </div>
          <div className="tool-content">
            {formatToolResponse(toolName, toolData)}
          </div>
        </div>
      );
    }
    
    // Mensaje normal
    return <MessageItem key={message._id || message.tempId} message={message} isOwn={message.senderId?._id === currentUser?._id && message.senderType === 'user'} />;
  };

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
            <div className="ai-loading-spinner"></div> 
            <p>Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="ai-empty-conversation">
            <div className="ai-welcome">
              <h3>¡Hola! Soy tu Asistente IA</h3>
              <p>Selecciona un modelo y pregúntame lo que necesites.</p>
            </div>
            <button 
              className="escalate-button" 
              onClick={escalateToAgent}
              disabled={!aiConversationId}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
              </svg>
              Hablar con un agente
            </button>
          </div>
        ) : (
          <>
            {sortedMessages.map((msg) => {
              // Ensure message has required fields
              const messageWithDefaults = {
                ...msg,
                senderType: msg.senderType || (msg.sender === currentUser?._id ? 'user' : 'assistant'),
                content: msg.content || ''
              };
              
              return (
                <MessageItem
                  key={msg._id || `temp-${msg.tempId}`}
                  message={messageWithDefaults}
                  isOwn={messageWithDefaults.senderType === 'user'}
                />
              );
            })}
            {isAISending && (
              <div className="ai-typing">
                <div className="ai-typing-indicator">
                  <span></span><span></span><span></span>
                </div>
                <p>El asistente está pensando...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="ai-chat-actions">
        <div className="escalate-button-container">
          <button 
            className="escalate-button" 
            onClick={escalateToAgent}
            disabled={!aiConversationId}
            title={!aiConversationId ? "Inicia una conversación con el asistente para habilitar esta opción" : "Hablar con un agente humano"}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
            {aiConversationId ? "Hablar con un agente" : "Inicia una conversación para poder escalar a un agente humano"}
          </button>
          {!aiConversationId && (
            <div className="escalate-tooltip">
              Inicia una conversación con el asistente para habilitar esta opción
            </div>
          )}
        </div>
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