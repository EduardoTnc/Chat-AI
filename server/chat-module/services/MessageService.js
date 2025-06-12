import mongoose from 'mongoose';
import Message from '../../models/Message.js';
import Conversation from '../../models/Conversation.js';
import User from '../../models/User.js';
import { ApiError } from '../../utils/errorHandler.js';

class MessageService {

    // MARK: - _validateConversationAccess (MÉTODO INTERNO LIGERO)
    /**
     * Verifica si el usuario tiene permiso para acceder a una conversación.
     * Lanza ApiError 404 si la conversación no existe.
     * Lanza ApiError 400 si la conversación está cerrada y checkStatusNotClosed es true.
     * Lanza ApiError 403 si el usuario no tiene permiso para acceder a la conversación.
     * Los administradores tienen acceso a todas las conversaciones.
     * @param {string} conversationId - ID de la conversación
     * @param {string} userId - ID del usuario
     * @param {string} userRole - Rol del usuario (user, agent, admin)
     * @param {boolean} [checkStatusNotClosed=false] - Si true, verifica que la conversación no esté cerrada
     * @returns {Promise<Object>} - La conversación (ligera) si se necesita info de ella
     * @throws {ApiError} Si la conversación no se encuentra o el acceso es denegado.
     */
    async _validateConversationAccess(conversationId, userId, userRole, checkStatusNotClosed = false) {
        const conversation = await Conversation.findById(conversationId)
            .select('participants type agentId status') // Solo los campos necesarios para permisos
            .lean();

        if (!conversation) {
            throw new ApiError(404, 'Conversación no encontrada.');
        }

        if (checkStatusNotClosed && (conversation.status === 'closed_by_agent' || conversation.status === 'closed_by_user')) {
            throw new ApiError(400, "La operación no se puede realizar en una conversación cerrada.");
        }

        if (userRole === 'user' && !conversation.participants.some(p => p.equals(userId))) {
            throw new ApiError(403, 'No tienes permiso para acceder a esta conversación.');
        }

        if (userRole === 'agent') {
            const isParticipant = conversation.participants.some(p => p.equals(userId));
            const isAssignedAgent = conversation.agentId && conversation.agentId.equals(userId);
            const isPendingForAnyAgent = conversation.status === 'pending_agent';

            if (!isParticipant && !isAssignedAgent && !isPendingForAnyAgent) {
                if (conversation.type === 'user-to-user') {
                    throw new ApiError(403, 'Agente no autorizado para esta conversación user-to-user.');
                }
                if (conversation.type === 'user-to-ia' && conversation.status !== 'pending_agent') {
                    throw new ApiError(403, 'Agente no autorizado para esta conversación user-to-ia no escalada.');
                }
            }
        }
        // Admins tienen acceso
        return conversation; // Devolver la conversación (ligera) si se necesita info de ella
    }


    // MARK: - getConversationById
    /**
     * Obtiene una conversación por su ID.
     * Verifica que el usuario que realiza la petición tenga acceso a la conversación.
     * Si la conversación no existe o el usuario no tiene acceso, lanza ApiError 404 o 403.
     * 
     * @param {string} conversationId - ID de la conversación a obtener
     * @param {string} userId - ID del usuario que realiza la petición
     * @param {string} userRole - Rol del usuario que realiza la petición
     * @returns {Promise<Object>} - La conversación (como objeto plano)
     * @throws {ApiError} - Si la conversación no existe o el usuario no tiene acceso
     */
    async getConversationById(conversationId, userId, userRole) {
        //! Verificar si el usuario puede acceder a esta conversación 
        await this._validateConversationAccess(conversationId, userId, userRole);

        //? 1. Cargar con todos los populates
        const fullConversation = await Conversation.findById(conversationId)
            .populate({ path: 'participants', select: 'name email role' })
            .populate({ path: 'agentId', select: 'name email role' })
            .populate({
                path: 'lastMessage',
                populate: { path: 'senderId', select: 'name email role' }
            })
            .populate({ path: 'metadata.pinnedBy.userId', select: 'name email role' })
            .populate({ path: 'metadata.notes.userId', select: 'name email role' })
            .lean();

        //? 2. Validar que la conversación exista
        if (!fullConversation) { // Doble check, aunque _validate debería haberlo atrapado
            throw new ApiError(404, 'Conversación no encontrada (inconsistencia).');
        }

        //? 3. Devolver la conversación
        return fullConversation;
    }


