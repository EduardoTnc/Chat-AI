// server/controllers/adminController.js
import AdminConfigService from '../chat-module/services/AdminConfigService.js';
import MessageService from '../chat-module/services/MessageService.js';
import { ApiError } from '../utils/errorHandler.js';
import User from '../models/User.js'; // Para buscar agentes

const adminConfigService = new AdminConfigService();
const messageService = new MessageService();

// MARK: - AI Model Configurations
export const getAllAIModelConfigsCtrl = async (req, res, next) => {
    try {
        const configs = await adminConfigService.getAllAIModelConfigs();
        res.status(200).json({ success: true, data: configs });
    } catch (error) {
        next(error);
    }
};

export const createAIModelConfigCtrl = async (req, res, next) => {
    try {
        // Validar req.body según el schema de AIModelConfig
        const newConfig = await adminConfigService.createAIModelConfig(req.body);
        res.status(201).json({ success: true, data: newConfig });
    } catch (error) {
        next(error);
    }
};

export const getAIModelConfigCtrl = async (req, res, next) => { // Por modelId del sistema
    try {
        const { modelId } = req.params;
        const config = await adminConfigService.getAIModelConfig(modelId);
        if (!config) throw new ApiError(404, `Configuración para modelId '${modelId}' no encontrada.`);
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
};
export const getAIModelConfigByInternalIdCtrl = async (req, res, next) => { // Por _id de mongo
    try {
        const { internalId } = req.params;
        const config = await adminConfigService.getAIModelConfigByInternalId(internalId);
        // getAIModelConfigByInternalId ya lanza error si no se encuentra
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
};


export const updateAIModelConfigCtrl = async (req, res, next) => {
    try {
        const { internalId } = req.params; // Usar el _id de MongoDB para la actualización
        const updatedConfig = await adminConfigService.updateAIModelConfig(internalId, req.body);
        res.status(200).json({ success: true, data: updatedConfig });
    } catch (error) {
        next(error);
    }
};

export const deleteAIModelConfigCtrl = async (req, res, next) => {
    try {
        const { internalId } = req.params; // Usar el _id de MongoDB
        const result = await adminConfigService.deleteAIModelConfig(internalId);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

// MARK: - API Key Management
export const getAllApiKeyStatusesCtrl = async (req, res, next) => {
    try {
        const statuses = await adminConfigService.getAllApiKeyStatus();
        res.status(200).json({ success: true, data: statuses });
    } catch (error) {
        next(error);
    }
};

export const saveApiKeyCtrl = async (req, res, next) => {
    try {
        const { provider, apiKey, description } = req.body;
        if (!provider || !apiKey) {
            return next(new ApiError(400, "Provider y apiKey son requeridos."));
        }
        const result = await adminConfigService.saveApiKey(provider, apiKey, description);
        res.status(200).json({ success: true, data: result, message: `API Key para ${provider} guardada.` });
    } catch (error) {
        next(error);
    }
};

export const getApiKeyStatusCtrl = async (req, res, next) => {
    try {
        const { provider } = req.params;
        const status = await adminConfigService.getApiKeyStatus(provider);
        res.status(200).json({ success: true, data: status });
    } catch (error) {
        next(error);
    }
};

export const deleteApiKeyCtrl = async (req, res, next) => {
    try {
        const { provider } = req.params;
        const result = await adminConfigService.deleteApiKey(provider);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        next(error);
    }
};

// --- Cost Calculation ---
export const getCostReportCtrl = async (req, res, next) => {
    try {
        const { provider } = req.params;
        const periodOptions = req.query; // ej. ?month=current, ?startDate=...&endDate=...
        const report = await adminConfigService.calculateCosts(provider, periodOptions);
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        next(error);
    }
};


// MARK: - Conversation Management by Admin/Agent
export const getAllConversations = async (req, res, next) => { // getAllConversationsForAdmin
    try {
        const { page = 1, limit = 20, type, status, participantId, agentId, sortBy, sortOrder, searchQuery } = req.query;
        const result = await messageService.getAllConversationsForAdmin({
            page: parseInt(page),
            limit: parseInt(limit),
            type,
            status,
            participantId,
            agentId,
            sortBy,
            sortOrder,
            searchQuery
        }, req.user); // Pasar el requestingUser para la validación de rol
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

export const getConversationDetailsForAdmin = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const conversation = await messageService.getConversationById(
            conversationId,
            req.user._id,
            req.user.role
        );
        // La populación detallada ya se hace en getConversationById
        res.status(200).json({ success: true, data: conversation });
    } catch (error) {
        next(error);
    }
};

export const updateConversationMetadataByAdmin = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const updates = req.body;
        if (Object.keys(updates).length === 0) {
            return next(new ApiError(400, "No se proporcionaron datos para actualizar."));
        }
        const updatedConversation = await messageService.updateConversationMetadata(
            conversationId,
            req.user, // Pasar el objeto requestingUser completo
            updates
        );
        res.status(200).json({ success: true, data: updatedConversation });
    } catch (error) {
        next(error);
    }
};

export const addNoteToConversationByAdmin = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const { note } = req.body;
        if (!note || typeof note !== 'string' || note.trim() === '') {
            return next(new ApiError(400, "El contenido de la nota es requerido."));
        }
        const updatedConversation = await messageService.addNoteToConversation(
            conversationId,
            req.user, // Pasar el objeto requestingUser completo
            note.trim()
        );
        res.status(200).json({ success: true, data: updatedConversation });
    } catch (error) {
        next(error);
    }
};

export const pinConversationByAdmin = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const conversation = await messageService.pinConversation(conversationId, req.user);
        res.status(200).json({ success: true, data: conversation, message: "Conversación fijada." });
    } catch (error) {
        next(error);
    }
};

export const unpinConversationByAdmin = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const conversation = await messageService.unpinConversation(conversationId, req.user);
        res.status(200).json({ success: true, data: conversation, message: "Conversación desfijada." });
    } catch (error) {
        next(error);
    }
};

// MARK: - Agent Assignment & Escalated Chats
export const assignAgentToChatCtrl = async (req, res, next) => {
    try {
        const { conversationId } = req.params;
        const { agentId } = req.body; // El ID del agente a asignar

        if (!agentId) {
            return next(new ApiError(400, "agentId es requerido en el body."));
        }

        const conversation = await messageService.assignAgentToConversation(
            conversationId,
            agentId,
            req.user // El admin/agente que realiza la acción
        );
        // Aquí podrías emitir un evento de socket para notificar al agente asignado y al cliente
        res.status(200).json({ success: true, data: conversation, message: "Agente asignado exitosamente." });
    } catch (error) {
        next(error);
    }
};

export const getEscalatedChatsCtrl = async (req, res, next) => {
    try {
        const { status } = req.query; // por si quieres filtrar por otros status escalados
        const conversations = await messageService.getEscalatedConversations(req.user, status);
        res.status(200).json({ success: true, data: conversations });
    } catch (error) {
        next(error);
    }
};