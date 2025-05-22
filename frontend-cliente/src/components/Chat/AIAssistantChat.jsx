import React, { useState, useEffect, useRef, useContext } from 'react';
import { TiendaContext } from '../../context/TiendaContext';
import MessageItem from './MessageItem';
import axios from 'axios';
import './AIAssistantChat.css';

const AIAssistantChat = () => {
  const { urlApi, token } = useContext(TiendaContext);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [showModelSelection, setShowModelSelection] = useState(false);
  const [assistant, setAssistant] = useState(null);
  
  const messagesEndRef = useRef(null);
  
  // Cargar la conversación existente al montar el componente
  useEffect(() => {
    loadConversation();
    loadAvailableModels();
  }, []);
  
  // Scroll automático al último mensaje
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Cargar conversación existente con el asistente
  const loadConversation = async () => {
    try {
      setLoadingConversation(true);
      const response = await axios.get(`${urlApi}/api/ai-assistant/conversation`, {
        headers: { token }
      });
      
      if (response.data.success) {
        setMessages(response.data.messages);
        setAssistant(response.data.assistant);
      }
    } catch (error) {
      console.error('Error al cargar la conversación:', error);
    } finally {
      setLoadingConversation(false);
    }
  };
  
  // Cargar modelos de IA disponibles
  const loadAvailableModels = async () => {
    try {
      const response = await axios.get(`${urlApi}/api/ai-assistant/models`, {
        headers: { token }
      });
      
      if (response.data.success && response.data.models.length > 0) {
        setAvailableModels(response.data.models);
        setSelectedModel(response.data.models[0].name); // Seleccionar el primer modelo por defecto
      }
    } catch (error) {
      console.error('Error al cargar modelos disponibles:', error);
    }
  };
  
  // Enviar mensaje al asistente IA
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setLoading(true);
      
      const response = await axios.post(
        `${urlApi}/api/ai-assistant/send`,
        {
          message: newMessage,
          model: selectedModel || undefined
        },
        { headers: { token } }
      );
      
      if (response.data.success) {
        // Agregar tanto el mensaje del usuario como la respuesta del asistente
        setMessages(prev => [...prev, response.data.userMessage, response.data.assistantMessage]);
        
        // Guardar o actualizar la información del asistente
        if (response.data.assistant) {
          setAssistant(response.data.assistant);
        }
      }
      
      setNewMessage('');
    } catch (error) {
      console.error('Error al enviar mensaje al asistente:', error);
      // Mostrar un mensaje de error como si fuera del asistente
      const errorMessage = {
        _id: Date.now().toString(),
        sender: assistant?._id || 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo más tarde.',
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="ai-chat-container">
      {/* Cabecera del chat */}
      <div className="ai-chat-header">
        <div className="ai-header-info">
          <div className="ai-avatar">
            <span>AI</span>
          </div>
          <div className="ai-details">
            <h3>Asistente IA</h3>
            <p className="ai-status">Alimentado por Ollama</p>
          </div>
        </div>
        
        {/* Selector de modelo */}
        <div className="model-selector">
          <button 
            className="model-button"
            onClick={() => setShowModelSelection(!showModelSelection)}
            title="Cambiar modelo de IA"
          >
            {selectedModel || 'Seleccionar modelo'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          {showModelSelection && (
            <div className="model-dropdown">
              {availableModels.length === 0 ? (
                <div className="no-models">No hay modelos disponibles</div>
              ) : (
                availableModels.map(model => (
                  <button
                    key={model.name}
                    className={`model-option ${selectedModel === model.name ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedModel(model.name);
                      setShowModelSelection(false);
                    }}
                  >
                    {model.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Área de mensajes */}
      <div className="ai-messages-area">
        {loadingConversation ? (
          <div className="ai-loading-conversation">
            <div className="ai-loading-spinner"></div>
            <p>Cargando conversación...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="ai-empty-conversation">
            <div className="ai-welcome">
              <h3>¡Hola! Soy el asistente IA de El Buen Gusto</h3>
              <p>Puedo ayudarte con información sobre nuestro menú, horarios, ingredientes, recomendaciones y más. ¿En qué puedo ayudarte hoy?</p>
            </div>
            <div className="ai-suggestions">
              <button onClick={() => setNewMessage('¿Cuáles son los platos más populares?')}>
                ¿Cuáles son los platos más populares?
              </button>
              <button onClick={() => setNewMessage('¿Qué ingredientes contiene la pizza margherita?')}>
                ¿Qué ingredientes contiene la pizza margherita?
              </button>
              <button onClick={() => setNewMessage('¿Tienen opciones vegetarianas?')}>
                ¿Tienen opciones vegetarianas?
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageItem
                key={message._id}
                message={message}
                isOwn={message.sender !== assistant?._id}
              />
            ))}
          </>
        )}
        
        {loading && (
          <div className="ai-typing">
            <div className="ai-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>El asistente está pensando...</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Formulario para enviar mensajes */}
      <form className="ai-message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe tu pregunta aquí..."
          disabled={loading}
        />
        <button 
          type="submit"
          disabled={loading || !newMessage.trim()}
        >
          {loading ? (
            <div className="ai-send-loading"></div>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      </form>
    </div>
  );
};

export default AIAssistantChat;
