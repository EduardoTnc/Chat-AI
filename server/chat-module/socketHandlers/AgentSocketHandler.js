// server/chat-module/socketHandlers/AgentSocketHandler.js
import mongoose from 'mongoose';
import { ApiError } from '../../utils/errorHandler.js';
import User from '../../models/User.js';
import Conversation from '../../models/Conversation.js';

class AgentSocketHandler {

    // MARK: - Constructor
    /**
     * Initializes a new instance of the AgentSocketHandler class.
     * 
     * @param {SocketIO.Socket} socket - The socket instance for the current connection.
     * @param {SocketIOServer} io - The global Socket.IO server instance.
     * @param {MessageService} messageService - Service for handling message-related operations.
     * @param {Map<string, Set<string>>} connectedUsers - A map of connected user IDs to their socket IDs.
     * @param {string} agentRoom - The room for agents to join for notifications.
     * @param {string} adminRoom - The room for admins to join for notifications.
     */
    constructor(socket, io, messageService, connectedUsers, agentRoom, adminRoom) {
        this.socket = socket;
        this.io = io;
        this.messageService = messageService;
        this.connectedUsers = connectedUsers;
        this.agentRoom = agentRoom; // AGENT_ROOM
        this.adminRoom = adminRoom; // ADMIN_ROOM
        this.user = socket.user; // El agente/admin conectado
    }



    // MARK: - Eventos
    /**
     * Registra los eventos específicos para agentes en el socket.
     * 
     * @note Solo se llama si el usuario conectado es un agente o admin.
     * @todo Agregar eventos para obtener chats asignados, chats pendientes de agente, etc.
     */
    registerAgentEvents() {
        if (this.user.role !== 'agent' && this.user.role !== 'admin') return; // Solo para agentes/admins

        // Eventos que un agente/admin puede emitir
        this.socket.on('agentSendMessageToUser', this._handleErrorWrapper(this.handleAgentSendMessageToUser.bind(this)));
        this.socket.on('agentPickChat', this._handleErrorWrapper(this.handleAgentPickChat.bind(this))); // Agente toma un chat de 'pending_agent'
        this.socket.on('agentUpdateConversationMetadata', this._handleErrorWrapper(this.handleAgentUpdateConversationMetadata.bind(this)));
        this.socket.on('agentAddNote', this._handleErrorWrapper(this.handleAgentAddNote.bind(this)));
        this.socket.on('agentPinConversation', this._handleErrorWrapper(this.handleAgentPinConversation.bind(this)));
        this.socket.on('agentUnpinConversation', this._handleErrorWrapper(this.handleAgentUnpinConversation.bind(this)));
        this.socket.on('agentCloseConversation', this._handleErrorWrapper(this.handleAgentCloseConversation.bind(this)));

        // Eventos que un agente/admin puede escuchar (además de los globales como 'newMessage')
        // this.socket.on('fetchMyAssignedChats', this._handleErrorWrapper(this.handleFetchMyAssignedChats.bind(this)));
        // this.socket.on('fetchPendingAgentChats', this._handleErrorWrapper(this.handleFetchPendingAgentChats.bind(this)));

    }



