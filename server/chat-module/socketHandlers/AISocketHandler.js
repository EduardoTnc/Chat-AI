// server/chat-module/socketHandlers/AISocketHandler.js
import { ApiError } from '../../utils/errorHandler.js';
import { AGENT_ROOM } from './index.js'; // Para notificar escalaciones

class AISocketHandler {
    constructor(socket, io, messageService, aiService, connectedUsers) {
        this.socket = socket;
        this.io = io;
        this.messageService = messageService;
        this.aiService = aiService;
        this.connectedUsers = connectedUsers;
        this.user = socket.user;
    }

    registerAIEvents() {
        this.socket.on('sendMessageToIA', this._handleErrorWrapper(this.handleSendMessageToIA.bind(this)));
        this.socket.on('fetchAIModels', this._handleErrorWrapper(this.handleFetchAIModels.bind(this)));
    }

    // MARK: - ErrorWrapper
    _handleErrorWrapper(handlerFn) {
        // ... (mismo wrapper que en UserSocketHandler) ...
        return async (payload, callback) => {
            try {
                await handlerFn(payload, callback);
            } catch (error) {
                const eventName = handlerFn.name; // Aproximación del nombre del evento
                console.error(`Error en AISocketHandler (Usuario: ${this.user._id}, Evento: ${eventName}), Payload:`, payload, "Error:", error);
                let errorMessage = 'Ocurrió un error en el servidor al procesar su solicitud de IA.';
                if (error instanceof ApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                this.socket.emit('socketError', { message: errorMessage, event: eventName });
                if (typeof callback === 'function') {
                    callback({ error: errorMessage });
                }
            }
        };
    }

    // MARK: - FetchAIModels
    async handleFetchAIModels(payload, ack) {
        const models = await this.aiService.fetchAvailableModels(this.user._id, this.user.role);
        if (typeof ack === 'function') {
            ack({ success: true, data: models });
        } else {
            this.socket.emit('availableAIModels', { data: models });
        }
    }

    // MARK: - SendMessageToIA
    /**
     * Maneja el envío de un mensaje de un usuario a la IA.
     * 
     * @param {object} payload - Contiene los datos del mensaje: modelId, content, conversationId?, clientInfo?, tempId?
     * @param {function} [ack] - Callback que se ejecutará con el resultado, si se proporciona
     * 
     * @throws {ApiError} Si falta alguno de los datos obligatorios (modelId o content)
     * @throws {ApiError} Si ocurre un error al procesar la solicitud de la IA
     */
    async handleSendMessageToIA(payload, ack) { // payload: { modelId, content, conversationId?, clientInfo?, tempId? }
        const { modelId: clientModelId, content: userMessageContent, conversationId: existingConvId, clientInfo, tempId } = payload;

        if (!clientModelId || !userMessageContent) {
            throw new ApiError(400, "modelId y content son requeridos para chatear con la IA.");
        }

        //? 1. Guardar el mensaje del usuario
        let conversationId = existingConvId;
        //? Si no hay conversación existente, MessageService.createMessage la creará
        const userQueryData = {
            senderId: this.user._id,
            senderType: 'user',
            content: userMessageContent,
            type: 'userQuery',
            modelId: clientModelId,
            conversationId, // Puede ser null si es nueva
            clientInfo
        };
        const savedUserQuery = await this.messageService.createMessage(userQueryData, this.user);
        conversationId = savedUserQuery.conversationId; // Asegurar que tenemos el ID de la conversación

        //* Notificar al cliente que su mensaje fue recibido y guardado
        this.socket.emit('userMessageToIASent', { message: savedUserQuery, tempId });

        //? 2. Generar respuesta de la IA (esto puede involucrar múltiples pasos si hay tool_calls)
        try {
            const { finalMessage, originalToolCallingMessage } = await this.aiService.generateResponse(
                this.user, // Pasamos el objeto User completo
                clientModelId,
                userMessageContent,
                conversationId
            );

            //* 3. Enviar el mensaje final de la IA al cliente
            this.socket.emit('newMessageFromIA', { message: finalMessage, conversationId });

            //? Si hubo una escalación (detectada por handleEscalationTool dentro de AIService),
            //? MessageService.escalateConversationToAgent ya actualizó la conversación.
            //? Ahora notificamos a los agentes.
            if (originalToolCallingMessage && originalToolCallingMessage.toolCalls?.some(tc => tc.function.name === 'escalate_to_human_agent')) {
                const conversation = await this.messageService.getConversationById(conversationId, this.user._id, this.user.role); // Recargar con datos de escalación
                this.io.to(AGENT_ROOM).emit('newEscalatedChat', {
                    conversationId,
                    userId: this.user._id,
                    userName: this.user.name,
                    reason: conversation.metadata?.escalationDetails?.reason || "No especificada",
                    urgency: conversation.metadata?.escalationDetails?.urgency || "medium",
                    timestamp: conversation.metadata?.escalationDetails?.escalationTimestamp
                });
                //* Notificar al cliente que se está escalando
                this.socket.emit('escalationInProgress', { conversationId, message: "Estamos conectándote con un agente..." });
            }

            //? 5. Responder al callback
            if (typeof ack === 'function') ack({ success: true, finalMessage });

        } catch (iaError) {
            console.error("Error en generateResponse de AIService:", iaError);
            //! Guardar un mensaje de error de la IA si es apropiado
            const errorMessageData = {
                conversationId,
                senderType: 'IA',
                content: `Lo siento, no pude procesar tu solicitud en este momento. Por favor, intenta de nuevo más tarde.`,
                type: 'IAResponse',
                modelId: clientModelId,
                isError: true,
            };
            const savedErrorMessage = await this.messageService.createMessage(errorMessageData, { _id: null, role: 'system' });
            //* Notificar al cliente que hubo un error
            this.socket.emit('newMessageFromIA', { message: errorMessageData, conversationId, isError: true });
            throw iaError; //! Para que el wrapper lo capture y envíe socketError
        }
    }
}

export default AISocketHandler;