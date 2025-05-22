import MessageService from '../chat-module/services/MessageService.js';
import { ApiError } from '../utils/errorHandler.js';

const messageService = new MessageService(); // Instanciar el servicio

// MARK: getUserConversations
export const getUserConversations = async (req, res, next) => {
    try {
        const userId = req.user._id; // Del middleware 'protect'
        const { page = 1, limit = 20 } = req.query;

        const conversations = await messageService.getConversationsForUser(userId, {
            page: parseInt(page),
            limit: parseInt(limit),
        });

        // Podrías añadir información de paginación si es necesario
        res.status(200).json({
            message: "Conversaciones obtenidas",
            data: conversations,
            currentPage: parseInt(page),
            totalPages: Math.ceil(conversations.totalMessages / parseInt(limit))
        });
    } catch (error) {
        next(error);
    }
};

// MARK: getMessagesForConversation
export const getMessagesForConversation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { limit = 20, beforeTimestamp = null } = req.query; // Para paginación/scroll infinito

        // Aquí deberías verificar si el usuario actual es participante de la conversación
        // messageService.getMessagesByConversationId podría incluir esta validación o hacerla aquí.
        // Por ahora, asumimos que messageService lo maneja o que el acceso está implícito.
        // Para mayor seguridad, MessageService debería verificar la pertenencia del userId a la conversationId.

        const messages = await messageService.getMessagesByConversationId(conversationId, {
            limit: parseInt(limit),
            beforeTimestamp,
        });

        res.status(200).json({
            message: "Mensajes obtenidos",
            data: messages,
            currentPage: parseInt(page),
            totalPages: Math.ceil(messages.totalMessages / parseInt(limit))
        });
    } catch (error) {
        next(error);
    }
};

// MARK: markUserConversationAsRead
export const markUserConversationAsRead = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        const updatedConversation = await messageService.markConversationAsRead(conversationId, userId);

        res.status(200).json({
            message: "Conversación marcada como leída",
            data: updatedConversation
        });
    } catch (error) {
        next(error);
    }
};