    // MARK: - getMessagesByConversationId
    /**
     * Obtiene los mensajes de una conversación ordenados por timestamp descendente.
     * El usuario que realiza la petición debe tener acceso a la conversación.
     * @param {string} conversationId - ID de la conversación.
     * @param {{ _id: string, role: string }} requestingUser - Información del usuario que realiza la petición.
     * @param {Object} [options] - Opciones para la consulta.
     * @param {number} [options.limit=20] - Límite de mensajes a obtener.
     * @param {number} [options.beforeTimestamp=null] - Timestamp antes del cual obtener los mensajes.
     * @returns {Promise<Message[]>} - Arreglo de mensajes.
     */
    async getMessagesByConversationId(conversationId, requestingUser, options = {}) {
        const { limit = 20, beforeTimestamp = null } = options;
        //! Verificar si el usuario puede acceder a esta conversación 
        await this._validateConversationAccess(conversationId, requestingUser._id, requestingUser.role);

        const query = { conversationId };
        if (beforeTimestamp) {
            query.timestamp = { $lt: new Date(beforeTimestamp) };
        }
        //? 2. Obtener y devolver los mensajes
        return Message.find(query)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate('senderId', 'name email role')
            .lean();
    }



    // MARK: - getConversationsForUser
    async getConversationsForUser(userId, { limit = 15, page = 1 }) {
        const skip = (page - 1) * limit;
        const conversations = await Conversation.find({ participants: userId })
            .populate({
                path: 'lastMessage',
                populate: { path: 'senderId', select: 'name email role' }
            })
            .populate('participants', 'name email role')
            .populate({ path: 'agentId', select: 'name email role' })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Conversation.countDocuments({ participants: userId });

        return { conversations, total, currentPage: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) };
    }



    // MARK: - getAllConversationsForAdmin
    /**
     * Obtiene todas las conversaciones en el sistema. Solo los administradores pueden usar esta función.
     * 
     * @param {Object} [query] - Opciones de consulta (opcional)
     * @param {number} [query.limit=15] - Número de elementos por página
     * @param {number} [query.page=1] - Número de página a obtener
     * @param {string} [query.type] - Tipo de conversación (user-to-agent, user-to-ia, user-to-user)
     * @param {string} [query.status] - Estado de la conversación (pending, in_progress, solved, closed)
     * @param {string} [query.participantId] - ID de un participante en la conversación
     * @param {string} [query.agentId] - ID del agente asignado a la conversación
     * @param {string} [query.sortBy=updatedAt] - Campo por el que ordenar las conversaciones (updatedAt, createdAt, lastMessage.timestamp)
     * @param {string} [query.sortOrder=desc] - Orden de la lista (asc o desc)
     * @param {string} [query.searchQuery] - Cadena de búsqueda en el título, email o nombre de los participantes
     * @param {Object} requestingUser - Usuario que hace la solicitud (debe tener rol de 'admin')
     * @returns {Promise<Object>} - Resultado de la consulta con las siguientes propiedades:
     *  - conversations: lista de conversaciones
     *  - total: cantidad total de conversaciones
     *  - currentPage: número de página actual
     *  - limit: número de elementos por página
     *  - totalPages: número total de páginas
     * @throws {ApiError} - Si el usuario no tiene permiso para ver todas las conversaciones
     */
    async getAllConversationsForAdmin({ limit = 15, page = 1, type, status, participantId, agentId, sortBy = 'updatedAt', sortOrder = 'desc', searchQuery = '' }, requestingUser) {
        if (requestingUser.role !== 'admin') { // Solo admin usa esta función de "ver todo"
            throw new ApiError(403, "No autorizado para esta acción.");
        }
        //? 1. Lógica de query y populación
        const skip = (page - 1) * limit;
        const query = {};
        if (type) query.type = type;
        if (status) query.status = status;
        if (participantId) query.participants = new mongoose.Types.ObjectId(participantId);
        if (agentId) query.agentId = new mongoose.Types.ObjectId(agentId);

        if (searchQuery) {
            const usersMatchingSearch = await User.find({
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } }
                ]
            }).select('_id').lean();
            const userIdsMatchingSearch = usersMatchingSearch.map(u => u._id);

            const orConditions = [
                { 'metadata.title': { $regex: searchQuery, $options: 'i' } },
            ];
            if (userIdsMatchingSearch.length > 0) {
                orConditions.push({ participants: { $in: userIdsMatchingSearch } });
            }
            if (mongoose.Types.ObjectId.isValid(searchQuery)) {
                orConditions.push({ _id: new mongoose.Types.ObjectId(searchQuery) });
            }
            if (orConditions.length > 0) {
                query.$or = orConditions;
            }
        }

        const sortParams = {};
        sortParams[sortBy] = sortOrder === 'asc' ? 1 : -1;
        if (sortBy !== 'updatedAt') sortParams.updatedAt = -1;

        const conversations = await Conversation.find(query)
            .populate({
                path: 'lastMessage',
                populate: { path: 'senderId', select: 'name email role' }
            })
            .populate('participants', 'name email role')
            .populate({ path: 'agentId', select: 'name email role' })
            .populate({ path: 'metadata.pinnedBy.userId', select: 'name email role' })
            .populate({ path: 'metadata.notes.userId', select: 'name email role' })
            .sort(sortParams)
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Conversation.countDocuments(query);
        //? 2. Devolver la lista de conversaciones
        return { conversations, total, currentPage: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) };
    }



    // MARK: - createMessage
    /**
     * Crea un mensaje en una conversación. Si la conversación no existe, la crea.
     * El mensaje se guarda y se devuelve el objeto Message completo.
     * @param {Object} messageData - Información del mensaje a crear con los siguientes campos:
     *  - conversationId (opcional): ID de la conversación existente en la que se va a crear el mensaje.
     *  - senderId: ID del usuario o agente que envía el mensaje.
     *  - senderType: Tipo de emisor ('user', 'agent', 'IA', 'tool', 'systemNotification').
     *  - receiverId (opcional): ID del usuario receptor para conversaciones user-to-user.
     *  - receiverType (opcional): Tipo de receptor ('user', 'agent').
     *  - content: Contenido del mensaje.
     *  - type: Tipo de mensaje ('userMessage', 'IAResponse', 'toolResult', 'agentMessage', 'IAEscalationSignal', 'systemNotification').
     *  - modelId (opcional): ID del modelo de IA para conversaciones user-to-ia.
     *  - usage (opcional): Información de uso del modelo de IA.
     *  - toolCallId (opcional): ID de la llamada al tool.
     *  - toolCalls (opcional): Información adicional sobre la llamada al tool.
     *  - isError (opcional): Indica si el mensaje es un error.
     *  - clientInfo (opcional): Información contextual del cliente si es relevante (ej. desde qué página inició el chat).
     * @param {Object} requestingUser - Información del usuario que realiza la petición.
     * @returns {Promise<Object>} - Objeto Message completo creado.
     */
    async createMessage(messageData, requestingUser) {
        //! Verificación de permiso principal
        if (messageData.senderType === 'user' && !messageData.senderId.equals(requestingUser._id)) {
            throw new ApiError(403, 'No puedes enviar mensajes como otro usuario.');
        }
        if (messageData.senderType === 'agent' && !['agent', 'admin'].includes(requestingUser.role)) {
            throw new ApiError(403, 'Solo los agentes o administradores pueden enviar mensajes como agentes.');
        }

        let conversation; // Este será el objeto Mongoose completo para modificar y guardar
        let isNewConversation = false;

        //? 1. Si existe la conversación, buscarla
        if (messageData.conversationId) {
            //! Validar acceso y si la conversación está cerrada ANTES de cargarla completa
            await this._validateConversationAccess(messageData.conversationId, requestingUser._id, requestingUser.role, true);

            conversation = await Conversation.findById(messageData.conversationId); // No lean, necesitamos el objeto Mongoose para .save()
            if (!conversation) throw new ApiError(404, "Conversación referenciada no encontrada (inconsistencia después de validación).");

        } else {
            //? 2. Si no existe la conversación, crearla
            isNewConversation = true;
            const clientInfoMetadata = messageData.clientInfo; // Asume que messageData puede traer clientInfo

            if (messageData.type === 'userMessage' && messageData.receiverId) {

                //? lógica de creación user-to-user si se tiene receiverId
                const participants = [
                    new mongoose.Types.ObjectId(messageData.senderId),
                    new mongoose.Types.ObjectId(messageData.receiverId)
                ].sort();

                conversation = await Conversation.findOneAndUpdate(
                    { type: 'user-to-user', participants: { $all: participants, $size: 2 } },
                    { $setOnInsert: { participants, type: 'user-to-user', metadata: { clientInfo: clientInfoMetadata } } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

            } else if (['userQuery'].includes(messageData.type) && messageData.modelId) {

                //? lógica de creación user-to-ia si se tiene modelId
                conversation = await Conversation.findOneAndUpdate(
                    { type: 'user-to-ia', 'participants.0': messageData.senderId, modelId: messageData.modelId },
                    { $setOnInsert: { participants: [messageData.senderId], type: 'user-to-ia', modelId: messageData.modelId, metadata: { clientInfo: clientInfoMetadata } } },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );

            } else if (!['IAResponse', 'toolResult', 'agentMessage', 'IAEscalationSignal', 'systemNotification'].includes(messageData.type)) {
                throw new ApiError(400, 'Tipo de mensaje inválido para creación de nueva conversación.');
            }

            //! Verificar si se creó o se encontró la conversación
            if (!conversation) throw new ApiError(500, 'No se pudo crear o encontrar la conversación.');

        }

        //? 3. Crear y guardar el mensaje
        const newMessage = new Message({
            conversationId: conversation._id, // Usar el _id de la conversación obtenida/creada
            senderId: messageData.senderId, // Puede ser null para IA, tool, systemNotification
            senderType: messageData.senderType,
            receiverId: messageData.receiverId,
            receiverType: messageData.receiverType,
            content: messageData.content,
            type: messageData.type,
            modelId: messageData.modelId,
            usage: messageData.usage,
            toolCallId: messageData.toolCallId,
            toolCalls: messageData.toolCalls,
            isError: messageData.isError,
            readBy: messageData.senderId ? [messageData.senderId] : [] // El emisor (si es un usuario) lo ha "leído"
        });
        await newMessage.save();

        //? 4. Actualizar y guardar la conversación
        conversation.lastMessage = newMessage._id;
        conversation.updatedAt = Date.now();

        // Actualizar el metadata de la conversación si es nueva
        if (isNewConversation && messageData.clientInfo && !conversation.metadata?.clientInfo) { // Si es nueva y no se puso en $setOnInsert
            conversation.metadata = conversation.metadata || {};
            conversation.metadata.clientInfo = messageData.clientInfo;
        }

        // Incrementar el contador de mensajes no leídos para todos los participantes (excepto el emisor)
        conversation.participants.forEach(participantIdObj => {
            const participantId = participantIdObj.toString();
            // No incrementar para el emisor si el emisor es un usuario.
            // Para mensajes de IA, tool, systemNotification, el senderId es null, por lo que todos los participantes (usuarios) incrementan.
            if (!messageData.senderId || !messageData.senderId.equals(participantId)) {
                conversation.updateUnreadCount(participantId, true);
            }
        });
        await conversation.save();

        //? 6. Devolver el mensaje creado
        return Message.findById(newMessage._id)
            .populate('senderId', 'name email role')
            .lean();
    }

    // MARK: - markMessageAsRead
    /**
     * Marca un mensaje como leído por un usuario.
     * 
     * @param {string} messageId - ID del mensaje a marcar como leído
     * @param {string} readerId - ID del usuario que marca el mensaje como leído
     * @param {string} conversationId - ID de la conversación a la que pertenece el mensaje
     * @param {{ _id: string, role: string }} requestingUser - Información del usuario que realiza la petición
     * @returns {Promise<Message>} - El mensaje actualizado con el lector agregado
     * @throws {ApiError} Si el mensaje no existe o el usuario no tiene acceso a la conversación
     */
    async markMessageAsRead(messageId, readerId, conversationId, requestingUser) {
        //! Validar acceso a la conversación
        await this._validateConversationAccess(conversationId, requestingUser._id, requestingUser.role);

        const message = await Message.findByIdAndUpdate(
            messageId,
            { $addToSet: { readBy: new mongoose.Types.ObjectId(readerId) } }, // Solo añade el readerId al array
            { new: true }
        ).populate('senderId', 'name email role').lean();

        if (!message) {
            throw new ApiError(404, 'Mensaje no encontrado para marcar como leído.');
        }

        // Ya no se recalcula el `unreadCount` de la conversación aquí.
        // Eso se maneja por `markConversationAsRead`.
        // El frontend puede usar el array `message.readBy` para mostrar checks de lectura individuales.

        return message;
    }



    // MARK: - markConversationAsRead
    /**
     * Marca una conversación como leída por un usuario.
     * 
     * Verifica que el usuario que realiza la petición tenga acceso a la conversación.
     * Si la conversación no existe o el usuario no tiene acceso, lanza ApiError 404 o 403.
     * 
     * @param {string} conversationId - ID de la conversación a marcar como leída
     * @param {string} readerId - ID del usuario que marca la conversación como leída
     * @param {{ _id: string, role: string }} requestingUser - Información del usuario que realiza la petición
     * @returns {Promise<Object>} - La conversación actualizada (como objeto plano)
     */
    async markConversationAsRead(conversationId, readerId, requestingUser) { // requestingUser para permisos
        //! Validar acceso a la conversación
        await this._validateConversationAccess(conversationId, requestingUser._id, requestingUser.role, true); // checkStatusNotClosed es true si no se puede marcar como leída una cerrada

        //? 1. Buscar la conversación
        const conversation = await Conversation.findById(conversationId); // No lean, necesitamos el objeto Mongoose
        if (!conversation) throw new ApiError(404, 'Conversación no encontrada');

        //? 2. Buscar la entrada de lectura del lector
        const unreadEntry = conversation.unreadCounts.find(uc => uc.userId.equals(readerId));
        if (unreadEntry) {
            unreadEntry.count = 0;
        } else {
            // Si no existe la entrada, significa que no había mensajes no leídos o es la primera vez que se marca.
            conversation.unreadCounts.push({ userId: new mongoose.Types.ObjectId(readerId), count: 0 });
        }

        //? 3. Guardar la conversación
        await conversation.save();

        //? 4. Devolver la conversación como objeto plano
        return conversation.toObject();
    }

    // MARK: - escalateConversationToAgent
    /**
     * Escala una conversación a estado "pendiente de agente" y crea un mensaje de sistema con la razón y urgencia de la escalada.
     * Si `escalatedByTool` es falso, se verifica que el usuario que realiza la acción sea admin/agente o el participante original.
     * El usuario original debe ser participante de la conversación.
     * 
     * @param {string} conversationId - ID de la conversación a escalar
     * @param {string} userId - ID del participante original de la conversación
     * @param {string} reason - Razón de la escalada
     * @param {string} urgency - Urgencia de la escalada
     * @param {boolean} [escalatedByTool=false] - Si la escalada fue iniciada por una herramienta de IA
     * @param {Object} requestingUser - Usuario que realiza la acción (IA via sistema, o un admin/agente manualmente)
     * @returns {Promise<Object>} - La conversación actualizada
     * @throws {ApiError} - Si la conversación no se encuentra o si el usuario no tiene permiso para escalar
     */
    async escalateConversationToAgent(conversationId, userId, reason, urgency, escalatedByTool = false, requestingUser) {
        //? requestingUser es quien realiza la acción (IA via sistema, o un admin/agente manualmente)
        // userId es el participante original de la conversación que se está escalando.
        const conversation = await Conversation.findById(conversationId);
        if (!conversation) throw new ApiError(404, 'Conversación no encontrada para escalar.');

        // El usuario original debe ser participante.
        if (!conversation.participants.some(p => p.equals(userId))) {
            throw new ApiError(403, 'El usuario especificado no es participante de esta conversación.');
        }
        //? Si no es escalado por herramienta, quien lo escala debe ser admin/agente o el propio usuario (si permitimos auto-escalada)
        if (!escalatedByTool && (!requestingUser || !['admin', 'agent'].includes(requestingUser.role))) {
            throw new ApiError(403, 'No tienes permiso para escalar esta conversación.');
        }

        //? Cambiar el estado de la conversación a 'pending_agent' y agregar detalles de escalación en metadata
        conversation.status = 'pending_agent';
        conversation.metadata = conversation.metadata || {};

        // Validar y sanitizar urgency
        let validUrgency = null;
        const allowedUrgencies = ['low', 'medium', 'high'];
        if (urgency && allowedUrgencies.includes(urgency.toLowerCase())) {
            validUrgency = urgency.toLowerCase();
        } else {
            console.warn(`Escalation: Urgencia inválida '${urgency}' recibida de la IA. Usando 'medium' por defecto.`);
            validUrgency = 'medium'; // Default si no viene nada de la IA
        }

        conversation.metadata.escalationDetails = {
            reason,
            urgency: validUrgency,
            escalatedByTool,
            escalationTimestamp: new Date(),
        };
        conversation.updatedAt = Date.now();

        //? Guardar la conversación ANTES de intentar crear el mensaje de sistema
        // para que si la creación del mensaje falla, el estado de escalación ya esté guardado.
        try {
            await conversation.save();
        } catch (validationError) {
            console.error("Error de validación al guardar conversación escalada:", validationError);
            throw validationError; // Relanzar para que AIService lo capture
        }

        //? Crear mensaje de sistema. El `requestingUser` para `createMessage` será 'system'.
        await this.createMessage({
            conversationId,
            senderType: 'systemNotification',
            content: `Escalación solicitada para usuario ${userId}. Razón: ${reason}. Urgencia: ${urgency || 'No especificada'}.`,
            type: 'systemNotification',
        }, { _id: null, role: 'system' }); // Usuario "sistema"

        //? Devolver la conversación actualizada
        return conversation.toObject();
    }

    // MARK: - assignAgentToConversation
    /**
     * Asigna un agente a una conversación.
     * @param {string} conversationId - ID de la conversación a asignar
     * @param {string} agentId - ID del agente a asignar
     * @param {Object} adminUser - Usuario que realiza la asignación (debe ser admin o agente)
     * @returns {Promise<Object>} - La conversación actualizada
     */
    async assignAgentToConversation(conversationId, agentId, adminUser) { // adminUser para verificar que un admin hace la asignación
        if (adminUser.role !== 'admin' && adminUser.role !== 'agent') { // O un agente se autoasigna
            throw new ApiError(403, 'Solo administradores o agentes pueden asignar conversaciones.');
        }
        const agentExists = await User.findOne({ _id: agentId, role: 'agent' });
        if (!agentExists) throw new ApiError(404, 'Agente no encontrado o el usuario no es un agente.');


        const conversation = await Conversation.findByIdAndUpdate(
            conversationId,
            {
                agentId: agentId,
                status: 'agent_active',
                type: 'user-to-agent',
                $addToSet: { participants: agentId }, // Asegurar que el agente es participante
                updatedAt: Date.now()
            },
            { new: true }
        ).populate('participants', 'name email role').populate('lastMessage');

        if (!conversation) throw new ApiError(404, 'Conversación no encontrada para asignar agente.');

        // Resetear contador de no leídos para el agente asignado
        conversation.updateUnreadCount(agentId, false);
        await conversation.save();

        return conversation;
    }

    // MARK: - getEscalatedConversations
    /**
     * Obtiene conversaciones escaladas basadas en el rol del usuario solicitante.
     * Solo los administradores y agentes pueden acceder a las conversaciones escaladas.
     * Los agentes ven solo las conversaciones escaladas, mientras que los administradores ven todas las que están en estado 'pending_agent'.
     * Las conversaciones se priorizan por urgencia y se ordenan por fecha de actualización.
     * 
     * @param {Object} requestingUser - Usuario que realiza la solicitud (debe tener rol de 'admin' o 'agent')
     * @param {string} [status='pending_agent'] - Estado de las conversaciones a recuperar, por defecto 'pending_agent'
     * @returns {Promise<Object[]>} - Lista de conversaciones escaladas
     * @throws {ApiError} - Si el usuario no está autorizado para ver conversaciones escaladas
     */
    async getEscalatedConversations(requestingUser, status = 'pending_agent') { // requestingUser para permisos
        if (!['admin', 'agent'].includes(requestingUser.role)) {
            throw new ApiError(403, 'No autorizado para ver chats escalados.');
        }
        // Los agentes solo ven las escaladas, los admins ven todas las que están en 'pending_agent'.
        // No se necesita filtro adicional por agente aquí, ya que el agente tomará una de la lista.
        return Conversation.find({ status, type: { $in: ['user-to-agent', 'user-to-ia'] } })
            .populate('participants', 'name email role')
            .populate({ path: 'agentId', select: 'name email role' })
            .populate({
                path: 'lastMessage',
                populate: { path: 'senderId', select: 'name email role' }
            })
            .populate({ path: 'metadata.pinnedBy.userId', select: 'name email role' })
            .sort({ 'metadata.escalationDetails.urgency': 1, updatedAt: -1 }) // Priorizar por urgencia, luego por más antiguo
            .lean();
    }

    // MARK: - updateConversationMetadata - título, tags y prioridad
    /**
     * Actualiza la metadata de una conversación (título, prioridad o tags). Verifica que el usuario que la actualiza tenga permisos.
     * @param {string} conversationId - ID de la conversación a actualizar
     * @param {Object} requestingUser - Usuario que realiza la acción (debe tener rol de admin o agente)
     * @param {Object} metadataUpdates - Contiene los datos a actualizar: { title, priority, tags }
     * @returns {Promise<Object>} - La conversación actualizada
     */
    async updateConversationMetadata(conversationId, requestingUser, metadataUpdates) {

        //! Validaciones
        await this._validateConversationAccess(conversationId, requestingUser._id, requestingUser.role, true); // No se puede actualizar metadata de cerrada
        if (!['admin', 'agent'].includes(requestingUser.role)) {
            throw new ApiError(403, "No tienes permiso para modificar la metadata de esta conversación.");
        }

        //? 1. Cargar conversación
        const convToUpdate = await Conversation.findById(conversationId); // Cargar para modificar
        if (!convToUpdate) throw new ApiError(404, "Conversación no encontrada para actualizar.");

        //? 2. Actualizar metadata
        convToUpdate.metadata = convToUpdate.metadata || {};

        if (typeof metadataUpdates.title !== 'undefined') {
            convToUpdate.metadata.title = metadataUpdates.title;
        }
        if (typeof metadataUpdates.priority !== 'undefined') {
            convToUpdate.metadata.priority = metadataUpdates.priority;
        }
        if (Array.isArray(metadataUpdates.tags)) {
            convToUpdate.metadata.tags = metadataUpdates.tags.map(tag => tag.trim().toLowerCase()).filter(Boolean);
        }
        //! No permitir actualizar escalationDetails o clientInfo directamente por esta vía.
        //! pinnedBy y notes tienen sus propios métodos.

        //? 3. Guardar la conversación
        convToUpdate.updatedAt = Date.now();
        await convToUpdate.save();

        //? 4. Devolver la conversación actualizada
        return convToUpdate.toObject();
    }

    // MARK: - addNoteToConversation
    /**
     * Agrega una nota a una conversación.
     * El usuario que realiza la petición debe tener permiso para realizar esta acción.
     * @param {string} conversationId - ID de la conversación a la que se va a agregar la nota.
     * @param {{ _id: string, role: string }} requestingUser - Información del usuario que realiza la petición.
     * @param {string} noteContent - Contenido de la nota a agregar.
     * @returns {Promise<Object>} - La conversación actualizada con la nota agregada.
     * @throws {ApiError} Si la conversación no existe, el usuario no tiene permiso o la conversación está cerrada.
     */
    async addNoteToConversation(conversationId, requestingUser, noteContent) {
        await this._validateConversationAccess(conversationId, requestingUser._id, requestingUser.role, true); // No se puede añadir nota a cerrada
        if (!['admin', 'agent'].includes(requestingUser.role)) {
            throw new ApiError(403, "No tienes permiso para añadir notas a esta conversación.");
        }
        const convToUpdate = await Conversation.findById(conversationId); // Cargar para modificar
        if (!convToUpdate) throw new ApiError(404, "Conversación no encontrada para añadir nota.");

        //? 1. Actualizar notas
        convToUpdate.metadata = convToUpdate.metadata || {};
        convToUpdate.metadata.notes = convToUpdate.metadata.notes || [];
        convToUpdate.metadata.notes.push({ userId: requestingUser._id, note: noteContent, createdAt: new Date() });

        //? 2. Guardar la conversación
        convToUpdate.updatedAt = Date.now();
        await convToUpdate.save();

        //? 3. Devolver la conversación actualizada
        // Para devolver con la nota populada:
        const finalConv = await Conversation.findById(conversationId)
            .populate({ path: 'metadata.notes.userId', select: 'name email role' }).lean();
        return finalConv;
    }

    // MARK: - pinConversation
    /**
     * Fija una conversación para el usuario actual.
     * @param {string} conversationId - ID de la conversación a fijar.
     * @param {{ _id: string, role: string }} requestingUser - Información del usuario que realiza la petición.
     * @returns {Promise<Object>} - La conversación actualizada.
     * @throws {ApiError} Si la conversación no existe, el usuario no tiene permiso o la conversación está cerrada.
     */
    async pinConversation(conversationId, requestingUser) {
        await this._validateConversationAccess(conversationId, requestingUser._id, requestingUser.role, true); // No se puede fijar una cerrada
        if (!['admin', 'agent'].includes(requestingUser.role)) {
            throw new ApiError(403, "No tienes permiso para fijar esta conversación.");
        }
        const convToUpdate = await Conversation.findById(conversationId); // Cargar para modificar
        if (!convToUpdate) throw new ApiError(404, "Conversación no encontrada para fijar.");

        //? 1. Actualizar notas
        convToUpdate.metadata = convToUpdate.metadata || {};
        convToUpdate.metadata.pinnedBy = convToUpdate.metadata.pinnedBy || [];

        if (!convToUpdate.metadata.pinnedBy.some(p => p.userId.equals(requestingUser._id))) {
            convToUpdate.metadata.pinnedBy.push({ userId: requestingUser._id, pinnedAt: new Date() });
            convToUpdate.updatedAt = Date.now();
            await convToUpdate.save();
        }

        //? 2. Devolver la conversación actualizada
        return convToUpdate.toObject();
    }

    // MARK: - unpinConversation
    /**
     * Desfija una conversación para el usuario actual.
     * @param {string} conversationId - ID de la conversación a desfijar.
     * @param {{ _id: string, role: string }} requestingUser - Información del usuario que realiza la petición.
     * @returns {Promise<Object>} - La conversación actualizada.
     * @throws {ApiError} Si la conversación no existe, el usuario no tiene permiso o la conversación está cerrada.
     */
    async unpinConversation(conversationId, requestingUser) {
        await this._validateConversationAccess(conversationId, requestingUser._id, requestingUser.role, true); // No se puede desfijar una cerrada
        if (!['admin', 'agent'].includes(requestingUser.role)) {
            throw new ApiError(403, "No tienes permiso para desfijar esta conversación.");
        }
        const convToUpdate = await Conversation.findById(conversationId); // Cargar para modificar
        if (!convToUpdate) throw new ApiError(404, "Conversación no encontrada para desfijar.");

        if (convToUpdate.metadata && convToUpdate.metadata.pinnedBy) {
            convToUpdate.metadata.pinnedBy = convToUpdate.metadata.pinnedBy.filter(p => !p.userId.equals(requestingUser._id));
            convToUpdate.updatedAt = Date.now();
            await convToUpdate.save();
        }

        //? 2. Devolver la conversación actualizada
        return convToUpdate.toObject();
    }

    // MARK: - createOrGetConversation
    /**
     * Busca una conversación existente entre dos usuarios o crea una nueva si no existe.
     * @param {string} senderId - ID del usuario que inicia la conversación.
     * @param {string} recipientId - ID del usuario con quien se desea conversar.
     * @returns {Promise<Object>} - La conversación encontrada o creada.
     * @throws {ApiError} Si el destinatario no es válido o si ocurre un error al crear la conversación.
     */
    async createOrGetConversation(senderId, recipientId) {
        // 1. Validar que los IDs sean diferentes
        if (senderId.toString() === recipientId.toString()) {
            throw new ApiError(400, "No puedes iniciar una conversación contigo mismo.");
        }

        // 2. Validar que el recipientId sea un usuario válido
        const recipient = await User.findById(recipientId);
        if (!recipient) {
            throw new ApiError(404, "El usuario destinatario no existe.");
        }

        // 3. Buscar conversación existente entre los dos participantes
        let conversation = await Conversation.findOne({
            type: 'user-to-user',
            participants: { $all: [senderId, recipientId] }
        }).populate('participants', 'name email').lean();

        // 4. Si no existe, crear una nueva
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, recipientId],
                type: 'user-to-user',
                status: 'open',
                lastMessageAt: new Date(),
            });
            // Poblar los participantes para la respuesta
            conversation = await Conversation.findById(conversation._id)
                .populate('participants', 'name email').lean();
        }

        return conversation;
    }

    // MARK: - searchUsers
    /**
     * Busca usuarios por nombre o email.
     * @param {string} searchTerm - Término de búsqueda.
     * @param {string} currentUserId - ID del usuario que realiza la búsqueda (para excluirlo de los resultados).
     * @param {number} [limit=10] - Límite de resultados.
     * @param {number} [page=1] - Página de resultados.
     * @returns {Promise<Object>} - Objeto con los usuarios encontrados, total, página actual y total de páginas.
     */
    async searchUsers(searchTerm, currentUserId, { limit = 10, page = 1 }) {
        const skip = (page - 1) * limit;
        const query = {
            _id: { $ne: currentUserId }, // Excluir al usuario que busca
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { email: { $regex: searchTerm, $options: 'i' } }
            ]
        };

        const users = await User.find(query)
            .select('name email role') // Seleccionar solo los campos necesarios
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await User.countDocuments(query);

        return { users, total, currentPage: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) };
    }

    // MARK: - findOrCreateConversation
    /**
     * Busca una conversación existente entre dos usuarios o crea una nueva si no existe.
     * @param {string} user1Id - ID del primer usuario.
     * @param {string} user2Id - ID del segundo usuario.
     * @returns {Promise<Object>} - La conversación encontrada o creada.
     */
    async findOrCreateConversation(user1Id, user2Id) {
        // Asegurarse de que los IDs sean de tipo ObjectId
        const u1Id = new mongoose.Types.ObjectId(user1Id);
        const u2Id = new mongoose.Types.ObjectId(user2Id);

        // Buscar una conversación user-to-user entre los dos participantes
        let conversation = await Conversation.findOne({
            type: 'user-to-user',
            participants: { $all: [u1Id, u2Id], $size: 2 }
        }).lean();

        if (!conversation) {
            // Si no existe, crear una nueva conversación
            conversation = await Conversation.create({
                type: 'user-to-user',
                participants: [u1Id, u2Id],
                status: 'active', // Las conversaciones directas inician como activas
                metadata: {
                    title: `Chat entre ${user1Id} y ${user2Id}` // Título genérico, se puede mejorar
                }
            });
            // Asegurarse de que el objeto devuelto sea plano
            conversation = conversation.toObject();
        }

        return conversation;
    }
}

export default MessageService;