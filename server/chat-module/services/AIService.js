import { ApiError } from '../../utils/errorHandler.js';
import OllamaProvider from '../providers/OllamaProvider.js';
import OpenAIProvider from '../providers/OpenAIProvider.js';
import config from '../../config/index.js';
import Message from '../../models/Message.js';
import PublicDataService from './PublicDataService.js';

class AIService {

    // MARK: - constructor
    constructor(adminConfigService, messageService) { 
        this.adminConfigService = adminConfigService;
        this.messageService = messageService; 
        this.providers = {};
        this.publicDataService = new PublicDataService();
    }

    /**
     * @function _getProviderInstance
     * @description Devuelve una instancia de un proveedor de IA (OpenAI u Ollama) basado en el nombre del proveedor y el identificador API del modelo.
     *              La instancia se almacena en caché para evitar instancias repetidas.
     * @param {string} providerName El nombre del proveedor de IA (OpenAI u Ollama)
     * @param {string} modelApiIdentifier El identificador API del modelo a utilizar (opcional)
     * @returns {Promise<OpenAIProvider|OllamaProvider>} Una instancia del proveedor de IA solicitado
     * @throws {ApiError} Si el proveedor no es compatible o la clave API no está configurada
     */
    async _getProviderInstance(providerName) {
        try {
            // Normalize provider name to lowercase
            const normalizedProvider = providerName.toLowerCase();
            
            // Get the API key using the normalized provider name
            const apiKey = await this.adminConfigService.getApiKey(normalizedProvider);
            
            if (!apiKey) {
                throw new ApiError(`API Key for ${normalizedProvider} not configured in the system.`, 500);
            }
    
            // Initialize the appropriate provider
            switch (normalizedProvider) {
                case 'openai':
                    return new OpenAIProvider(apiKey);
                case 'ollama':
                    return new OllamaProvider(apiKey);
                // Add other providers as needed
                default:
                    throw new ApiError(`Unsupported AI provider: ${normalizedProvider}`, 400);
            }
        } catch (error) {
            console.error(`Error in _getProviderInstance for ${providerName}:`, error);
            throw error;
        }
    }

    /**
     * @function fetchAvailableModels
     * @description Obtiene los modelos de IA que el usuario puede ver/seleccionar.
     *              Devuelve un array de objetos con modelId, name, provider y supportsTools.
     * @param {ObjectId} userId El ID del usuario
     * @param {string} [userRole='user'] El rol del usuario
     * @returns {Promise<Array<{modelId: string, name: string, provider: string, supportsTools: boolean}>>}
     */
    async fetchAvailableModels(userId, userRole = 'user') {
        const allConfigs = await this.adminConfigService.getAllAIModelConfigs();
        return allConfigs.filter(modelConfig => {
            if (!modelConfig.isVisibleToClient) return false;
            if (modelConfig.allowedRoles && modelConfig.allowedRoles.length > 0) {
                return modelConfig.allowedRoles.includes(userRole);
            }
            return true;
        }).map(m => ({
            modelId: m.modelId,
            name: m.name,
            provider: m.provider,
            supportsTools: m.supportsTools
        }));
    }

