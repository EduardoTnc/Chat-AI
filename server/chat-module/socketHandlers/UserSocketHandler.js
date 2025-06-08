// server/chat-module/socketHandlers/UserSocketHandler.js
import { ApiError } from '../../utils/errorHandler.js';
import mongoose from 'mongoose';

class UserSocketHandler {
    constructor(socket, io, messageService, connectedUsers) {
        this.socket = socket;
        this.io = io; // Instancia global de Socket.IO
        this.messageService = messageService;
        this.connectedUsers = connectedUsers;
        this.user = socket.user; // { _id, email, role, ... }
    }

    // MARK: - RegisterEvents
    /**
     * Registra los eventos de socket para el usuario.
     * Se encarga de:
     * - Enviar mensajes a otros usuarios.
     * - Marcar mensajes como leídos.
     * - Mostrar cuando el usuario está escribiendo a otro.
     * - Cargar conversaciones iniciales cuando el usuario se conecta.
     */
    registerUserEvents() {
        this.socket.on('sendMessageToUser', this._handleErrorWrapper(this.handleSendMessageToUser.bind(this)));
        this.socket.on('markMessageAsRead', this._handleErrorWrapper(this.handleMarkMessageAsRead.bind(this))); // Para marcar un mensaje específico
        this.socket.on('typing', this._handleErrorWrapper(this.handleTyping.bind(this)));
        this.socket.on('fetchInitialConversations', this._handleErrorWrapper(this.handleFetchInitialConversations.bind(this)));
    }

