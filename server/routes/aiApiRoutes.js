import express from 'express';
import {
    getAvailableAIModelsForClient,
    getAIConversationMessages,
    markAIChatAsRead
} from '../controllers/aiController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/models', getAvailableAIModelsForClient); // Modelos de IA visibles para el cliente
router.get('/conversations/:conversationId/messages', getAIConversationMessages); // Mensajes de una conversación con IA
router.post('/conversations/:conversationId/mark-as-read', markAIChatAsRead);

export default router;