    /**
     * Prepara el historial de la conversación para que sea consumido por el proveedor de IA.
     * @param {ObjectId} conversationId - El ID de la conversación que se está consultando.
     * @param {string} providerName - El nombre del proveedor de IA que se está utilizando.
     * @param {number} [limit=10] - El número de mensajes que se deben cargar del historial.
     * @returns {Promise<Array<{role: string, content: string, tool_calls?: Array<{id: string, type: string, function: {name: string, arguments: string}}>, tool_call_id?: string}>>}
     *  Un array de objetos con la siguiente estructura:
     *  {
     *      role: string, // El rol del mensaje (user, assistant, tool)
     *      content: string, // El contenido del mensaje
     *      tool_calls?: Array<{ // Opcional, solo para el rol 'assistant'
     *          id: string, // El ID de la llamada a la herramienta
     *          type: string, // El tipo de herramienta (function o variable)
     *          function: { // La función que se llamó
     *              name: string,
     *              arguments: string
     *          }
     *      }>,
     *      tool_call_id?: string // Opcional, solo para el rol 'tool'
     *  }
     */
    async _prepareConversationHistoryForProvider(conversationId, providerName, limit = 20) {
        // Get messages in reverse chronological order (newest first)
        const messagesFromDb = await Message.find({ conversationId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .populate('senderId', 'role')
            .lean();

        // Reverse to get chronological order (oldest first)
        const chronologicalMessages = messagesFromDb.reverse();
        const providerHistory = [];
        const processedToolCalls = new Set();
        const toolResponses = [];

        // First pass: Identify all assistant messages with tool calls and their responses
        for (const msg of chronologicalMessages) {
            if (msg.type === 'IAResponse' && msg.toolCalls?.length > 0) {
                // For each tool call in this message
                for (const toolCall of msg.toolCalls) {
                    // Find the corresponding tool response
                    const toolResponse = chronologicalMessages.find(m => 
                        m.type === 'toolResult' && 
                        (m.toolCallId === toolCall.id || 
                         (m.toolCalls?.[0]?.id === toolCall.id))
                    );
                    
                    if (toolResponse) {
                        toolResponses.push({
                            toolCallId: toolCall.id,
                            response: toolResponse,
                            assistantMsg: msg
                        });
                    }
                }
            }
        }

        // Second pass: Build the conversation history
        for (const msg of chronologicalMessages) {
            // Skip tool responses as we'll handle them with their corresponding assistant messages
            if (msg.type === 'toolResult') continue;

            let role;
            let content = msg.content === null ? "" : msg.content;

            if (msg.type === 'userQuery') role = 'user';
            else if (msg.type === 'IAResponse') role = 'assistant';
            else continue;

            const messagePayload = { role, content };

            // Handle assistant messages with tool calls
            if (role === 'assistant' && msg.toolCalls?.length > 0) {
                messagePayload.content = null;
                
                // Format tool calls for the provider
                messagePayload.tool_calls = msg.toolCalls.map(tc => {
                    const toolCall = {
                        id: tc.id,
                        type: 'function',
                        function: {
                            name: tc.function.name,
                            arguments: typeof tc.function.arguments === 'string' 
                                ? tc.function.arguments 
                                : JSON.stringify(tc.function.arguments)
                        }
                    };
                    return toolCall;
                });

                // Add tool responses that correspond to these tool calls
                for (const toolCall of msg.toolCalls) {
                    const response = toolResponses.find(tr => tr.toolCallId === toolCall.id);
                    if (response) {
                        providerHistory.push(messagePayload);
                        
                        // Add the tool response
                        const toolResponsePayload = {
                            role: 'tool',
                            content: response.response.content || '',
                            tool_call_id: toolCall.id
                        };
                        providerHistory.push(toolResponsePayload);
                        
                        // Mark this tool call as processed
                        processedToolCalls.add(toolCall.id);
                    }
                }
                
                // If we didn't process any tool calls (shouldn't happen if _cleanupPendingToolCalls is working)
                if (msg.toolCalls.every(tc => !processedToolCalls.has(tc.id))) {
                    providerHistory.push(messagePayload);
                }
            } else {
                // Regular message processing
                try {
                    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
                    if (typeof parsedContent === 'object' && parsedContent !== null) {
                        if (parsedContent.parameters?.message) {
                            messagePayload.content = parsedContent.parameters.message;
                        } else if (parsedContent.name === 'human_agent' && parsedContent.parameters) {
                            messagePayload.content = 'El agente humano ha sido notificado y se pondrá en contacto contigo pronto.';
                        } else if (parsedContent.name && parsedContent.parameters) {
                            messagePayload.content = '';
                        } else {
                            messagePayload.content = JSON.stringify(parsedContent, null, 2);
                        }
                    }
                } catch (e) {
                    // Not JSON, use as is
                    messagePayload.content = String(content);
                }
                
                // Only add if we haven't already added this message with tool calls
                if (!(role === 'assistant' && msg.toolCalls?.length > 0)) {
                    providerHistory.push(messagePayload);
                }
            }
        }

        return providerHistory;
    }

    /**
     * Genera una respuesta de IA para una consulta de un usuario.
     * 
     * @param {User} requestingUser - El usuario que inició la petición.
     * @param {string} clientModelId - El modelId del modelo de IA que se debe utilizar.
     * @param {string} userMessageContent - El contenido del mensaje del usuario.
     * @param {string} conversationId - El ID de la conversación en la que se encuentra el usuario.
     * 
     * @returns {Promise<{finalMessage: Message, originalToolCallingMessage: Message}>} - Un objeto con dos propiedades:
     *   - finalMessage: El mensaje final que se envió al usuario.
     *   - originalToolCallingMessage: El mensaje de la IA que llamó a las herramientas (si hubo herramientas) o
     *     null si no hubo herramientas.
     */
    async generateResponse(requestingUser, clientModelId, userMessageContent, conversationId) {
        // Clean up any pending tool calls before starting a new response
        await this._cleanupPendingToolCalls(conversationId);

        // Detect if the user explicitly asks for a human agent and bypass the AI provider
        if (this._isEscalationRequest(userMessageContent)) {
            const escalationContent = await this.handleEscalationTool(requestingUser, conversationId, {
                reason: userMessageContent,
                urgency: 'medium'
            });

            const escalationMessageData = {
                conversationId,
                senderId: null,
                senderType: 'IA',
                content: escalationContent,
                type: 'IAResponse',
                modelId: clientModelId
            };
            const savedEscalationMessage = await this.messageService.createMessage(escalationMessageData, { _id: null, role: 'system' });

            return { finalMessage: savedEscalationMessage, originalToolCallingMessage: null };
        }

        //? 1. Validar y obtener la configuración del modelo
        const modelConfig = await this.adminConfigService.getAIModelConfig(clientModelId);
        if (!modelConfig) {
            throw new ApiError(404, `Modelo de IA '${clientModelId}' no encontrado o no configurado.`);
        }

        //? 2. Obtener la instancia del proveedor y el systemPrompt del modelConfig
        const provider = await this._getProviderInstance(modelConfig.provider, modelConfig.apiIdentifier);
        const systemPrompt = modelConfig.systemPrompt || "You are a helpful assistant.";

        //? 3. Gestión de Historial y Mensaje Actual (el historial ya lo incluye)
        // Para Chat Completions (OpenAI y Ollama), SÍ necesitamos enviar el historial.
        // Si OpenAI Provider usara Assistants API, esta parte cambiaría.
        const messagesForProvider = await this._prepareConversationHistoryForProvider(
            conversationId,
            modelConfig.provider
        );

        //? 4. Preparar las opciones del modelo
        const modelOptions = {
            tools: modelConfig.supportsTools ? this._getToolDefinitions(modelConfig.provider, modelConfig.modelId) : undefined,
            // temperature: modelConfig.modelParameters?.temperature,
            // max_tokens: modelConfig.maxOutputTokens,
        };

        //? 6. Generar la respuesta
        try {
            console.log(`Enviando a ${modelConfig.provider} (${modelConfig.apiIdentifier}):`, JSON.stringify({ messages: messagesForProvider, systemPrompt, modelOptions }, null, 2));
            const aiRawResponse = await provider.generate(
                messagesForProvider,
                systemPrompt,
                modelConfig.apiIdentifier,
                modelOptions
            );
            console.log(`Respuesta de ${modelConfig.provider} (${modelConfig.apiIdentifier}):`, JSON.stringify(aiRawResponse, null, 2));

            //? 7. Guardar el mensaje de respuesta de la IA (antes de procesar tools) (con messageService.createMessage)
            const aiResponseMessageData = {
                conversationId,
                senderId: null, // La IA no es un 'User' en nuestra DB, podría ser un ID de sistema
                senderType: 'IA',
                content: aiRawResponse.content, // Puede ser null si hay tool_calls
                type: 'IAResponse',
                modelId: clientModelId, // El modelId que usó el cliente
                usage: aiRawResponse.usage,
                toolCalls: (aiRawResponse.toolCalls || []).map(tc => ({
                    ...tc,
                    function: {
                        ...tc.function,
                        arguments: JSON.stringify(tc.function.arguments) // Stringify para guardar en DB
                    }
                })) // Guardar las tool_calls que la IA quiere ejecutar
            };
            // El 'requestingUser' se pasa para validaciones de permisos en createMessage si es necesario,
            // pero el mensaje de IA no tiene un senderId de usuario.
            const savedIAResponseMessage = await this.messageService.createMessage(aiResponseMessageData, { _id: null, role: 'system' }); // Pasamos un usuario 'system'

            //? 5. Si la respuesta de la IA incluye tool_calls, necesitamos procesarlas
            if (aiRawResponse.toolCalls && aiRawResponse.toolCalls.length > 0) {
                console.log(`Procesando ${aiRawResponse.toolCalls.length} tool_calls...`);
                const toolResults = [];

                //? 6. Procesar cada tool_call secuencialmente
                for (let toolCall of aiRawResponse.toolCalls || []) {
                    let toolResultContent;
                    let isError = false;

                    try {
                        const toolName = toolCall.function.name;
                        const toolArgs = typeof toolCall.function.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function.arguments;

                        const metadata = {
                            userId: requestingUser._id,
                            conversationId,
                            userRole: requestingUser.role
                        };

                        // Use the handleToolCall method to process all tool calls
                        const result = await this.handleToolCall(toolName, toolArgs, metadata);
                        toolResultContent = JSON.stringify(result);
                    } catch (toolError) {
                        console.error(`Error ejecutando herramienta ${toolCall.function?.name || 'desconocida'}:`, toolError);
                        toolResultContent = JSON.stringify({
                            success: false,
                            error: toolError.message || 'Error al procesar la solicitud'
                        });
                        isError = true;
                    }

                    // Crear y guardar el mensaje de resultado de la herramienta
                    const toolResultMessageData = {
                        conversationId,
                        senderType: 'system',
                        senderId: null, // La herramienta no es un User
                        content: toolResultContent,
                        type: 'toolResult',
                        modelId: clientModelId,
                        toolCallId: toolCall.id, // Importante para OpenAI
                        isError
                    };

                    // Guardar el mensaje de resultado
                    const savedToolResultMessage = await this.messageService.createMessage(
                        toolResultMessageData, 
                        { _id: null, role: 'system' }
                    );

                    // Agregar a los resultados para enviar de vuelta a la IA
                    toolResults.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: toolCall.function.name,
                        content: toolResultContent
                    });
                }

                //? 10. Si hubo tool_calls, necesitamos enviar los resultados de vuelta a la IA para que genere la respuesta final al usuario.
                // Obtener el historial MÁS RECIENTE para la segunda llamada
                const historyForSecondCall = await this._prepareConversationHistoryForProvider(
                    conversationId,
                    modelConfig.provider,
                    20
                );
                const messagesForNextTurn = [...historyForSecondCall, // Historial + query original
                { role: 'assistant', content: aiRawResponse.content, tool_calls: aiRawResponse.toolCalls }, // La respuesta de la IA que pidió tools
                ...toolResults // Los resultados de las tools
                ];
                console.log(`Enviando resultados de tools a ${modelConfig.provider} (${modelConfig.apiIdentifier}):`, JSON.stringify({ messages: messagesForNextTurn, systemPrompt }, null, 2));

                const finalAiResponse = await provider.generate(
                    messagesForNextTurn,
                    systemPrompt,
                    modelConfig.apiIdentifier,
                    {} // Sin tools en esta segunda llamada, esperamos respuesta final
                );
                console.log(`Respuesta final de IA tras tools:`, JSON.stringify(finalAiResponse, null, 2));

                //? 11. Guardar la respuesta final de la IA (con messageService.createMessage)
                const finalResponseMessageData = {
                    conversationId,
                    senderType: 'IA',
                    senderId: null,
                    content: finalAiResponse.content,
                    type: 'IAResponse',
                    modelId: clientModelId,
                    usage: finalAiResponse.usage // Sumar usage si es posible
                };
                const savedFinalMessage = await this.messageService.createMessage(finalResponseMessageData, { _id: null, role: 'system' });

                //? 12. Devolver el mensaje final (con originalToolCallingMessage si hubo tool_calls)
                return { finalMessage: savedFinalMessage, originalToolCallingMessage: savedIAResponseMessage };
            }

            //? 13. Si no hubo tool_calls, la primera respuesta es la final
            return { finalMessage: savedIAResponseMessage };

        } catch (error) {
            console.error(`Error generando respuesta de ${modelConfig.provider} (${modelConfig.apiIdentifier}):`, error);
            throw new ApiError(502, `Error al comunicarse con el servicio de IA: ${error.message}`);
        }
    }

