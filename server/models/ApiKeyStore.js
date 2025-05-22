import mongoose from 'mongoose';
// Podrías usar una librería de encriptación simple si no quieres dependencias pesadas
// o integrar con servicios de gestión de secretos en producción.
// Para este ejemplo, no implementaremos la encriptación aquí, pero es CRUCIAL en producción.
// import crypto from 'crypto'; // Para encriptación básica (ejemplo)

/**
 * Esquema de MongoDB para la configuración de API Keys.
 * Almacena el identificador único del proveedor, la API Key encriptada,
 * y una descripción opcional. La API Key se encripta antes de guardarla,
 * y se desencripta solo cuando se necesita.
 */
const apiKeyStoreSchema = new mongoose.Schema({
    provider: { // Identificador único del proveedor, ej: "OpenAI", "GoogleVertexAI"
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    apiKeyEncrypted: { // La API Key, ENCRIPTADA
        type: String,
        required: true,
    },
    // IV (Initialization Vector) si usas cifrado simétrico como AES
    // iv: { type: String },
    description: { // Descripción opcional
        type: String,
        trim: true,
    }
}, { timestamps: true });

// // Ejemplo MUY BÁSICO de encriptación/desencriptación (NO USAR EN PRODUCCIÓN TAL CUAL)
// // Se necesitaría una clave de encriptación segura gestionada fuera del código.
// const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY; // Debe ser de 32 bytes para AES-256
// const IV_LENGTH = 16;

// apiKeyStoreSchema.methods.encryptApiKey = function(apiKey) {
//     if (!ENCRYPTION_KEY) throw new Error("Encryption key not set for API keys.");
//     const iv = crypto.randomBytes(IV_LENGTH);
//     const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
//     let encrypted = cipher.update(apiKey);
//     encrypted = Buffer.concat([encrypted, cipher.final()]);
//     this.iv = iv.toString('hex');
//     return encrypted.toString('hex');
// };

// apiKeyStoreSchema.methods.decryptApiKey = function() {
//     if (!ENCRYPTION_KEY) throw new Error("Encryption key not set for API keys.");
//     if (!this.iv) throw new Error("IV not found for decryption.");
//     const iv = Buffer.from(this.iv, 'hex');
//     const encryptedText = Buffer.from(this.apiKeyEncrypted, 'hex');
//     const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
//     let decrypted = decipher.update(encryptedText);
//     decrypted = Buffer.concat([decrypted, decipher.final()]);
//     return decrypted.toString();
// };

// apiKeyStoreSchema.pre('save', function(next) {
//     if (this.isModified('apiKeyEncrypted') && this.apiKeyEncrypted && !this.iv) {
//         // Si se guarda directamente la apiKeyEncrypted sin pasar por el método de encriptación
//         // (por ejemplo, si ya viene encriptada de otro lado o es un placeholder)
//         // Aquí deberías asegurarte que está encriptada o encriptarla.
//         // Para el ejemplo, asumimos que se llama `this.apiKeyEncrypted = this.encryptApiKey(plainApiKey)` antes.
//     }
//     next();
// });


const ApiKeyStore = mongoose.model('ApiKeyStore', apiKeyStoreSchema);

export default ApiKeyStore;