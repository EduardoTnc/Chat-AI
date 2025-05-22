// server/__tests__/aiChat.integration.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import { io as ClientSocket } from 'socket.io-client';
import app from '../app.js';
import { httpServer } from '../server.js';
import config from '../config/index.js';
import { AGENT_ROOM } from '../chat-module/socketHandlers/index.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import AIModelConfig from '../models/AIModelConfig.js';
// Asegurarse de que jest esté disponible en este contexto
import { jest } from '@jest/globals';


// MARK: Mocking de los Proveedores de IA
// Usar jest.mock tradicional que es más estable
const mockOpenAIGenerate = jest.fn().mockImplementation((messages, systemPrompt, modelApiIdentifier) => {
    return Promise.resolve({
        content: "Respuesta simulada para testing",
        toolCalls: [],
        usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
    });
});

jest.mock('../chat-module/providers/OpenAIProvider.js', () => {
    return jest.fn().mockImplementation(() => {
        return { 
            generate: mockOpenAIGenerate, 
            listModels: jest.fn().mockResolvedValue([]) 
        };
    });
});

// No necesitamos mockear OllamaProvider si no se usa en este test

// No necesitamos Dynamic Imports ahora que importamos directamente

/**
 * Prueba el flujo de chat con IA usando tool calling (escalación):
 * - Un usuario envía un mensaje a la IA.
 * - La IA decide escalar a un agente humano.
 * - La IA envía un mensaje al usuario indicando que está escalando.
 * - La IA envía una llamada de herramienta al servidor para escalar la conversación.
 * - El servidor envía una notificación a AGENT_ROOM.
 * - Un agente (simulado por un socket) recibe la notificación y se conecta a la conversación.
 * - La IA envía un mensaje final al usuario confirmando la escalación.
 * - El usuario recibe el mensaje final y la conversación se marca como pending_agent.
 * - La prueba verifica que la conversación está marcada como pending_agent y que los metadatos contienen los detalles de la escalación.
 */