    /**
     * Maneja la búsqueda de ítems del menú cuando es solicitada por la IA.
     * @param {Object} user - El usuario que realizó la solicitud
     * @param {Object} args - Argumentos de la búsqueda
     * @param {string} args.query - Término de búsqueda
     * @param {string} [args.category] - Categoría para filtrar
     * @param {number} [args.maxPrice] - Precio máximo
     * @param {number} [args.limit=5] - Límite de resultados
     * @returns {Promise<string>} Respuesta formateada con los resultados
     */
    /**
     * Limpia tool_calls pendientes en la conversación
     * @private
     */
    /**
     * Cleans up any pending tool calls in the conversation
     * @private
     * @param {string} conversationId - The ID of the conversation to clean up
     */
    async _cleanupPendingToolCalls(conversationId) {
        // Implementation remains the same, just ensuring the JSDoc is properly formatted
        try {
            // Buscar mensajes de asistente con tool_calls sin respuesta
            const pendingMessages = await Message.find({
                conversationId,
                type: 'IAResponse',
                'toolCalls.0': { $exists: true },
                hasToolResponse: { $ne: true } // Asumimos que agregaremos este campo a los mensajes
            });

            for (const msg of pendingMessages) {
                // Verificar si ya hay respuestas para estos tool_calls
                const toolCallIds = msg.toolCalls.map(tc => tc.id);
                const responses = await Message.countDocuments({
                    conversationId,
                    type: 'toolResult',
                    toolCallId: { $in: toolCallIds }
                });

                // Si no hay suficientes respuestas, crear respuestas de error
                if (responses < toolCallIds.length) {
                    for (const toolCall of msg.toolCalls) {
                        const exists = await Message.exists({
                            conversationId,
                            type: 'toolResult',
                            toolCallId: toolCall.id
                        });

                        if (!exists) {
                            const errorResponse = {
                                conversationId,
                                senderType: 'system',
                                content: JSON.stringify({
                                    error: 'La herramienta no pudo procesar la solicitud',
                                    tool_call_id: toolCall.id,
                                    name: toolCall.function.name,
                                    arguments: toolCall.function.arguments
                                }),
                                type: 'toolResult',
                                toolCallId: toolCall.id,
                                isError: true
                            };
                            
                            await this.messageService.createMessage(errorResponse, { _id: null, role: 'system' });
                        }
                    }
                }

                // Marcar como procesado
                msg.hasToolResponse = true;
                await msg.save();
            }
        } catch (error) {
            console.error('Error limpiando tool_calls pendientes:', error);
        }
    }

