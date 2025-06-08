// server/chat-module/socketHandlers/index.js
import UserSocketHandler from './UserSocketHandler.js';
import AISocketHandler from './AISocketHandler.js';
import AgentSocketHandler from './AgentSocketHandler.js';

import MessageService from '../services/MessageService.js';
import AIService from '../services/AIService.js';
import AdminConfigService from '../services/AdminConfigService.js';
import { authenticateSocket } from '../../middleware/socketAuthMiddleware.js'; // Autenticación de socket

// Instancia los servicios
const adminConfigService = new AdminConfigService();
const messageService = new MessageService();
const aiService = new AIService(adminConfigService, messageService); // AIService necesita ambos

const connectedUsers = new Map(); // Map<userId, Set<socketId>> Un usuario puede tener múltiples conexiones/pestañas
const AGENT_ROOM = "agents_room";
const ADMIN_ROOM = "admins_room";

const initializeSocketIO = (io) => {
    // Middleware de autenticación para cada conexión de Socket.IO
    console.log("Initializing Socket.IO...");
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        if (!socket.user) {
            console.error("Socket conectado sin usuario autenticado (debería haber sido prevenido por middleware). Desconectando.");
            socket.disconnect(true);
            return;
        }
        const userId = socket.user._id.toString();
        console.log(`Socket conectado: ${socket.id} (Usuario: ${socket.user.email}, ID: ${userId}, Rol: ${socket.user.role})`);

        // Almacenar el socketId del usuario
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId).add(socket.id);
        // Emitir evento de usuario online a sus contactos o globalmente (si es necesario)
        // socket.broadcast.emit('userOnline', { userId });


        // Unir a salas según rol
        if (socket.user.role === 'agent') {
            socket.join(AGENT_ROOM);
            console.log(`Agente ${userId} unido a ${AGENT_ROOM}`);
        }
        if (socket.user.role === 'admin') {
            socket.join(ADMIN_ROOM);
            console.log(`Admin ${userId} unido a ${ADMIN_ROOM}`);
        }
        // También se podría unir a una sala específica de usuario: socket.join(userId);
        socket.join(userId); // Cada usuario en su propia sala para notificaciones directas


        // Inicializar manejadores específicos para este socket
        // Pasar 'io' para emitir globalmente, 'socket' para emitir al cliente actual,
        // 'connectedUsers' para encontrar sockets de otros usuarios.
        const userHandler = new UserSocketHandler(socket, io, messageService, connectedUsers);
        const aiHandler = new AISocketHandler(socket, io, messageService, aiService, connectedUsers); // AISocketHandler puede necesitar connectedUsers para notificar
        const agentHandler = new AgentSocketHandler(socket, io, messageService, connectedUsers, AGENT_ROOM, ADMIN_ROOM);

        userHandler.registerUserEvents();
        aiHandler.registerAIEvents();
        agentHandler.registerAgentEvents();

        socket.on('disconnect', (reason) => {
            console.log(`Socket desconectado: ${socket.id} (Usuario ID: ${userId}, Razón: ${reason})`);
            const userSocketIds = connectedUsers.get(userId);
            if (userSocketIds) {
                userSocketIds.delete(socket.id);
                if (userSocketIds.size === 0) {
                    connectedUsers.delete(userId);
                    // Emitir evento de usuario offline si ya no tiene más conexiones activas
                    // socket.broadcast.emit('userOffline', { userId });
                    console.log(`Usuario ${userId} completamente offline.`);
                }
            }
            // Salir de las salas automáticamente al desconectar
        });

        socket.on('error', (error) => {
            console.error(`Socket error para ${socket.id} (Usuario ID: ${userId}):`, error);
            socket.emit('socketError', { message: error.message || 'Error de socket desconocido.'});
        });
    });

    // MARK: - Helper emitToUser
    /**
     * Emite un evento a todas las conexiones actuales de un usuario.
     * @param {string} targetUserId ID del usuario al que se quiere emitir el evento.
     * @param {string} event El nombre del evento que se va a emitir.
     * @param {object} data El objeto que se va a pasar como parámetro al evento.
     * @returns {boolean} true si el usuario estaba conectado y el evento se emitió, false de lo contrario.
     */
    io.emitToUser = (targetUserId, event, data) => {
        const socketIds = connectedUsers.get(targetUserId.toString());
        if (socketIds && socketIds.size > 0) {
            socketIds.forEach(socketId => {
                io.to(socketId).emit(event, data);
            });
            return true;
        }
        return false; // Usuario no conectado
    };
};

export { initializeSocketIO, AGENT_ROOM, ADMIN_ROOM };