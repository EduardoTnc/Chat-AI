// server/__tests__/chat.integration.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import { io as ClientSocket } from 'socket.io-client';
import app from '../app.js'; // << CAMBIO
import { httpServer } from '../server.js'; // << CAMBIO: Importar httpServer desde server.js
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
// import Message from '../models/Message.js'; // No se usa directamente aquí
import config from '../config/index.js';

// Helper para login (sin cambios)
const loginUser = async (email, password) => {
    const res = await request(app)
        .post(`${config.apiPrefix || '/api/v1'}/auth/login`)
        .send({ email, password });
    if (res.body && res.body.accessToken) {
        return res.body.accessToken;
    }
    throw new Error(`Login fallido para ${email}: ${JSON.stringify(res.body)}`);
};


// MARK: describe
describe('Chat Flow (User-to-User)', () => {
    let userACreds = { name: 'User A', email: 'usera@example.com', password: 'passwordA' };
    let userBCreds = { name: 'User B', email: 'userb@example.com', password: 'passwordB' };
    let userA, userB;
    let tokenA, tokenB;
    let socketA, socketB;
    let serverAddress;
    let createdConversationId;

    beforeAll(async () => {
        if (!httpServer.listening) {
            await new Promise(resolve => httpServer.listen(0, resolve));
        }
        const address = httpServer.address();
        serverAddress = `http://localhost:${address.port}`;
        console.log(`Servidor de prueba (chat) escuchando en ${serverAddress}`);

        await request(app).post(`${config.apiPrefix || '/api/v1'}/auth/register`).send(userACreds);
        await request(app).post(`${config.apiPrefix || '/api/v1'}/auth/register`).send(userBCreds);
        userA = await User.findOne({ email: userACreds.email }).lean();
        userB = await User.findOne({ email: userBCreds.email }).lean();
        tokenA = await loginUser(userACreds.email, userACreds.password);
        tokenB = await loginUser(userBCreds.email, userBCreds.password);
    }, 20000); // Timeout para beforeAll

    afterAll(async () => {
        if (socketA && socketA.connected) socketA.disconnect();
        if (socketB && socketB.connected) socketB.disconnect();
        if (httpServer.listening) {
            await new Promise(resolve => httpServer.close(resolve));
        }
    }, 20000);

    beforeEach((done) => {
        let socketsConnected = 0;
        const totalSocketsToConnect = 2;
        let errorOccurred = false;

        const checkDone = () => {
            if (errorOccurred) return;
            socketsConnected++;
            if (socketsConnected === totalSocketsToConnect) {
                done();
            }
        };
        const handleError = (socketName, err) => {
            if (!errorOccurred) {
                errorOccurred = true;
                console.error(`Socket ${socketName} connect_error:`, err.message, err.data);
                socketA?.disconnect(); // Intentar desconectar para limpiar
                socketB?.disconnect();
                done(err);
            }
        };

        socketA = ClientSocket(serverAddress, { auth: { token: tokenA }, transports: ['websocket'], forceNew: true, timeout: 5000 });
        socketB = ClientSocket(serverAddress, { auth: { token: tokenB }, transports: ['websocket'], forceNew: true, timeout: 5000 });

        socketA.on('connect', checkDone);
        socketB.on('connect', checkDone);
        socketA.on('connect_error', (err) => handleError('A', err));
        socketB.on('connect_error', (err) => handleError('B', err));
    });

    afterEach(() => {
        if (socketA) {
            socketA.removeAllListeners();
            if (socketA.connected) socketA.disconnect();
        }
        if (socketB) {
            socketB.removeAllListeners();
            if (socketB.connected) socketB.disconnect();
        }
    });

    // MARK: it
    it('Usuario A debería poder enviar un mensaje a Usuario B, y Usuario B lo recibe', (done) => {
        const messageContent = "Hola Usuario B!";
        const tempId = `temp_${Date.now()}`;

        socketB.once('newMessage', (data) => { // Usar 'once' para evitar múltiples llamadas si hay reemisiones
            expect(data.message.content).toBe(messageContent);
            expect(data.message.senderId._id.toString()).toBe(userA._id.toString());
            createdConversationId = data.message.conversationId.toString(); // Guardar como string
            done();
        });

        socketA.emit('sendMessageToUser', {
            receiverId: userB._id.toString(),
            content: messageContent,
            tempId,
            // conversationId: null // Opcional: Si es el primer mensaje, no se envía conversationId
        });

        socketA.once('messageSent', (data) => {
            expect(data.message.content).toBe(messageContent);
            expect(data.tempId).toBe(tempId);
        });
    }, 10000);

    // MARK: it
    it('Usuario B debería poder obtener el historial de la conversación creada (HTTP)', async () => {
        expect(createdConversationId).toBeDefined();
        const res = await request(app)
            .get(`${config.apiPrefix || '/api/v1'}/chat-api/${createdConversationId}/messages`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data[0].content).toBe("Hola Usuario B!");
    });

    // MARK: it
    it('Usuario B debería poder marcar la conversación como leída (HTTP)', async () => {
        expect(createdConversationId).toBeDefined();
        const res = await request(app)
            .post(`${config.apiPrefix || '/api/v1'}/chat-api/${createdConversationId}/mark-as-read`)
            .set('Authorization', `Bearer ${tokenB}`);

        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        const conversation = await Conversation.findById(createdConversationId).lean();
        const unreadEntryB = conversation.unreadCounts.find(uc => uc.userId.equals(userB._id));
        expect(unreadEntryB.count).toBe(0);
    });

    // MARK: it
    it('Usuario A debería recibir notificación de mensaje leído cuando B lo marca (Socket)', (done) => {
        expect(createdConversationId).toBeDefined();
        const messageContentForReadTest = "Mensaje para prueba de lectura específica";
        let messageIdForReadTest;

        socketA.emit('sendMessageToUser', {
            receiverId: userB._id.toString(),
            content: messageContentForReadTest,
            conversationId: createdConversationId // Enviar conversationId aquí
        });

        socketA.once('messageSent', (sentData) => {
            if (sentData.message.content === messageContentForReadTest) {
                messageIdForReadTest = sentData.message._id.toString();
                // Simular que el frontend de B emite markMessageAsRead
                socketB.emit('markMessageAsRead', {
                    messageId: messageIdForReadTest,
                    conversationId: createdConversationId,
                });
            }
        });

        socketA.once('messageRead', (readData) => { // Evento que UserSocketHandler emite a A
            if (readData.messageId === messageIdForReadTest) {
                expect(readData.readerId.toString()).toBe(userB._id.toString());
                expect(readData.conversationId.toString()).toBe(createdConversationId);
                done();
            }
        });
        // Escuchar también el ack del lado de B para asegurar que el proceso de marcar como leído ocurrió
        socketB.once('messageReadAck', (ackData) => {
            if (ackData.messageId === messageIdForReadTest) {
                // console.log("MessageReadAck received by B");
            }
        });
    });
});