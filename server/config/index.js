import 'dotenv/config';
const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
    env: nodeEnv,
    port: process.env.PORT || 5001, // Ajustado al puerto de tu server.js
    mongodbUri: process.env.MONGODB_URI,
    jwt: {
        secret: process.env.JWT_SECRET,
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        refreshCookieName: 'jid_refresh_token', // Nombre de la cookie para el refresh token
    },
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    },
    // Clave para encriptar API Keys (¡MUY IMPORTANTE!)
    // Debe ser una cadena aleatoria y segura, idealmente de buena longitud.
    apiKeyEncryptionSecret: process.env.API_KEY_ENCRYPTION_SECRET,
    corsOptions: {
        // origin: process.env.CLIENT_URL || 'http://localhost:5173',
        origin: '*', // Acepta todas las origenes (solo para desarrollo)
        credentials: true, // Importante para cookies
    }
};

// Validaciones
if (!config.jwt.secret) throw new Error("FATAL ERROR: JWT_SECRET no está definida.");
if (!config.apiKeyEncryptionSecret) throw new Error("FATAL ERROR: API_KEY_ENCRYPTION_SECRET no está definida para encriptar API Keys.");
if (!config.mongodbUri && nodeEnv !== 'test') { // Solo requerir MONGODB_URI si no es test (ya que test usa MONGODB_URI_FOR_JEST)
    throw new Error("FATAL ERROR: MONGODB_URI no está definida para el entorno de producción/desarrollo.");
}

export default config;