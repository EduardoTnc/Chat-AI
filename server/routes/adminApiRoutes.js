// server/routes/adminApiRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
    getAllAIModelConfigsCtrl, // Cambiado nombre
    createAIModelConfigCtrl,
    getAIModelConfigByInternalIdCtrl, // Cambiado para usar internalId
    updateAIModelConfigCtrl,
    deleteAIModelConfigCtrl,
    getAllApiKeyStatusesCtrl,
    saveApiKeyCtrl,
    getApiKeyStatusCtrl,
    deleteApiKeyCtrl,
    getCostReportCtrl,
    getAllConversations,
    getConversationDetailsForAdmin,
    updateConversationMetadataByAdmin,
    addNoteToConversationByAdmin,
    pinConversationByAdmin,
    unpinConversationByAdmin,
    assignAgentToChatCtrl,
    getEscalatedChatsCtrl,
} from '../controllers/adminController.js';

import {
    getAllUsers,
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    restoreUser,
    getDeletedUsers
} from '../controllers/userController.js';

const router = express.Router();

router.use(protect); // Proteger todas las rutas de admin

//? Rutas para gestión de Modelos de IA
router.get('/ai-models', authorize('admin'), getAllAIModelConfigsCtrl);
router.post('/ai-models', authorize('admin'), createAIModelConfigCtrl);
// router.get('/ai-models/:modelId', authorize('admin'), getAIModelConfigCtrl); // Si quieres buscar por modelId de sistema
router.get('/ai-models/:internalId', authorize('admin'), getAIModelConfigByInternalIdCtrl); // Buscar por _id de Mongo
router.put('/ai-models/:internalId', authorize('admin'), updateAIModelConfigCtrl);
router.delete('/ai-models/:internalId', authorize('admin'), deleteAIModelConfigCtrl);

//? Rutas para gestión de API Keys
router.get('/api-keys', authorize('admin'), getAllApiKeyStatusesCtrl);
router.post('/api-keys', authorize('admin'), saveApiKeyCtrl);
router.get('/api-keys/:provider', authorize('admin'), getApiKeyStatusCtrl);
router.delete('/api-keys/:provider', authorize('admin'), deleteApiKeyCtrl);

//? Rutas para gestión de Costos
router.get('/costs/:provider', authorize('admin'), getCostReportCtrl);

//? Rutas para gestión de Conversaciones por Admin/Agente
router.get('/conversations', authorize('admin', 'agent'), getAllConversations);
router.get('/conversations/:conversationId', authorize('admin', 'agent'), getConversationDetailsForAdmin);
router.put('/conversations/:conversationId/metadata', authorize('admin', 'agent'), updateConversationMetadataByAdmin);
router.post('/conversations/:conversationId/notes', authorize('admin', 'agent'), addNoteToConversationByAdmin);
router.post('/conversations/:conversationId/pin', authorize('admin', 'agent'), pinConversationByAdmin);
router.post('/conversations/:conversationId/unpin', authorize('admin', 'agent'), unpinConversationByAdmin);

//? Rutas para gestión de Agentes y Chats Escalados
// Un agente puede querer asignarse un chat, o un admin puede asignar.
router.post('/conversations/:conversationId/assign-agent', authorize('admin', 'agent'), assignAgentToChatCtrl);
router.get('/escalated-chats', authorize('admin', 'agent'), getEscalatedChatsCtrl);

//? Rutas para gestión de Usuarios (Admin)
router.get('/users', authorize('admin'), getAllUsers);
router.get('/users/deleted', authorize('admin'), getDeletedUsers);
router.post('/users', authorize('admin'), createUserByAdmin);
router.put('/users/:userId', authorize('admin'), updateUserByAdmin);
router.delete('/users/:userId', authorize('admin'), deleteUserByAdmin);
router.put('/users/restore/:userId', authorize('admin'), restoreUser);

export default router;