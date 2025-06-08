import MessageService from '../chat-module/services/MessageService.js';
import User from '../models/User.js';
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
			success: true,
			message: "Conversaciones obtenidas",
			data: conversations,
			currentPage: parseInt(page),
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

		const messages = await messageService.getMessagesByConversationId(
			conversationId,
			userId,
			{
				limit: parseInt(limit),
				beforeTimestamp,
			}
		);

		res.status(200).json({
			success: true,
			message: "Mensajes obtenidos",
			data: messages,
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

		const updatedConversation = await messageService.markConversationAsRead(conversationId, userId, req.user);

		res.status(200).json({
			success: true,
			message: "Conversación marcada como leída",
			data: updatedConversation
		});
	} catch (error) {
		next(error);
	}
};

// MARK: searchUsersForChat
export const searchUsersForChat = async (req, res, next) => {
	try {
		const { query, page = 1, limit = 10 } = req.query;
		const currentUserId = req.user._id;

		if (!query || query.length < 2) {
			return next(new ApiError(400, "Se requiere un término de búsqueda de al menos 2 caracteres"));
		}

		const { users, total, currentPage, totalPages } = await messageService.searchUsers(query, currentUserId, { page: parseInt(page), limit: parseInt(limit) });

		res.status(200).json({
			success: true,
			message: "Usuarios encontrados",
			data: users,
			totalUsers: total,
			currentPage: currentPage,
			totalPages: totalPages
		});
	} catch (error) {
		next(error);
	}
};

// MARK: createOrGetConversation
export const createOrGetConversation = async (req, res, next) => {
	try {
		const currentUserId = req.user._id;
		const { targetUserId } = req.body;

		if (!targetUserId) {
			return next(new ApiError(400, "Se requiere el ID del usuario objetivo para iniciar una conversación."));
		}

		const conversation = await messageService.findOrCreateConversation(currentUserId, targetUserId);

		res.status(200).json({
			success: true,
			message: "Conversación obtenida o creada exitosamente",
			data: conversation
		});

	} catch (error) {
		next(error);
	}
};