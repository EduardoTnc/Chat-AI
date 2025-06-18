import AIService from '../chat-module/services/AIService.js';
import MessageService from '../chat-module/services/MessageService.js';
import AdminConfigService from '../chat-module/services/AdminConfigService.js'; // AIService depende de esto
import { ApiError } from '../utils/errorHandler.js';
import Conversation from '../models/Conversation.js';

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
            success: true,
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

        const messages = await messageService.getMessagesByConversationId(
            conversationId,
            { _id: userId, role: req.user.role },
            {
                limit: parseInt(limit),
                beforeTimestamp,
            }
        );

        // Filtrar para asegurar que la conversación es de tipo 'user-to-ia' y pertenece al usuario.
        // Esto es una doble verificación, idealmente el servicio ya lo haría.
        if (messages.length > 0) {
            const firstMessageConv = await messageService.getConversationById(conversationId);
            if (!firstMessageConv || firstMessageConv.type !== 'user-to-ia' || 
                !firstMessageConv.participants.some(p => {
                    const participantId = p._id ? p._id.toString() : p.toString();
                    return participantId === userId.toString();
                })) {
                return next(new ApiError('No autorizado para acceder a esta conversación de IA.', 403));
            }
        }


        res.status(200).json({
            success: true,
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

        // El servicio ya valida permisos
        await messageService.markMessagesAsRead(conversationId, userId);

        res.status(200).json({
            success: true,
            message: 'Mensajes marcados como leídos',
        });
    } catch (error) {
        next(error);
    }
};

// MARK: getLatestAIConversation
export const getLatestAIConversation = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { modelId } = req.query;

        if (!modelId) {
            throw new ApiError(400, 'Se requiere el ID del modelo');
        }

        // Buscar la conversación más reciente de tipo user-to-ia para este usuario y modelo
        const conversation = await Conversation.findOne({
            'participants': userId,
            'type': 'user-to-ia',
            'aiModelId': modelId
        })
        .sort({ 'updatedAt': -1 }) // Ordenar por fecha de actualización descendente
        .select('_id title status updatedAt') // Solo los campos necesarios
        .lean();

        if (!conversation) {
            return res.status(200).json({
                success: true,
                data: null,
                message: 'No se encontraron conversaciones previas para este modelo'
            });
        }

        res.status(200).json({
            success: true,
            data: conversation,
            message: 'Última conversación encontrada'
        });
    } catch (error) {
        next(error);
    }
};