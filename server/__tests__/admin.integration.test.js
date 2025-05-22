// server/__tests__/admin.integration.test.js
import request from 'supertest';
// import mongoose from 'mongoose'; // No necesitas mongoose aquí directamente si no haces queries directas
import app from '../app.js';
import User from '../models/User.js'; // Para el beforeAll, para asegurar la creación
import AIModelConfig from '../models/AIModelConfig.js';
import config from '../config/index.js';

describe('Admin Endpoints - AI Model Configuration', () => {
    let adminToken;
    let adminUserFromDB; // Para guardar el usuario creado
    let createdModelInternalId;
    const modelSystemId = 'test-admin-model-id';
    const adminCredentials = {
        name: 'Admin User Test',
        email: 'admintest@example.com',
        password: 'adminpassword123', // Contraseña en texto plano
        role: 'admin',
    };

    // MARK: beforeAll
    beforeAll(async () => {
        // 1. Primero registramos un usuario admin usando la API (esto asegura el hash correcto)
        const registerRes = await request(app)
            .post(`${config.apiPrefix || '/api/v1'}/auth/register`)
            .send(adminCredentials);
            
        expect(registerRes.statusCode).toBe(201);
        expect(registerRes.body).toHaveProperty('accessToken');
        
        // 2. Asegurar que el usuario sea admin (puede ser que el registro no lo haga admin por defecto)
        adminUserFromDB = await User.findOne({ email: adminCredentials.email });
        expect(adminUserFromDB).toBeDefined();
        
        if (adminUserFromDB.role !== 'admin') {
            // Actualizar manualmente el rol a admin si es necesario
            await User.updateOne({ email: adminCredentials.email }, { role: 'admin' });
            adminUserFromDB = await User.findOne({ email: adminCredentials.email });
        }
        
        // 3. Login para obtener el token de admin
        const loginRes = await request(app)
            .post(`${config.apiPrefix || '/api/v1'}/auth/login`)
            .send({ email: adminCredentials.email, password: adminCredentials.password });
        
        if (loginRes.statusCode !== 200) console.error('Error en login de Admin en beforeAll:', loginRes.body);
        expect(loginRes.statusCode).toBe(200);
        adminToken = loginRes.body.accessToken;
        expect(adminToken).toBeDefined();
    });

    // MARK: it
    it('POST /api/v1/admin-api/ai-models - Debería crear una nueva configuración de modelo IA', async () => {
        expect(adminToken).toBeDefined(); // Asegurar que tenemos un token antes de usarlo
        const newModelData = {
            modelId: modelSystemId, // ID de sistema único
            provider: 'ollama',
            name: 'Admin Test Model',
            apiIdentifier: 'admin-test-ollama',
            systemPrompt: 'You are an admin test model.',
            isVisibleToClient: false,
            supportsTools: false,
        };
        const res = await request(app)
            .post(`${config.apiPrefix || '/api/v1'}/admin-api/ai-models`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(newModelData);

        if (res.statusCode !== 201) console.error('Error en POST /ai-models:', res.body);
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.modelId).toBe(newModelData.modelId);
        createdModelInternalId = res.body.data._id; // Guardar el _id de mongo
    });

    // MARK: it
    it('GET /api/v1/admin-api/ai-models - Debería obtener todas las configuraciones de modelos IA', async () => {
        expect(adminToken).toBeDefined(); // Asegurar que tenemos un token antes de usarlo

        // Crear un modelo para asegurar que la lista no esté vacía
        await AIModelConfig.create({ modelId: "temp-for-get-all", provider: 'ollama', name: 'Temp', apiIdentifier: 'temp' });

        const res = await request(app)
            .get(`${config.apiPrefix || '/api/v1'}/admin-api/ai-models`)
            .set('Authorization', `Bearer ${adminToken}`);
        if (res.statusCode !== 200) console.error('Error en GET /ai-models:', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some(m => m.modelId === modelSystemId)).toBe(true);
    });

    // MARK: it
    it('GET /api/v1/admin-api/ai-models/:internalId - Debería obtener una configuración específica por _id', async () => {
        expect(createdModelInternalId).toBeDefined();
        const res = await request(app)
            .get(`${config.apiPrefix || '/api/v1'}/admin-api/ai-models/${createdModelInternalId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        if (res.statusCode !== 200) console.error('Error en GET /ai-models/:internalId:', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.modelId).toBe(modelSystemId);
    });

    // MARK: it
    it('PUT /api/v1/admin-api/ai-models/:internalId - Debería actualizar una configuración de modelo IA', async () => {
        expect(createdModelInternalId).toBeDefined();
        const updates = { isVisibleToClient: true, systemPrompt: "Updated prompt." };
        const res = await request(app)
            .put(`${config.apiPrefix || '/api/v1'}/admin-api/ai-models/${createdModelInternalId}`)
            .set('Authorization', `Bearer ${adminToken}`)
            .send(updates);

        if (res.statusCode !== 200) console.error('Error en PUT /ai-models/:internalId:', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.isVisibleToClient).toBe(true);
        expect(res.body.data.systemPrompt).toBe("Updated prompt.");
    });

    // MARK: it
    it('DELETE /api/v1/admin-api/ai-models/:internalId - Debería eliminar una configuración de modelo IA', async () => {
        expect(createdModelInternalId).toBeDefined();
        const res = await request(app)
            .delete(`${config.apiPrefix || '/api/v1'}/admin-api/ai-models/${createdModelInternalId}`)
            .set('Authorization', `Bearer ${adminToken}`);

        if (res.statusCode !== 200) console.error('Error en DELETE /ai-models/:internalId:', res.body);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/eliminada exitosamente/i);

        const checkRes = await request(app)
            .get(`${config.apiPrefix || '/api/v1'}/admin-api/ai-models/${createdModelInternalId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        if (checkRes.statusCode !== 404) console.error('Error en GET /ai-models/:internalId (check):', checkRes.body);
        expect(checkRes.statusCode).toBe(404); // Ya no debería existir
    });
});