describe('AI Chat Flow with Tool Calling (Escalation)', () => {
    // ... (resto del test como antes, asegurando que las variables app, httpServer, etc., se usan correctamente)
    // ... (el código de beforeAll, afterAll, beforeEach, afterEach y los 'it' blocks se mantienen)
    // ... asegúrate de que el inicio del httpServer en beforeAll usa la variable httpServer importada.

    let userCreds = { name: 'AI User', email: 'aiuser@example.com', password: 'passwordAI' };
    let testUser, token;
    let socketClient;
    let serverAddress;
    let testModelId = 'test-openai-model-for-escalation'; // Sigue siendo el ID de sistema para AIModelConfig
    let agentSocket;
    let agentToken;

    // MARK: beforeAll
    beforeAll(async () => {
        // El httpServer debe estar importado directamente
        if (!httpServer.listening) {
            await new Promise(resolve => httpServer.listen(0, resolve));
        }

        const address = httpServer.address();
        serverAddress = `http://localhost:${address.port}`;
        console.log(`Servidor de prueba (AI chat) escuchando en ${serverAddress}`);

        await request(app).post(`${config.apiPrefix || '/api/v1'}/auth/register`).send(userCreds);
        await request(app).post(`${config.apiPrefix || '/api/v1'}/auth/register`).send({ name: 'Test Agent', email: 'agent@example.com', password: 'passwordAgent', role: 'agent' });

        testUser = await User.findOne({ email: userCreds.email }).lean();
        const loginRes = await request(app).post(`${config.apiPrefix || '/api/v1'}/auth/login`).send({ email: userCreds.email, password: userCreds.password });
        token = loginRes.body.accessToken;

        const agentLoginRes = await request(app).post(`${config.apiPrefix || '/api/v1'}/auth/login`).send({ email: 'agent@example.com', password: 'passwordAgent' });
        agentToken = agentLoginRes.body.accessToken;


        await AIModelConfig.create({ // Usa el AIModelConfig importado dinámicamente
            modelId: testModelId,
            provider: 'openai', // El mock se aplicará a este provider
            name: 'Test Escalation Model',
            apiIdentifier: 'gpt-mock-escalate',
            isVisibleToClient: true,
            supportsTools: true,
        });
    }, 45000); // Timeout para este beforeAll específico del describe

    // MARK: afterAll
    // ... (resto de afterAll, beforeEach, afterEach, y el 'it' block)
    afterAll(async () => {
        if (socketClient && socketClient.connected) socketClient.disconnect();
        if (agentSocket && agentSocket.connected) agentSocket.disconnect();
        if (httpServer && httpServer.listening) {
            await new Promise(resolve => httpServer.close(resolve));
        }
    }, 20000);

    // MARK: beforeEach
    beforeEach((done) => {
        mockOpenAIGenerate.mockClear(); // Limpiar el mock específico
        let socketsConnected = 0;
        const totalSocketsToConnect = 2;
        let errorOccurred = false;

        const checkDone = () => { if (++socketsConnected === totalSocketsToConnect && !errorOccurred) done(); };
        const handleError = (name, err) => { if (!errorOccurred) { errorOccurred = true; done(err); } };

        socketClient = ClientSocket(serverAddress, { auth: { token }, transports: ['websocket'], forceNew: true, timeout: 5000 });
        agentSocket = ClientSocket(serverAddress, { auth: { token: agentToken }, transports: ['websocket'], forceNew: true, timeout: 5000 });

        socketClient.on('connect', checkDone);
        agentSocket.on('connect', checkDone);
        socketClient.on('connect_error', (err) => handleError('UserClient', err));
        agentSocket.on('connect_error', (err) => handleError('AgentClient', err));
    });

    // MARK: afterEach
    afterEach(() => {
        if (socketClient) {
            socketClient.removeAllListeners();
            if (socketClient.connected) socketClient.disconnect();
        }
        if (agentSocket) {
            agentSocket.removeAllListeners();
            if (agentSocket.connected) agentSocket.disconnect();
        }
    });

    // MARK: it
    // ... (el test 'it' se mantiene igual)
    it('debería escalar a un agente y notificar a la AGENT_ROOM', (done) => {
        const userMessageContent = "Necesito ayuda de un humano, por favor.";
        const tempId = `temp_ai_escalate_${Date.now()}`;
        let conversationId;
        
        // Limpiar cualquier configuración previa del mock
        mockOpenAIGenerate.mockReset();
        
        // Configurar las respuestas simuladas de la IA
        mockOpenAIGenerate
            .mockImplementationOnce(() => Promise.resolve({
                content: null,
                toolCalls: [{
                    id: 'tool_call_escalate_123', 
                    type: 'function',
                    function: { 
                        name: 'escalate_to_human_agent', 
                        arguments: JSON.stringify({ reason: "Usuario solicita humano", urgency: "high" }) 
                    }
                }],
                usage: { promptTokens: 10, completionTokens: 10, totalTokens: 20 }
            }))
            .mockImplementationOnce(() => Promise.resolve({
                content: "He iniciado el proceso para conectarte con un agente.",
                toolCalls: [],
                usage: { promptTokens: 30, completionTokens: 15, totalTokens: 45 }
            }));

        const promises = [
            new Promise(resolve => socketClient.once('userMessageToIASent', (data) => {
                conversationId = data.message.conversationId.toString();
                resolve();
            })),
            new Promise(resolve => socketClient.once('escalationInProgress', resolve)),
            new Promise(resolve => socketClient.once('newMessageFromIA', (data) => {
                if (data.message.content.includes("He iniciado el proceso")) resolve();
            })),
            new Promise(resolve => agentSocket.once('newEscalatedChat', (data) => {
                // Esta aserción fallará si conversationId no se ha seteado a tiempo.
                // Es mejor validar conversationId dentro del Promise.all.
                resolve(data); // Resolve con los datos para validar después
            }))
        ];

        socketClient.emit('sendMessageToIA', {
            modelId: testModelId,
            content: userMessageContent,
            tempId,
        });

        Promise.all(promises)
            .then(async (results) => {
                const escalationData = results[3]; // Resultado de newEscalatedChat
                expect(escalationData.conversationId).toBe(conversationId); // Ahora conversationId está definido
                expect(escalationData.reason).toBe("Usuario solicita humano");

                const conv = await Conversation.findById(conversationId).lean();
                expect(conv.status).toBe('pending_agent');
                done();
            })
            .catch(done);

    }, 20000);
});