    // MARK: - ErrorWrapper
    /**
     * Wrapper para manejo de errores en handlers de socket.
     * Lanza el error a la conexión del socket y, si se proporciona,
     * ejecuta el callback con el error.
     * @param {function} handlerFn - Función que se va a ejecutar.
     * @returns {function} - Función que ejecuta el handler y maneja errores.
     */
    _handleErrorWrapper(handlerFn) {
        return async (payload, callback) => { // callback es opcional para acknowledgements
            try {
                await handlerFn(payload, callback);
            } catch (error) {
                console.error(`Error en handler de socket (Usuario: ${this.user._id}, Evento: ¿?), Payload:`, payload, "Error:", error);
                let errorMessage = 'Ocurrió un error en el servidor.';
                if (error instanceof ApiError) {
                    errorMessage = error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                this.socket.emit('socketError', { message: errorMessage, event: error.event || 'unknown' });
                if (typeof callback === 'function') {
                    callback({ error: errorMessage });
                }
            }
        };
    }


    // MARK: - SendMessageToUser
    /**
     * Maneja el envío de un mensaje de un usuario a otro usuario.
     * Lanza un error si falta alguno de los datos obligatorios (receiverId o content).
     * Notifica al emisor que el mensaje fue guardado y enviado.
     * Notifica al receptor (si está online) del mensaje nuevo.
     * @param {object} payload - Contiene los datos del mensaje: receiverId, content, tempId?, clientInfo?
     * @param {function} [ack] - Callback que se ejecutará con el resultado, si se proporciona
     * @throws {ApiError} Si falta alguno de los datos obligatorios (receiverId o content)
     * @throws {ApiError} Si ocurre un error al procesar la solicitud de mensaje
     */
    async handleSendMessageToUser(payload, ack) { // payload: { receiverId, content, tempId?, clientInfo? }
        const { tempId, conversationId, receiverId, content } = payload;
        if (!receiverId || !content) {
            throw new ApiError(400, 'ReceiverId y content son requeridos.');
        }

        const messageData = {
            conversationId: conversationId, // Puede ser null si es un chat nuevo
            senderId: this.user._id,
            receiverId: new mongoose.Types.ObjectId(receiverId),
            senderType: 'user',
            receiverType: 'user',
            content: content,
            type: 'userMessage',
        };

        //? 1. Crear el mensaje (con messageService.createMessage, que también crea la conversación si es necesario)
        const newMessage = await this.messageService.createMessage(messageData, this.user);

        //* 2. Confirmación al emisor
        this.socket.emit('messageSent', { message: newMessage, tempId });

        //* 3. Enviar mensaje al receptor si está online (a todas sus conexiones)
        const sentToReceiver = this.io.emitToUser(receiverId.toString(), 'newMessage', newMessage);
        console.log(`Mensaje enviado al usuario ${receiverId}:`, sentToReceiver);

        if (!sentToReceiver) {
            console.log(`Usuario ${receiverId} no conectado. Mensaje guardado. Considerar notificación push.`);
            // Aquí se podría marcar el mensaje para una futura notificación push
        }

        //* 4. Confirmación al receptor
        if (typeof ack === 'function') ack({ success: true, message: newMessage });
    }


    // MARK: - MarkMessageAsRead
    /**
     * Maneja el marcaje de un mensaje como leído por el usuario actual.
     * Lanza un error si falta alguno de los datos obligatorios (messageId o conversationId).
     * Notifica al emisor del mensaje original que fue leído (si está online).
     * Notifica al cliente que marcó el mensaje como leído.
     * @param {object} payload - Contiene los datos del mensaje: messageId, conversationId
     * @param {function} [ack] - Callback que se ejecutará con el resultado, si se proporciona
     * @throws {ApiError} Si falta alguno de los datos obligatorios (messageId o conversationId)
     * @throws {ApiError} Si ocurre un error al procesar la solicitud de marcaje de lectura
     */
    async handleMarkMessageAsRead(payload, ack) { // payload: { messageId, conversationId }

        //? 1. Validar datos
        const { messageId, conversationId } = payload;
        if (!messageId || !conversationId) {
            throw new ApiError(400, 'MessageId y conversationId son requeridos.');
        }

        //? 2. Marcar y obtener el mensaje como leído
        const updatedMessage = await this.messageService.markMessageAsRead(
            messageId,
            this.user._id,
            conversationId,
            this.user // Pasar requestingUser
        );
        const originalSenderId = updatedMessage.senderId._id.toString(); // Asumiendo que senderId está populado

        //* 3. Notificar al emisor del mensaje original que fue leído (si está online)
        if (originalSenderId !== this.user._id.toString()) {
            this.io.emitToUser(originalSenderId, 'messageRead', {
                messageId: updatedMessage._id,
                conversationId: updatedMessage.conversationId,
                readerId: this.user._id
            });
        }

        //* 4. Confirmación al que marcó
        if (typeof ack === 'function') ack({ success: true, updatedMessage });
        this.socket.emit('messageReadAck', { messageId: updatedMessage._id, conversationId }); // Para el cliente que marcó
    }

    // MARK: - Typing
    /**
     * Maneja el evento de escritura de un usuario a otro.
     * Si el payload es inválido, no lanza error, solo no hace nada.
     * @param {object} payload - Contiene los datos del evento: receiverId, conversationId, isTyping
     */
    handleTyping(payload) { // payload: { receiverId, conversationId, isTyping: boolean }
        //? 1. Validar datos
        const { receiverId, conversationId, isTyping } = payload;
        if (!receiverId || typeof isTyping === 'undefined') {
            // No lanzar error, solo no hacer nada o loguear silenciosamente
            console.warn("Payload inválido para evento 'typing'", payload);
            return;
        }

        //* 2. Emitir el evento de escritura al receptor
        this.io.emitToUser(receiverId.toString(), 'userTyping', {
            senderId: this.user._id,
            conversationId,
            isTyping
        });
    }

    // MARK: - FetchInitialConversations
    /**
     * Obtiene las conversaciones iniciales para el usuario actual.
     * 
     * @param {object} payload - Contiene datos de paginación: limit, page.
     * @param {function} [ack] - Callback opcional para confirmar el resultado.
     * 
     * Emite las conversaciones iniciales al socket o llama a la función ack con los datos.
     */
    async handleFetchInitialConversations(payload, ack) { // payload: { limit, page }
        //? 1. Validar datos
        const { limit = 15, page = 1 } = payload || {};

        //? 2. Obtener las conversaciones
        const result = await this.messageService.getConversationsForUser(this.user._id, { limit, page });

        //* 3. Confirmación al usuario
        if (typeof ack === 'function') {
            ack({ success: true, data: result });
        } else {
            this.socket.emit('initialConversations', { data: result });
        }
    }
}

export default UserSocketHandler;