    async handleMenuSearch(user, { query, category, maxPrice, limit = 5 }) {
        try {
            // Importar dinámicamente el controlador de menú
            const { searchMenuItems } = await import('../../controllers/menuItemController.js');
            
            // Crear un objeto de solicitud simulada
            const req = {
                query: { query, category, maxPrice, limit },
                user: { _id: user._id }
            };
            
            // Crear un objeto de respuesta simulado
            let responseData;
            const res = {
                status: (code) => ({
                    json: (data) => { responseData = data; }
                }),
                json: (data) => { responseData = data; }
            };

            // Llamar directamente al controlador
            await searchMenuItems(req, res);

            // Verificar si hay resultados
            if (!responseData?.success || !responseData?.data || responseData.data.length === 0) {
                return 'No encontré ítems que coincidan con tu búsqueda. ¿Te gustaría intentar con otros términos?';
            }

            // Formatear la respuesta
            const items = responseData.data;
            let responseText = 'Encontré los siguientes ítems que podrían interesarte:\n\n';

            items.forEach((item, index) => {
                responseText += `${index + 1}. *${item.name}* - $${item.price?.toFixed(2) || 'Precio no disponible'}\n`;
                responseText += `   ${item.description || 'Sin descripción'}\n`;
                if (item.category) {
                    responseText += `   Categoría: ${item.category}\n`;
                }
                responseText += '\n';
            });

            return responseText;

        } catch (error) {
            console.error('Error al buscar ítems del menú:', error);
            return 'Lo siento, hubo un error al buscar en el menú. Por favor, inténtalo de nuevo más tarde.';
        }
    }