    // MARK: - ErrorWrapper
    /**
     * Wrapper para manejo de errores en handlers de socket del agente.
     * Lanza el error a la conexión del socket y, si se proporciona,
     * ejecuta el callback con el error.
     * 
     * @param {function} handlerFn - Función que se va a ejecutar.
     * @returns {function} - Función que ejecuta el handler y maneja errores.
     */
    _handleErrorWrapper(handlerFn) {
        // ... (mismo wrapper que en UserSocketHandler) ...
        return async (payload, callback) => {
            try {
                await handlerFn(payload, callback);
            } catch (error) {
                const eventName = handlerFn.name;
                console.error(`Error en AgentSocketHandler (Usuario: ${this.user._id}, Evento: ${eventName}), Payload:`, payload, "Error:", error);
                let errorMessage = 'Ocurrió un error en el servidor al procesar la acción del agente.';
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




    // MARK: - AgentSendMessageToUser
    /**
     * Maneja el envío de un mensaje de un agente a un usuario en una conversación.
     * 
     * @param {object} payload - Contiene los datos del mensaje: conversationId, recipientUserId, content, tempId?
     * @param {function} [ack] - Callback que se ejecutará con el resultado, si se proporciona
     * 
     * @throws {ApiError} Si falta alguno de los datos obligatorios (conversationId, recipientUserId, content)
     * @throws {ApiError} Si la conversación está cerrada o el agente no está asignado a ella
     */
    async handleAgentSendMessageToUser(payload, ack) { // payload: { conversationId, recipientUserId, content, tempId? }

        const { conversationId, recipientUserId, content, tempId } = payload;

        //! Validar que los datos obligatorios estén presentes
        if (!conversationId || !recipientUserId || !content) {
            throw new ApiError(400, "conversationId, recipientUserId y content son requeridos.");
        }

        //! Validar que el agente puede enviar a esta conversación (está asignado y la conversación no está cerrada)
        const conversation = await this.messageService.getConversationById(conversationId, this.user._id, this.user.role);
        if (conversation.status === 'closed_by_agent' || conversation.status === 'closed_by_user') {
            throw new ApiError(400, "No se puede enviar mensajes a una conversación cerrada.");
        }
        if (this.user.role === 'agent' && conversation.agentId?.toString() !== this.user._id.toString()) {
            // Un agente solo puede enviar mensajes si está asignado a esa conversación.
            // Un admin podría enviar a cualquier conversación activa.
            throw new ApiError(403, "No estás asignado a esta conversación.");
        }

        //? 1. Crear y guardar el mensaje
        const messageData = {
            conversationId,
            senderId: this.user._id,
            senderType: 'agent', // o 'admin' si el rol es admin
            receiverId: new mongoose.Types.ObjectId(recipientUserId),
            receiverType: 'user',
            content,
            type: 'agentMessage',
        };
        const newMessage = await this.messageService.createMessage(messageData, this.user);

        //* 2. Confirmación al agente
        this.socket.emit('agentMessageSent', { message: newMessage, tempId, conversationId });

        //* 3. Enviar mensaje al usuario cliente si está online
        const sentToUser = this.io.emitToUser(recipientUserId.toString(), 'newMessage', { message: newMessage });
        if (!sentToUser) console.log(`Mensaje de agente a ${recipientUserId} guardado, usuario no conectado.`);

        //* 4. Notificar a otros agentes/admins en la conversación (si es un panel compartido)
        //* O si la conversación está abierta en varios paneles de admin/agente
        conversation.participants.forEach(participant => {
            if (participant._id.toString() !== this.user._id.toString() && (participant.role === 'agent' || participant.role === 'admin')) {
                this.io.emitToUser(participant._id.toString(), 'newMessageInSharedConversation', { message: newMessage, conversationId });
            }
        });


        if (typeof ack === 'function') ack({ success: true, message: newMessage });
    }



    // MARK: - AgentPickChat
    /**
     * Maneja la acción cuando un agente selecciona un chat para atender.
     * 
     * @param {object} payload - Contiene el conversationId del chat a seleccionar.
     * @param {function} [ack] - Función de callback opcional para confirmar el resultado de la operación.
     * 
     * @throws {ApiError} Si no se proporciona el conversationId en el payload.
     * 
     * Notifica al cliente que un agente se ha unido al chat e informa a otros agentes/administradores
     * en las salas respectivas que el chat ha sido asignado.
     */
    async handleAgentPickChat(payload, ack) { // payload: { conversationId }

        const { conversationId } = payload;

        //! Validar que el conversationId esté presente
        if (!conversationId) throw new ApiError(400, "conversationId es requerido.");

        //? 1. Asignar el agente a la conversación
        const agentIdToAssign = this.user._id; // El agente que toma el chat

        const updatedConversation = await this.messageService.assignAgentToConversation(
            conversationId,
            agentIdToAssign,
            this.user // El agente/admin que realiza la acción
        );

        //* 2. Notificar al cliente que un agente ha tomado el chat (agentJoinedChat)
        const clientParticipant = updatedConversation.participants.find(p => p.role === 'user');
        if (clientParticipant) {
            this.io.emitToUser(clientParticipant._id.toString(), 'agentJoinedChat', {
                conversationId,
                agent: { id: this.user._id, name: this.user.name, role: this.user.role },
                message: `El agente ${this.user.name} se ha unido al chat.`
            });
        }

        //* 3. Notificar a otros agentes/admins que el chat ha sido tomado
        //* Emitir a AGENT_ROOM y ADMIN_ROOM, excluyendo el socket actual
        this.socket.to(this.agentRoom).to(this.adminRoom).emit('chatAssigned', {
            conversationId,
            agentId: agentIdToAssign,
            agentName: this.user.name
        });

        //* 4. Confirmación al agente que lo tomó
        if (typeof ack === 'function') ack({ success: true, conversation: updatedConversation });
        this.socket.emit('chatSuccessfullyPicked', { conversation: updatedConversation }); // Al agente que lo tomó
    }




    // MARK: - AgentUpdateConversationMetadata
    /**
     * Actualiza la metadata de una conversación (título, prioridad o tags) y notifica a otros agentes/admins.
     * @param {Object} payload - Contiene los datos a actualizar: { conversationId, updates: { title?, priority?, tags? } }
     * @param {function} [ack] - Callback que se ejecutará con el resultado, si se proporciona
     * @throws {ApiError} Si ocurre un error al actualizar la metadata de la conversación
     */
    async handleAgentUpdateConversationMetadata(payload, ack) { // payload: { conversationId, updates: { title?, priority?, tags? }}
        const { conversationId, updates } = payload;
        const updatedConversation = await this.messageService.updateConversationMetadata(conversationId, this.user, updates);
        //* Notificar a otros agentes/admins
        this.io.to(this.agentRoom).to(this.adminRoom).emit('conversationMetadataUpdated', { conversationId, updates: updatedConversation.metadata });
        if (typeof ack === 'function') ack({ success: true, data: updatedConversation });
    }




    // MARK: - AgentAddNote
    /**
     * Agrega una nota a una conversación y notifica a otros agentes/admins.
     * @param {Object} payload - Contiene los datos de la nota: { conversationId, note }
     * @param {function} [ack] - Callback que se ejecutará con el resultado, si se proporciona
     * @throws {ApiError} Si ocurre un error al agregar la nota a la conversación
     */
    async handleAgentAddNote(payload, ack) { // payload: { conversationId, note }
        const { conversationId, note } = payload;
        const updatedConversation = await this.messageService.addNoteToConversation(conversationId, this.user, note);
        //* Notificar a otros agentes/admins (quizás solo si la nota es visible para ellos)
        this.io.to(this.agentRoom).to(this.adminRoom).emit('conversationNoteAdded', { conversationId, note: updatedConversation.metadata.notes.slice(-1)[0] });
        if (typeof ack === 'function') ack({ success: true, data: updatedConversation });
    }



    // MARK: - AgentPinConversation
    /**
     * Maneja la acción cuando un agente fija una conversación.
     * 
     * @param {Object} payload - Contiene el conversationId de la conversación a fijar.
     * @param {function} [ack] - Función de callback opcional para confirmar el resultado de la operación.
     * 
     * Notifica a todos los agentes y administradores que la conversación ha sido fijada
     * y ejecuta el callback con los datos actualizados de la conversación si se proporciona.
     */
    async handleAgentPinConversation(payload, ack) { // payload: { conversationId }
        const { conversationId } = payload;
        const updatedConversation = await this.messageService.pinConversation(conversationId, this.user);
        //* Notificar a otros agentes/admins
        this.io.to(this.agentRoom).to(this.adminRoom).emit('conversationPinned', { conversationId, pinnedBy: this.user._id });
        if (typeof ack === 'function') ack({ success: true, data: updatedConversation });
    }



    // MARK: - AgentUnpinConversation
    /**
     * Maneja la acción cuando un agente quita la fijación de una conversación.
     * 
     * @param {Object} payload - Contiene el conversationId de la conversación a quitar la fijación.
     * @param {function} [ack] - Función de callback opcional para confirmar el resultado de la operación.
     * 
     * Notifica a todos los agentes y administradores que la conversación ha sido desfijada
     * y ejecuta el callback con los datos actualizados de la conversación si se proporciona.
     */
    async handleAgentUnpinConversation(payload, ack) { // payload: { conversationId }
        const { conversationId } = payload;
        const updatedConversation = await this.messageService.unpinConversation(conversationId, this.user);
        //* Notificar a otros agentes/admins
        this.io.to(this.agentRoom).to(this.adminRoom).emit('conversationUnpinned', { conversationId, unpinnedBy: this.user._id });
        if (typeof ack === 'function') ack({ success: true, data: updatedConversation });
    }

    // MARK: - AgentCloseConversation
    /**
     * Cierra una conversación desde la interfaz de agente.
     * @param {Object} payload - Contiene los datos de la conversación a cerrar: { conversationId, closingNotes? }
     * @param {function} [ack] - Callback que se ejecutará con el resultado, si se proporciona
     * 
     * Notifica al cliente que la conversación ha sido cerrada y a otros agentes/admins que la conversación ha cambiado de estado.
     * Ejecuta el callback con la conversación actualizada si se proporciona.
     * 
     * @throws {ApiError} Si ocurre un error al cerrar la conversación.
     */
    async handleAgentCloseConversation(payload, ack) { // payload: { conversationId, closingNotes? }
        const { conversationId, closingNotes } = payload;
        if (!conversationId) throw new ApiError(400, "conversationId es requerido.");

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new ApiError(404, "Conversación no encontrada.");

        //! Verificar permisos (agente asignado o admin) y que la conversación no esté cerrada
        if (this.user.role === 'agent' && conversation.agentId?.toString() !== this.user._id.toString()) {
            throw new ApiError(403, "No eres el agente asignado para cerrar esta conversación.");
        }
        if (conversation.status.startsWith('closed_')) {
            throw new ApiError(400, "La conversación ya está cerrada.");
        }

        //? 1. Cambiar el estado de la conversación
        conversation.status = 'closed_by_agent';
        conversation.updatedAt = Date.now();
        if (closingNotes) {
            //? 2. Agregar la nota de cierre
            conversation.metadata = conversation.metadata || {};
            conversation.metadata.notes = conversation.metadata.notes || [];
            conversation.metadata.notes.push({ userId: this.user._id, note: `Cierre: ${closingNotes}`, createdAt: new Date() });
        }
        await conversation.save();

        //? 3. Crear mensaje de sistema
        await this.messageService.createMessage({
            conversationId,
            senderType: 'systemNotification',
            content: `Conversación cerrada por el agente ${this.user.name}.`,
            type: 'systemNotification',
        }, { _id: null, role: 'system' });


        //* 4. Notificar al cliente
        const clientParticipant = conversation.participants.find(p => User.findById(p).then(u => u.role === 'user')); // Asumiendo que solo hay un 'user'
        if (clientParticipant) {
            this.io.emitToUser(clientParticipant.toString(), 'conversationClosed', { conversationId, closedBy: 'agent' });
        }

        //* 5. Notificar a otros agentes/admins
        this.io.to(this.agentRoom).to(this.adminRoom).emit('conversationStatusChanged', { conversationId, status: 'closed_by_agent' });

        //* 6. Confirmación al agente
        if (typeof ack === 'function') ack({ success: true, conversation: conversation.toObject() });
    }

}

export default AgentSocketHandler;