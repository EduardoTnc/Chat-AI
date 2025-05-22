import AIService from '../chat-module/services/AIService.js';
import MessageService from '../chat-module/services/MessageService.js';
import AdminConfigService from '../chat-module/services/AdminConfigService.js'; // AIService depende de esto
import { ApiError } from '../utils/errorHandler.js';

const adminConfigService = new AdminConfigService();
const aiService = new AIService(adminConfigService); // Instanciar servicios
const messageService = new MessageService();

// MARK: getAvailableAIModelsForClient
export const getAvailableAIModelsForClient = async (req, res, next) => {
    try {
        const userId = req.user._id; // Para filtrar modelos por rol si es necesario
        const userRole = req.user.role;

        const models = await aiService.fetchAvailableModels(userId, userRole);
        res.status(200).json({
            message: "Modelos de IA disponibles obtenidos",
            data: models,
        });
    } catch (error) {
        next(error);
    }
};

// MARK: getAIConversationMessages
export const getAIConversationMessages = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;
        const { limit = 20, beforeTimestamp = null } = req.query;

        // Similar al chatController, verificar pertenencia de la conversación al usuario.
        // MessageService.getMessagesByConversationId podría encargarse de esto.

        const messages = await messageService.getMessagesByConversationId(conversationId, {
            limit: parseInt(limit),
            beforeTimestamp,
        });

        // Filtrar para asegurar que la conversación es de tipo 'user-to-ia' y pertenece al usuario.
        // Esto es una doble verificación, idealmente el servicio ya lo haría.
        if (messages.length > 0) {
            const firstMessageConv = await messageService.getConversationById(conversationId);
            if (!firstMessageConv || firstMessageConv.type !== 'user-to-ia' || !firstMessageConv.participants.some(p => p.equals(userId))) {
                return next(new ApiError('No autorizado para acceder a esta conversación de IA.', 403));
            }
        }


        res.status(200).json({
            message: "Historial de chat con IA obtenido",
            data: messages,
        });
    } catch (error) {
        next(error);
    }
};

// MARK: markAIChatAsRead
export const markAIChatAsRead = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        const updatedConversation = await messageService.markConversationAsRead(conversationId, userId);

        res.status(200).json({
            message: "Conversación de IA marcada como leída",
            data: updatedConversation
        });
    } catch (error) {
        next(error);
    }
};