    /**
     * Maneja la escalada a un agente humano cuando un usuario hace una solicitud explícita o el asistente de IA no puede resolver la consulta después de varios intentos o si el tema es muy sensible o complejo.
     * @param {User} requestingUser - El usuario que inició la escalada
     * @param {string} conversationId - ID de la conversación a escalar
     * @param {{reason: string, urgency: string}} args - Argumentos de la tool_call:
     *    - `reason`: Un resumen conciso de la consulta del usuario y por qué se necesita la escalada. Incluye cualquier contexto relevante de la conversación.
     *    - `urgency`: La urgencia percibida de la solicitud del usuario.
     * @returns {Promise<string>} Contenido para el 'toolResult' con el resultado de la escalada. La IA enviará este contenido al usuario como respuesta final.
     */
    async handleEscalationTool(requestingUser, conversationId, args) {
        // Lógica para escalar a un agente humano
        console.log(`Escalando chat para usuario ${requestingUser._id}, conversación ${conversationId}, razón: ${args.reason}`);

        //? Notificar a los agentes que hay una escalación (utilizando messageService.escalateConversationToAgent)
        await this.messageService.escalateConversationToAgent(conversationId, requestingUser._id, args.reason, args.urgency, true, requestingUser);
        return `He escalado tu solicitud a un agente humano con urgencia ${args.urgency}. Un agente se pondrá en contacto contigo lo antes posible.`; // Contenido para el 'toolResult'
    }

