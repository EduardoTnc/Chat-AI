import { ApiError } from '../../utils/errorHandler.js';
import OllamaProvider from '../providers/OllamaProvider.js';
import OpenAIProvider from '../providers/OpenAIProvider.js';
import config from '../../config/index.js';
import Message from '../../models/Message.js';

class AIService {

	// MARK: - constructor
	constructor(adminConfigService, messageService) { // Inyectar MessageService
		this.adminConfigService = adminConfigService;
		this.messageService = messageService; // Para manejar tool_calls y persistencia
		this.providers = {};
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
	async _getProviderInstance(providerName, modelApiIdentifier) {

		//? 1. Generar una clave de caché única para esta combinación de proveedor y modelo
		const cacheKey = `${providerName}-${modelApiIdentifier || 'default'}`;

		//? 2. Verificar si ya existe una instancia en caché
		if (this.providers[cacheKey]) {
			return this.providers[cacheKey];
		}

		//? 3. Crear una nueva instancia según el proveedor
		let instance;

		if (providerName.toLowerCase() === 'openai') {

			//? Si el proveedor es OpenAI, obtener la API Key del adminConfigService
			const apiKey = await this.adminConfigService.getApiKey('OpenAI');
			if (!apiKey) {
				throw new ApiError(500, 'API Key de OpenAI no configurada en el sistema.');
			}
			instance = new OpenAIProvider(apiKey);

		} else if (providerName.toLowerCase() === 'ollama') {

			//? Si el proveedor es Ollama, obtener la URL del adminConfigService
			instance = new OllamaProvider(config.ollama.baseUrl);

		} else {
			throw new ApiError(501, `Proveedor de IA '${providerName}' no soportado.`);
		}

		//? 4. Almacenar la instancia en caché
		this.providers[cacheKey] = instance;

		//? 5. Devolver la instancia
		return instance;
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
	async _prepareConversationHistoryForProvider(conversationId, providerName, limit = 10) {

		const messagesFromDb = await Message.find({ conversationId })
			.sort({ timestamp: -1 })
			.limit(limit)
			.populate('senderId', 'role')
			.lean();

		// Revertir para tener el orden cronológico correcto
		const chronologicalMessages = messagesFromDb.reverse();
		const providerHistory = [];

		// Formatear para el proveedor
		for (const msg of chronologicalMessages) {
			let role;
			let content = msg.content === null ? "" : msg.content;

			if (msg.type === 'userQuery') role = 'user';
			else if (msg.type === 'IAResponse') role = 'assistant';
			else if (msg.type === 'toolResult') role = 'tool';
			else continue;

			const messagePayload = { role, content };

			//? Si es un mensaje de IA que contiene toolCalls
			if (role === 'assistant') {
				if (msg.toolCalls && msg.toolCalls.length > 0) {
					// Si hay toolCalls, el content debe ser null para Ollama y OpenAI
					messagePayload.content = null;
					if (providerName.toLowerCase() === 'ollama') {
						// Formato para Ollama: tool_calls es un array de { name, arguments (objeto) }
						messagePayload.tool_calls = msg.toolCalls.map(tc => ({
							name: tc.function.name,
							arguments: typeof tc.function.arguments === 'string'
								? JSON.parse(tc.function.arguments)
								: tc.function.arguments
						}));
					} else { // Formato para OpenAI y nuestro almacenamiento
						messagePayload.tool_calls = msg.toolCalls.map(tc => ({
							id: tc.id,
							type: tc.type,
							function: {
								name: tc.function.name,
								arguments: typeof tc.function.arguments === 'string'
									? JSON.parse(tc.function.arguments)
									: tc.function.arguments
							}
						}));
					}
				} else {
					try {
						const parsedContent = JSON.parse(msg.content);
						// If the parsed content is an object and has a 'message' field, use it.
						if (typeof parsedContent === 'object' && parsedContent !== null && parsedContent.parameters && parsedContent.parameters.message) {
							messagePayload.content = parsedContent.parameters.message;
						} else if (typeof parsedContent === 'object' && parsedContent !== null && parsedContent.name === 'human_agent' && parsedContent.parameters) {
							// If it's a human_agent response, provide a user-friendly message.
							messagePayload.content = 'El agente humano ha sido notificado y se pondrá en contacto contigo pronto.';
						} else if (typeof parsedContent === 'object' && parsedContent !== null && parsedContent.name && parsedContent.parameters) {
							// If it looks like another internal tool call response, don't display it as a message.
							messagePayload.content = ''; // Or a more appropriate generic message if needed
						} else if (typeof parsedContent === 'object' && parsedContent !== null) {
							// If it's a general JSON object, stringify it for display.
							messagePayload.content = JSON.stringify(parsedContent, null, 2);
						} else {
							messagePayload.content = String(msg.content);
						}
					} catch (e) {
						messagePayload.content = String(msg.content);
					}
				}
			}

			//? Si es un mensaje de toolResult
			if (role === 'tool') {
				// Asegurar que el content de toolResult es un string JSON válido, no doble stringificado.
				try {
					const parsedContent = JSON.parse(msg.content);
					messagePayload.content = JSON.stringify(parsedContent);
				} catch (e) {
					// Si ya es un string JSON válido, o no es un JSON, dejarlo como está.
					messagePayload.content = String(msg.content);
				}
			}

			providerHistory.push(messagePayload);
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
						switch (toolCall.function.name) {
							case 'search_menu_items':
								toolResultContent = await this.handleMenuSearch(
									requestingUser,
									typeof toolCall.function.arguments === 'string'
										? JSON.parse(toolCall.function.arguments)
										: toolCall.function.arguments
								);
								break;

							case 'escalate_to_human_agent':
								toolResultContent = await this.handleEscalationTool(
									requestingUser,
									conversationId,
									typeof toolCall.function.arguments === 'string'
										? JSON.parse(toolCall.function.arguments)
										: toolCall.function.arguments
								);
								break;

							default:
								toolResultContent = `Error: Función '${toolCall.function.name}' no implementada.`;
								isError = true;
						}
					} catch (toolError) {
						console.error(`Error ejecutando herramienta ${toolCall.function.name}:`, toolError);
						toolResultContent = `Error al procesar la herramienta ${toolCall.function.name}: ${toolError.message}`;
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
	/**
	 * Maneja la escalada a un agente humano cuando un usuario hace una solicitud explícita
	 * o el asistente de IA no puede resolver la consulta después de varios intentos.
	 */
	async handleEscalationTool(requestingUser, conversationId, args) {
		// Lógica para escalar a un agente humano
		console.log(`Escalando chat para usuario ${requestingUser._id}, conversación ${conversationId}, razón: ${args.reason}`);

		//? Notificar a los agentes que hay una escalación (utilizando messageService.escalateConversationToAgent)
		await this.messageService.escalateConversationToAgent(conversationId, requestingUser._id, args.reason, args.urgency, true, requestingUser);
		return `He escalado tu solicitud a un agente humano con urgencia ${args.urgency}. Un agente se pondrá en contacto contigo lo antes posible.`; // Contenido para el 'toolResult'
	}

	_getToolDefinitions(providerName) {
		const commonTools = [
			{
				type: "function",
				function: {
					name: "search_menu_items",
					description: "Busca ítems del menú por nombre, descripción o categoría. Úsalo cuando el usuario pregunte sobre platos, bebidas o cualquier otro ítem del menú.",
					parameters: {
						type: "object",
						properties: {
							query: {
								type: "string",
								description: "Término de búsqueda para encontrar ítems del menú. Puede ser el nombre, ingredientes o descripción.",
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
						},
						required: ["query"]
					}
				}
			},
			{
				type: "function",
				function: {
					name: "escalate_to_human_agent",
					description: "Escala la conversación actual a un agente humano cuando el usuario lo solicita explícitamente o cuando el asistente de IA no puede resolver la consulta después de varios intentos o si el tema es muy sensible o complejo.",
					parameters: {
						type: "object",
						properties: {
							reason: {
								type: "string",
								description: "Un resumen conciso de la consulta del usuario y por qué se necesita la escalada. Incluye cualquier contexto relevante de la conversación.",
							},
							urgency: {
								type: "string",
								enum: ["low", "medium", "high"],
								description: "La urgencia percibida de la solicitud del usuario.",
								default: "medium"
							}
						},
						required: ["reason"],
					},
				}
			}
		];
		if (providerName.toLowerCase() === 'openai') {
			return commonTools;
		} else if (providerName.toLowerCase() === 'ollama') {
			return commonTools;
		}
		return undefined;
	}
}

export default AIService;