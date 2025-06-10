import mongoose from 'mongoose';

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


const ApiKeyStore = mongoose.model('ApiKeyStore', apiKeyStoreSchema);

export default ApiKeyStore;