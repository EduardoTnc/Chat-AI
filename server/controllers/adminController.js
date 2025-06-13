// server/controllers/adminController.js
import AdminConfigService from '../chat-module/services/AdminConfigService.js';
import { ApiError } from '../utils/errorHandler.js';

const adminConfigService = new AdminConfigService();

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
        const { 
            name, 
            provider, 
            modelId, 
            apiIdentifier, 
            systemPrompt, 
            isVisibleToClient, 
            allowedRoles, 
            supportsTools, 
            isActive,
            description,
            isDefault,
            apiKeyId // Nuevo campo para la referencia a la API key
        } = req.body;

        // Validación básica
        if (!name || !provider || !modelId || !apiIdentifier) {
            throw new ApiError(400, 'Faltan campos requeridos');
        }

        // Validar que si el proveedor no es 'custom', se proporcione una API key
        if (provider !== 'custom' && !apiKeyId) {
            throw new ApiError(400, 'Se requiere una API key para modelos que no son personalizados');
        }

        const newConfig = await adminConfigService.createAIModelConfig({
            name,
            provider,
            modelId,
            apiIdentifier,
            systemPrompt: systemPrompt || "Eres un asistente de IA que responde a las preguntas de los usuarios.",
            isVisibleToClient: Boolean(isVisibleToClient),
            allowedRoles: Array.isArray(allowedRoles) ? allowedRoles : ['user'],
            supportsTools: Boolean(supportsTools),
            isActive: Boolean(isActive),
            description: description || '',
            isDefault: Boolean(isDefault),
            apiKeyId: apiKeyId || null // Pasar el ID de la API key si existe
        });

        res.status(201).json({ success: true, data: newConfig });
    } catch (error) {
        next(error);
    }
};

export const getAIModelConfigByInternalIdCtrl = async (req, res, next) => {
    try {
        const { internalId } = req.params;
        const config = await adminConfigService.getAIModelConfigByInternalId(internalId);
        res.status(200).json({ success: true, data: config });
    } catch (error) {
        next(error);
    }
};

export const updateAIModelConfigCtrl = async (req, res, next) => {
    try {
        const { internalId } = req.params;
        const { apiKeyId, ...updateData } = req.body; // Extraer apiKeyId del body
        
        // Asegurarse de que los campos booleanos sean booleanos
        if ('isVisibleToClient' in updateData) updateData.isVisibleToClient = Boolean(updateData.isVisibleToClient);
        if ('supportsTools' in updateData) updateData.supportsTools = Boolean(updateData.supportsTools);
        if ('isActive' in updateData) updateData.isActive = Boolean(updateData.isActive);
        if ('isDefault' in updateData) updateData.isDefault = Boolean(updateData.isDefault);
        
        // Validar allowedRoles
        if (updateData.allowedRoles && !Array.isArray(updateData.allowedRoles)) {
            throw new ApiError(400, 'allowedRoles debe ser un array');
        }

        // Si se está actualizando el proveedor a uno que no sea 'custom' y no se proporciona apiKeyId
        if (updateData.provider && updateData.provider !== 'custom' && apiKeyId === undefined) {
            // Verificar si el modelo actual ya tiene una clave API
            const currentModel = await adminConfigService.getAIModelConfigByInternalId(internalId);
            if (!currentModel.apiKeyRef) {
                throw new ApiError(400, 'Se requiere una API key para modelos que no son personalizados');
            }
        }

        // Si se proporciona apiKeyId, incluirlo en los datos de actualización
        if (apiKeyId !== undefined) {
            updateData.apiKeyId = apiKeyId;
        }

        const updatedConfig = await adminConfigService.updateAIModelConfig(internalId, updateData);
        res.status(200).json({ success: true, data: updatedConfig });
    } catch (error) {
        next(error);
    }
};

export const deleteAIModelConfigCtrl = async (req, res, next) => {
    try {
        const { internalId } = req.params;
        await adminConfigService.deleteAIModelConfig(internalId);
        res.status(200).json({ 
            success: true, 
            message: 'Configuración de modelo eliminada correctamente' 
        });
    } catch (error) {
        next(error);
    }
};

// Obtener modelos visibles para el rol del usuario
// Ruta: GET /api/admin/ai-models/visible?role=user
// No requiere autenticación (puede ser usado por el frontend público)
export const getVisibleAIModelsCtrl = async (req, res, next) => {
    try {
        const role = req.query.role || 'user';
        const models = await adminConfigService.getVisibleAIModels(role);
        res.status(200).json({ success: true, data: models });
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

/**
 * Guarda o actualiza una API Key para un proveedor específico.
 * Si se proporciona isUpdate=true, permite actualizar solo la descripción sin necesidad de proporcionar una nueva API Key.
 * 
 * @param {Object} req - Objeto de solicitud de Express
 * @param {Object} req.body - Cuerpo de la solicitud
 * @param {string} req.body.provider - Nombre del proveedor (requerido)
 * @param {string} [req.body.apiKey] - La API Key a guardar (opcional si isUpdate=true y solo se actualiza la descripción)
 * @param {string} [req.body.description] - Descripción opcional para la API Key
 * @param {boolean} [req.body.isUpdate] - Indica si es una actualización (permite actualizar solo la descripción)
 * @param {Object} res - Objeto de respuesta de Express
 * @param {Function} next - Función de middleware de Express
 */
export const saveApiKeyCtrl = async (req, res, next) => {
    try {
        const { provider, apiKey, description = '', isUpdate = false } = req.body;
        
        // Validar que se proporcione el proveedor
        if (!provider) {
            return next(new ApiError(400, 'El campo "provider" es requerido.'));
        }
        
        // Si no es una actualización, validar que se proporcione una API Key
        if (!isUpdate && !apiKey) {
            return next(new ApiError(400, 'El campo "apiKey" es requerido para crear una nueva API Key.'));
        }
        
        // Si es una actualización, validar que se proporcione al menos un campo para actualizar
        if (isUpdate && !apiKey && description === undefined) {
            return next(new ApiError(400, 'Debe proporcionar al menos un campo para actualizar (apiKey o description).'));
        }
        
        // Llamar al servicio para guardar o actualizar la API Key
        const result = await adminConfigService.saveApiKey(
            provider, 
            apiKey, 
            description, 
            isUpdate
        );
        
        // Determinar el mensaje de éxito apropiado
        const message = isUpdate 
            ? `API Key para ${provider} actualizada correctamente.` 
            : `API Key para ${provider} guardada correctamente.`;
        
        res.status(200).json({ 
            success: true, 
            data: result, 
            message 
        });
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