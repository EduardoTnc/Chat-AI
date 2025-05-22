// jest.setup.js
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB } from './config/db.js';

let mongoServer;

beforeAll(async () => {
    console.log('jest.setup.js: Iniciando beforeAll global...');
    try {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        process.env.MONGODB_URI_FOR_JEST = mongoUri; // Establecer ANTES de llamar a connectDB

        // Llamar a tu connectDB centralizado, que ahora debería usar MONGODB_URI_FOR_JEST
        await connectDB();
        console.log('jest.setup.js: Conexión a MongoDB In-Memory establecida vía connectDB.');

    } catch (err) {
        console.error('jest.setup.js: Error en beforeAll al configurar MongoDB In-Memory:', err);
        // Comentado para que Jest reporte el error en lugar de salir abruptamente
        // process.exit(1);
        throw err; // Relanzar para que Jest falle el hook
    }
}, 120000); // Timeout de 120 segundos

beforeEach(async () => {
    // Solo proceder si la conexión está activa
    if (mongoose.connection.readyState === 1) { // 1 === connected
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            try {
                await collections[key].deleteMany({});
            } catch (e) {
                // Ignorar errores si la colección no existe o ya fue eliminada
                console.warn(`Advertencia limpiando ${key}: ${e.message}`);
            }
        }
    } else {
        console.warn("jest.setup.js - beforeEach: Mongoose no está conectado, omitiendo limpieza de colecciones.");
    }
});

afterAll(async () => {
    console.log('jest.setup.js: Iniciando afterAll global...');
    try {
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
            console.log('jest.setup.js: MongoDB In-Memory desconectado y servidor detenido.');
        } else {
            console.warn('jest.setup.js: mongoServer no estaba definido en afterAll, posible error en beforeAll global.');
        }
    } catch (err) {
        console.error('jest.setup.js: Error en afterAll global:', err);
    }
}, 30000); // Timeout de 30 segundos