    getPublicDataTools() {
        return [
            {
                type: "function",
                function: {
                    name: "searchMenuItems",
                    description: "Busca elementos del menú por nombre o descripción",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "Término de búsqueda para buscar en nombre o descripción"
                            },
                            category: {
                                type: "string",
                                description: "Filtrar por categoría (opcional)"
                            },
                            limit: {
                                type: "number",
                                description: "Número máximo de resultados (por defecto: 5)"
                            }
                        },
                        required: ["query"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getOrderStatus",
                    description: "Obtiene el estado de un pedido específico del usuario",
                    parameters: {
                        type: "object",
                        properties: {
                            orderId: {
                                type: "string",
                                description: "ID del pedido"
                            }
                        },
                        required: ["orderId"]
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getOrderHistory",
                    description: "Obtiene el historial de pedidos del usuario",
                    parameters: {
                        type: "object",
                        properties: {
                            limit: {
                                type: "number",
                                description: "Número máximo de pedidos a devolver (por defecto: 5)"
                            },
                            page: {
                                type: "number",
                                description: "Número de página para la paginación (por defecto: 1)"
                            }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getMenuCategories",
                    description: "Obtiene la lista de categorías de menú disponibles",
                    parameters: {
                        type: "object",
                        properties: {}
                    }
                }
            }
        ];
    }

    /**
     * Maneja las llamadas a herramientas del asistente de IA
     * @param {string} toolName - Nombre de la herramienta a ejecutar
     * @param {Object} toolArgs - Argumentos para la herramienta
     * @param {Object} metadata - Metadatos adicionales (userId, conversationId, etc.)
     * @returns {Promise<Object>} Resultado de la herramienta
     */
    /**
     * Formatea el estado de un pedido en un texto legible
     * @param {string} status - Estado del pedido
     * @returns {string} Texto formateado
     * @private
     */
    _getOrderStatusText(status) {
        const statusMap = {
            'pending': '⏳ Pendiente',
            'confirmed': '✅ Confirmado',
            'preparing': '👨‍🍳 En preparación',
            'ready': '🚗 Listo para entregar',
            'on_delivery': '🛵 En camino',
            'delivered': '🏠 Entregado',
            'cancelled': '❌ Cancelado',
            'refunded': '💸 Reembolsado'
        };
        
        return statusMap[status] || status;
    }

    /**
     * Maneja las llamadas a herramientas del asistente de IA
     * @param {string} toolName - Nombre de la herramienta a ejecutar
     * @param {Object} toolArgs - Argumentos para la herramienta
     * @param {Object} metadata - Metadatos adicionales (userId, conversationId, etc.)
     * @returns {Promise<Object>} Resultado de la herramienta
     */
    async handleToolCall(toolName, toolArgs, metadata) {
        const { userId, conversationId } = metadata;
        
        try {
            switch (toolName) {
                case 'searchMenuItems':
                    // Hacer la búsqueda más flexible
                    const query = toolArgs.query || '';
                    
                    // Si no hay término de búsqueda, devolver categorías populares
                    if (!query.trim()) {
                        const categories = await this.publicDataService.getMenuCategories();
                        if (categories.success && categories.data?.length > 0) {
                            return {
                                success: true,
                                message: 'Estas son las categorías disponibles. ¿Te gustaría ver los elementos de alguna categoría en particular?',
                                categories: categories.data,
                                isCategoryList: true
                            };
                        }
                    }
                    
                    // Realizar búsqueda normal
                    const menuItems = await this.publicDataService.searchMenuItems(
                        query,
                        {
                            category: toolArgs.category,
                            limit: toolArgs.limit || 10, // Aumentar límite por defecto
                            isAvailable: true
                        }
                    );
                    
                    // Formatear mejor los resultados
                    if (menuItems.success && menuItems.data?.length > 0) {
                        return {
                            success: true,
                            items: menuItems.data,
                            count: menuItems.data.length,
                            query: query,
                            category: toolArgs.category
                        };
                    } else {
                        return {
                            success: false,
                            message: `No encontré elementos que coincidan con "${query}"`,
                            suggestions: ['Prueba con términos más generales', 'Revisa la ortografía', 'Explora nuestras categorías']
                        };
                    }
                    
                case 'getOrderStatus':
                    // Si no se proporciona orderId, obtener el último pedido del usuario
                    if (!toolArgs.orderId) {
                        const orderHistory = await this.publicDataService.getOrderHistory(
                            userId,
                            { limit: 1, page: 1 }
                        );
                        
                        if (orderHistory.success && orderHistory.orders?.length > 0) {
                            // Usar el ID del pedido más reciente
                            toolArgs.orderId = orderHistory.orders[0]._id;
                        } else {
                            return {
                                success: false,
                                message: 'No encontré pedidos recientes. ¿Te gustaría realizar un pedido?',
                                noOrders: true
                            };
                        }
                    }
                    
                    // Obtener estado del pedido
                    const orderStatus = await this.publicDataService.getOrderStatus(
                        toolArgs.orderId,
                        userId
                    );
                    
                    if (orderStatus.success) {
                        return {
                            success: true,
                            order: orderStatus.data,
                            orderId: toolArgs.orderId
                        };
                    } else {
                        return orderStatus; // Devolver el error original
                    }
                    
                case 'getOrderHistory':
                    const history = await this.publicDataService.getOrderHistory(
                        userId,
                        {
                            limit: toolArgs.limit || 5,
                            page: toolArgs.page || 1
                        }
                    );
                    
                    if (history.success) {
                        return {
                            success: true,
                            orders: history.orders,
                            total: history.total,
                            page: toolArgs.page || 1,
                            hasMore: (toolArgs.page || 1) * (toolArgs.limit || 5) < history.total
                        };
                    } else {
                        return history; // Devolver el error original
                    }
                    
                case 'getMenuCategories':
                    const categories = await this.publicDataService.getMenuCategories();
                    if (categories.success) {
                        return {
                            success: true,
                            categories: categories.data,
                            count: categories.data?.length || 0
                        };
                    } else {
                        return categories; // Devolver el error original
                    }
                    
                default:
                    console.warn(`Herramienta no implementada: ${toolName}`);
                    return {
                        success: false,
                        error: 'Esta función no está disponible en este momento',
                        tool: toolName
                    };
            }
        } catch (error) {
            console.error(`Error en la herramienta ${toolName}:`, error);
            return {
                success: false,
                error: 'Ocurrió un error al procesar tu solicitud. Por favor, inténtalo de nuevo más tarde.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            };
        }
    }

    /**
     * Procesa la respuesta de la IA y formatea los resultados de las herramientas
     * @param {Object} aiResponse - Respuesta de la IA que puede contener llamadas a herramientas
     * @param {Object} metadata - Metadatos adicionales (userId, conversationId, etc.)
     * @returns {Promise<Object>} Respuesta formateada para el usuario
     */
    async processAIResponse(aiResponse, metadata) {
        // Si no hay llamadas a herramientas, devolver la respuesta tal cual
        if (!aiResponse.tool_calls || aiResponse.tool_calls.length === 0) {
            return aiResponse;
        }

        // Procesar cada llamada a herramienta
        const toolResults = await Promise.all(
            aiResponse.tool_calls.map(async (toolCall) => {
                try {
                    const toolName = toolCall.function.name;
                    let toolArgs = {};
                    
                    try {
                        toolArgs = JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        console.warn('Error al analizar argumentos de la herramienta:', e);
                    }
                    
                    console.log(`Llamando a herramienta: ${toolName}`, toolArgs);
                    
                    // Ejecutar la herramienta
                    const result = await this.handleToolCall(toolName, toolArgs, metadata);
                    
                    // Formatear la respuesta de la herramienta
                    let formattedContent = '';
                    
                    switch (toolName) {
                        case 'searchMenuItems':
                            if (result.success) {
                                if (result.isCategoryList) {
                                    formattedContent = '📋 *Categorías disponibles*:\n\n';
                                    formattedContent += result.categories.map(cat => `• ${cat}`).join('\n');
                                    formattedContent += '\n\n¿Sobre qué categoría te gustaría más información?';
                                } else if (result.items?.length > 0) {
                                    formattedContent = `🍽️ *Resultados para "${result.query}"`;
                                    if (result.category) {
                                        formattedContent += ` en la categoría "${result.category}"`;
                                    }
                                    formattedContent += ` (${result.count} ${result.count === 1 ? 'resultado' : 'resultados'}):\n\n`;
                                    
                                    formattedContent += result.items.map((item, index) => {
                                        let itemText = `*${index + 1}. ${item.name}*`;
                                        if (item.price) itemText += ` - $${item.price.toFixed(2)}`;
                                        if (item.description) itemText += `\n   ${item.description}`;
                                        if (item.category) itemText += `\n   🏷️ Categoría: ${item.category}`;
                                        return itemText;
                                    }).join('\n\n');
                                }
                            } else {
                                formattedContent = result.message || 'No pude encontrar lo que buscas.';
                                if (result.suggestions?.length > 0) {
                                    formattedContent += '\n\n*Sugerencias:*\n';
                                    formattedContent += result.suggestions.map(s => `• ${s}`).join('\n');
                                }
                            }
                            break;
                            
                        case 'getOrderStatus':
                            if (result.success) {
                                const order = result.order;
                                formattedContent = `📦 *Estado de tu pedido #${result.orderId.slice(-6)}*\n\n`;
                                formattedContent += `Estado actual: *${this._getOrderStatusText(order.status)}*\n`;
                                formattedContent += `Fecha: ${new Date(order.createdAt).toLocaleString()}\n`;
                                formattedContent += `Total: $${order.totalAmount?.toFixed(2) || '0.00'}\n\n`;
                                
                                if (order.items?.length > 0) {
                                    formattedContent += '*Productos:*\n';
                                    formattedContent += order.items.map(item => 
                                        `• ${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}`
                                    ).join('\n');
                                }
                            } else if (result.noOrders) {
                                formattedContent = result.message;
                            } else {
                                formattedContent = 'No pude encontrar información sobre tu pedido. ';
                                formattedContent += 'Por favor, verifica el número de pedido o contacta con soporte.';
                            }
                            break;
                            
                        case 'getOrderHistory':
                            if (result.success && result.orders?.length > 0) {
                                formattedContent = `📜 *Historial de pedidos* (${result.total} en total)\n\n`;
                                
                                formattedContent += result.orders.map(order => {
                                    let orderText = `*Pedido #${order._id.slice(-6)}* - `;
                                    orderText += `${new Date(order.createdAt).toLocaleDateString()}\n`;
                                    orderText += `Estado: ${this._getOrderStatusText(order.status)}\n`;
                                    orderText += `Total: $${order.totalAmount?.toFixed(2) || '0.00'}\n`;
                                    
                                    if (order.items?.length > 0) {
                                        orderText += `${order.items.reduce((sum, item) => sum + item.quantity, 0)} `;
                                        orderText += order.items.length === 1 ? 'producto' : 'productos';
                                    }
                                    
                                    return orderText;
                                }).join('\n\n');
                                
                                if (result.hasMore) {
                                    formattedContent += '\n\n*Nota:* Hay más pedidos disponibles. ';
                                    formattedContent += `Puedes pedir ver la página ${(result.page || 1) + 1} con "ver más pedidos".`;
                                }
                            } else {
                                formattedContent = 'No encontré pedidos anteriores en tu historial.';
                            }
                            break;
                            
                        case 'getMenuCategories':
                            if (result.success && result.categories?.length > 0) {
                                formattedContent = '📋 *Categorías del menú*\n\n';
                                formattedContent += result.categories.map(cat => `• ${cat}`).join('\n');
                                formattedContent += '\n\nPregúntame por los elementos de alguna categoría en particular.';
                            } else {
                                formattedContent = 'No pude cargar las categorías en este momento. Por favor, inténtalo más tarde.';
                            }
                            break;
                            
                        default:
                            // Para herramientas sin formato específico
                            formattedContent = JSON.stringify(result, null, 2);
                    }
                    
                    return {
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: toolName,
                        content: formattedContent || 'No hay información disponible.'
                    };
                } catch (error) {
                    console.error('Error procesando llamada a herramienta:', error);
                    return {
                        tool_call_id: toolCall.id,
                        role: 'tool',
                        name: toolCall.function.name,
                        content: JSON.stringify({
                            success: false,
                            error: error.message || 'Error al procesar la herramienta'
                        })
                    };
                }
            })
        );

        return {
            ...aiResponse,
            tool_calls: aiResponse.tool_calls,
            tool_results: toolResults
        };
    }

    _getToolDefinitions(providerName) {
        // Define all available tools with their specifications
        const commonTools = [
            {
                type: "function",
                function: {
                    name: "searchMenuItems",
                    description: "Busca ítems del menú por nombre, descripción o categoría. Úsalo cuando el usuario pregunte sobre platos, bebidas o cualquier otro ítem del menú.",
                    parameters: {
                        type: "object",
                        properties: {
                            query: {
                                type: "string",
                                description: "Término de búsqueda para encontrar ítems del menú. Puede ser el nombre, ingredientes o descripción."
                            },
                            category: {
                                type: "string",
                                description: "Categoría específica para filtrar los resultados (ej. 'platos principales', 'postres', 'bebidas')."
                            },
                            maxPrice: {
                                type: "number",
                                description: "Precio máximo de los ítems a buscar."
                            },
                            limit: {
                                type: "integer",
                                description: "Número máximo de resultados a devolver.",
                                default: 5
                            }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getOrderStatus",
                    description: "Obtiene el estado actual de un pedido. Si no se proporciona un ID de pedido, devuelve el estado del pedido más reciente del usuario.",
                    parameters: {
                        type: "object",
                        properties: {
                            orderId: {
                                type: "string",
                                description: "ID del pedido (opcional, si no se proporciona, se usará el pedido más reciente)"
                            }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getOrderHistory",
                    description: "Obtiene el historial de pedidos del usuario.",
                    parameters: {
                        type: "object",
                        properties: {
                            limit: {
                                type: "integer",
                                description: "Número máximo de pedidos a devolver (por defecto: 5)",
                                default: 5
                            },
                            page: {
                                type: "integer",
                                description: "Número de página para la paginación (por defecto: 1)",
                                default: 1
                            }
                        }
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "getMenuCategories",
                    description: "Obtiene la lista de categorías de menú disponibles",
                    parameters: {
                        type: "object",
                        properties: {}
                    }
                }
            },
            {
                type: "function",
                function: {
                    name: "escalateToHumanAgent",
                    description: "Escala la conversación actual a un agente humano cuando el usuario lo solicita explícitamente o cuando el asistente de IA no puede resolver la consulta después de varios intentos o si el tema es muy sensible o complejo.",
                    parameters: {
                        type: "object",
                        properties: {
                            reason: {
                                type: "string",
                                description: "Un resumen conciso de la consulta del usuario y por qué se necesita la escalada. Incluye cualquier contexto relevante de la conversación."
                            },
                            urgency: {
                                type: "string",
                                enum: ["low", "medium", "high"],
                                description: "La urgencia percibida de la solicitud del usuario.",
                                default: "medium"
                            }
                        },
                        required: ["reason"]
                    }
                }
            }
        ];

        // Return tools based on provider
        if (!providerName) {
            return commonTools;
        }

        const normalizedProvider = providerName.toLowerCase();
        if (['openai', 'ollama'].includes(normalizedProvider)) {
            return [...commonTools, ...(this.getPublicDataTools() || [])];
        }
        
        return commonTools;
    }

    /**
     * Detecta si el contenido del usuario solicita explícitamente hablar con un agente humano.
     * @param {string} content
     * @returns {boolean}
     * @private
     */
    _isEscalationRequest(content = '') {
        if (!content) return false;
        const escalationRegex = /(humano|asistente humano|personal real|agente|representative|human agent|speak to (?:a )?human|transferir a|escalar|hablar con un)/i;
        return escalationRegex.test(content);
    }
}

export default AIService;