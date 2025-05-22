// server/__tests__/auth.integration.test.js
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app.js';
import User from '../models/User.js';
import config from '../config/index.js';

describe('Auth Endpoints', () => {
    const agent = request.agent(app);
    let testUserCredentials = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
    };
    let accessToken;
    let userId;

    //? El beforeEach y afterAll de jest.setup.js manejan la DB y el mongoServer
    
    // Antes de ejecutar las pruebas, asegurar que la base de datos está limpia
    beforeAll(async () => {
        // Limpiar completamente la colección de usuarios para evitar conflictos
        await User.deleteMany({});
        console.error('Base de datos limpia para pruebas de auth');
    });

    // MARK: register
    /**
     * Verificar que se pueda registrar un usuario con credenciales válidas y
     * recibir un token de acceso y un refresh token como cookie.
     *
     * Verificar que el refresh token se estableció como una cookie HttpOnly
     * con el path correcto.
     *
     * Verificar que no se pueda registrar un usuario con un email existente
     * y recibir un mensaje de error adecuado.
     */
    describe('POST /api/v1/auth/register', () => {
        it('debería registrar un nuevo usuario y devolver un token', async () => {
            const res = await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/register`)
                .send(testUserCredentials);

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body.user.email).toBe(testUserCredentials.email);
            accessToken = res.body.accessToken;
            userId = res.body.user._id;

            // Verificar que el refresh token se estableció como cookie
            const refreshTokenCookie = res.headers['set-cookie'].find(cookie =>
                cookie.startsWith(`${config.jwt.refreshCookieName}=`)
            );
            expect(refreshTokenCookie).toBeDefined();
            expect(refreshTokenCookie).toContain('HttpOnly');
            expect(refreshTokenCookie).toContain(`Path=${config.apiPrefix || '/api/v1'}/auth/refresh-token`);
        });

        it('no debería registrar un usuario con un email existente', async () => {
            // Primero, registramos un usuario para asegurar que existe
            await request(app)
                .post(`${config.apiPrefix || '/api/v1'}/auth/register`)
                .send(testUserCredentials);
                
            // Luego intentamos registrar otro con el mismo email
            const res = await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/register`)
                .send(testUserCredentials);
                
            // Verificamos que falle, ya sea con 400 o 409 (dependiendo de la implementación)
            expect([400, 409]).toContain(res.statusCode);
            expect(res.body.success).toBe(false);
        });
    });

    // MARK: login
    /**
     * Verificar que se pueda iniciar sesión con credenciales válidas y recibir
     * un token de acceso y un refresh token como cookie.
     *
     * Verificar que el refresh token se estableció como una cookie HttpOnly
     * con el path correcto.
     */
    describe('POST /api/v1/auth/login', () => {
        it('debería iniciar sesión con credenciales correctas y devolver tokens', async () => {
            // Ensure user is clean then register them freshly for this specific test
            console.error('[Login Test] Starting test. Initial testUserCredentials:', JSON.stringify(testUserCredentials));
            await User.deleteMany({ email: testUserCredentials.email });
            console.error('[Login Test] Attempting registration with credentials:', JSON.stringify(testUserCredentials));
            const regRes = await request(app) // Use plain request for this setup registration
                .post(`${config.apiPrefix || '/api/v1'}/auth/register`)
                .send(testUserCredentials);
            
            console.error('[Login Test] Registration attempt response status:', regRes.statusCode);
            console.error('[Login Test] Registration attempt response body:', JSON.stringify(regRes.body));
            if (regRes.statusCode !== 201) {
                console.error('Registration failed in login test setup:', regRes.body);
            }
            expect(regRes.statusCode).toBe(201); // Ensure setup registration was successful

            // Update global userId from this specific registration, as 'me' test might use it.
            userId = regRes.body.user._id;

            console.error('[Login Test] Attempting login with credentials:', JSON.stringify({ email: testUserCredentials.email, password: testUserCredentials.password }));
            const res = await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/login`)
                .send({ email: testUserCredentials.email, password: testUserCredentials.password });

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('user');
            expect(res.body).toHaveProperty('accessToken');
            accessToken = res.body.accessToken; // Update global accessToken for subsequent tests

            const refreshTokenCookie = res.headers['set-cookie'].find(cookie =>
                cookie.startsWith(`${config.jwt.refreshCookieName}=`)
            );
            expect(refreshTokenCookie).toBeDefined();
        });

        it('no debería iniciar sesión con contraseña incorrecta', async () => {
            const res = await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/login`)
                .send({ email: testUserCredentials.email, password: 'wrongpassword' });
            expect(res.statusCode).toEqual(401);
            expect(res.body.success).toBe(false);
        });
    });

    // MARK: refresh-token
    /**
     * Verificar que se pueda obtener un nuevo access token usando un refresh token válido
     * de la cookie.
     *
     * Verificar que la cookie de refresh token se actualice correctamente.
     */
    describe('POST /api/v1/auth/refresh-token', () => {
        it('debería devolver un nuevo access token usando un refresh token válido de la cookie', async () => {
            // Asegurarse que el login anterior estableció la cookie
            await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/login`)
                .send({ email: testUserCredentials.email, password: testUserCredentials.password });

            const res = await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/refresh-token`)
                .send(); // No necesita body, la cookie se envía automáticamente por el agent

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body.accessToken).not.toBe(accessToken); // Debe ser un nuevo token
            accessToken = res.body.accessToken;

            // Verificar que se envió una nueva cookie de refresh token (si hay rotación)
            const newRefreshTokenCookie = res.headers['set-cookie'].find(cookie =>
                cookie.startsWith(`${config.jwt.refreshCookieName}=`)
            );
            expect(newRefreshTokenCookie).toBeDefined();
        });

        it('no debería devolver un access token si no hay refresh token en cookie', async () => {
            const plainAgent = request(app); // Un agent sin cookies
            const res = await plainAgent
                .post(`${config.apiPrefix || '/api/v1'}/auth/refresh-token`)
                .send();
            expect(res.statusCode).toEqual(401); // O 403 dependiendo de tu implementación
        });
    });

    // MARK: me
    /**
     * Verificar que se pueda obtener los datos del usuario autenticado
     * usando un token de acceso válido.
     *
     * Verificar que se devuelvan los datos del usuario autenticado.
     */
    describe('GET /api/v1/auth/me', () => {
        it('debería devolver los datos del usuario autenticado', async () => {
            // Asegurar que accessToken está definido (ej. después de login o refresh)
            if (!accessToken) {
                 const loginRes = await agent
                    .post(`${config.apiPrefix || '/api/v1'}/auth/login`)
                    .send({ email: testUserCredentials.email, password: testUserCredentials.password });
                accessToken = loginRes.body.accessToken;
            }

            const res = await agent
                .get(`${config.apiPrefix || '/api/v1'}/auth/me`)
                .set('Authorization', `Bearer ${accessToken}`);

            console.log('Token enviado en /auth/me:', accessToken);
            console.log('Respuesta de /auth/me status:', res.statusCode);
            console.log('Respuesta de /auth/me body:', JSON.stringify(res.body));
            
            expect(res.statusCode).toEqual(200);
            expect(res.body.user._id.toString()).toBe(userId.toString()); // Comparar como strings
        });

        it('no debería devolver datos si no hay token de acceso', async () => {
            const res = await agent
                .get(`${config.apiPrefix || '/api/v1'}/auth/me`);
            expect(res.statusCode).toEqual(401);
        });
    });

    // MARK: logout
    /**
     * Verificar que se pueda cerrar sesión y limpiar la cookie de refresh token.
     *
     * Verificar que la cookie de refresh token se limpie correctamente.
     */
    describe('POST /api/v1/auth/logout', () => {
        it('debería cerrar sesión y limpiar la cookie de refresh token', async () => {
            // Primero, asegurar que estamos logueados y tenemos una cookie
            await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/login`)
                .send({ email: testUserCredentials.email, password: testUserCredentials.password });

            const res = await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/logout`)
                .send();

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);

            // Verificar que la cookie fue limpiada (expires en el pasado o Max-Age=0)
            const clearedCookie = res.headers['set-cookie'].find(cookie =>
                cookie.startsWith(`${config.jwt.refreshCookieName}=;`) && (cookie.includes('Max-Age=0') || cookie.includes('Expires=Thu, 01 Jan 1970'))
            );
            expect(clearedCookie).toBeDefined();

            // Intentar usar refresh token después de logout debería fallar
            const refreshRes = await agent
                .post(`${config.apiPrefix || '/api/v1'}/auth/refresh-token`)
                .send();
            // El test debe pasar con 401 o 403, ambos son valores válidos dependiendo de la implementación
            expect([401, 403]).toContain(refreshRes.statusCode);
        });
    });
});