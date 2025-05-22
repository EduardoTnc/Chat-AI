import express from 'express';
import {
    getUserConversations,
    getMessagesForConversation,
    markUserConversationAsRead
} from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Proteger todas las rutas de chat
router.use(protect);

router.get('/', getUserConversations); // Obtener todas las conversaciones del usuario logueado
router.get('/:conversationId/messages', getMessagesForConversation); // Obtener mensajes de una conversación específica
router.post('/:conversationId/mark-as-read', markUserConversationAsRead); // Marcar toda la conversación como leída

export default router;