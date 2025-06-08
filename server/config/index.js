import 'dotenv/config';
const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
    env: nodeEnv,
    port: process.env.PORT || 5001,
    mongodbUri: process.env.MONGODB_URI,
    jwt: {
        secret: process.env.JWT_SECRET,
        // Parsear a entero ya que en .env estarán en milisegundos
        accessExpiresIn: parseInt(process.env.JWT_ACCESS_EXPIRES_IN || '900000'), // 15 minutos en ms
        refreshExpiresIn: parseInt(process.env.JWT_REFRESH_EXPIRES_IN || '604800000'), // 7 días en ms
        refreshCookieName: 'jid_refresh_token',
    },
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
    apiKeyEncryptionSecret: process.env.API_KEY_ENCRYPTION_SECRET,
    corsOptions: {
        origin: [process.env.CLIENT_URL, "http://localhost:5173", "http://localhost:5174" ],
        credentials: true,
    }
};

console.log("Raw JWT_ACCESS_EXPIRES_IN from .env:", process.env.JWT_ACCESS_EXPIRES_IN);
console.log("Raw JWT_REFRESH_EXPIRES_IN from .env:", process.env.JWT_REFRESH_EXPIRES_IN);
console.log("Access Expires In (ms):", config.jwt.accessExpiresIn);
console.log("Refresh Expires In (ms):", config.jwt.refreshExpiresIn);

// Validaciones
if (!config.jwt.secret) throw new Error("FATAL ERROR: JWT_SECRET no está definida.");
if (!config.apiKeyEncryptionSecret) throw new Error("FATAL ERROR: API_KEY_ENCRYPTION_SECRET no está definida para encriptar API Keys.");
if (!config.mongodbUri && nodeEnv !== 'test') { 
    throw new Error("FATAL ERROR: MONGODB_URI no está definida para el entorno de producción/desarrollo.");
}

export default config;