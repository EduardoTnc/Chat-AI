import mongoose from 'mongoose';

/**
 * Esquema de MongoDB para la configuración de modelos de IA.
 * Guarda metadatos y parámetros de configuración de cada modelo,
 * como su identificador único, nombre amigable, proveedor, 
 * identificador API, visibilidad para los clientes, roles permitidos,
 * y soporte para herramientas.
 * @typedef {import('mongoose').Document & {
 *   modelId: string; // Identificador único interno, ej: "gpt-4-turbo-preview", "ollama-llama3.2:3b"
 *   provider: 'openai' | 'ollama' | 'custom'; // De dónde viene el modelo
 *   name: string; // Nombre amigable para mostrar en la UI
 *   apiIdentifier: string; // Nombre/ID que usa la API del proveedor
 *   systemPrompt: string; // Prompt del sistema para el modelo
 *   isVisibleToClient: boolean; // Si los clientes finales pueden seleccionar este modelo
 *   allowedRoles: Array<'user' | 'agent' | 'admin'>; // Roles que pueden usar este modelo
 *   supportsTools: boolean; // Si el modelo soporta herramientas (function calling)
 *   isActive: boolean; // Si el modelo está activo y disponible para su uso
 *   description: string; // Descripción del modelo para mostrar en la UI
 *   isDefault: boolean; // Si este es el modelo predeterminado para nuevos usuarios
 *   apiKeyRef: mongoose.Types.ObjectId; // Referencia a la API key en ApiKeyStore
 * }} AIModelConfig
 */
const aiModelConfigSchema = new mongoose.Schema({
    // Identificador único interno, ej: "gpt-4-turbo-preview", "ollama-llama3.2:3b"
    modelId: {
        type: String,
        required: [true, 'El ID del modelo es obligatorio'],
        unique: true,
        trim: true,
        minlength: [3, 'El ID del modelo debe tener al menos 3 caracteres'],
        maxlength: [100, 'El ID del modelo no puede tener más de 100 caracteres']
    },
    // De dónde viene el modelo
    provider: {
        type: String,
        enum: {
            values: ['openai', 'ollama', 'custom'],
            message: 'Proveedor no válido. Debe ser openai, ollama o custom.'
        },
        required: [true, 'El proveedor es obligatorio'],
        validate: {
            // Validar que si el proveedor no es 'custom', debe tener una API key asociada
            validator: async function(provider) {
                if (provider === 'custom') return true;
                return !!this.apiKeyRef;
            },
            message: 'Los modelos que no son personalizados deben tener una API key asociada.'
        }
    },
    // Referencia a la API key en ApiKeyStore
    apiKeyRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApiKeyStore',
        required: [
            function() { return this.provider !== 'custom'; },
            'La API key es obligatoria para modelos que no son personalizados'
        ]
    },
    // Nombre amigable para mostrar en la UI
    name: {
        type: String,
        required: [true, 'El nombre es obligatorio'],
        trim: true,
        minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
        maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
    },
    // Nombre/ID que usa la API del proveedor
    apiIdentifier: {
        type: String,
        required: [true, 'El identificador de la API es obligatorio'],
        trim: true,
        minlength: [3, 'El identificador de la API debe tener al menos 3 caracteres'],
        maxlength: [200, 'El identificador de la API no puede tener más de 200 caracteres']
    },
    // Prompt del sistema para el modelo
    systemPrompt: {
        type: String,
        default: 'Eres un asistente de IA que responde a las preguntas de los usuarios.',
        trim: true,
        maxlength: [10000, 'El prompt del sistema no puede tener más de 10000 caracteres']
    },
    // Si los clientes finales pueden seleccionar este modelo
    isVisibleToClient: {
        type: Boolean,
        default: true
    },
    // Roles de usuario que pueden ver/usar este modelo
    allowedRoles: [{
        type: String,
        enum: {
            values: ['user', 'agent', 'admin'],
            message: 'Rol no válido. Debe ser user, agent o admin.'
        },
        required: [true, 'Al menos un rol debe ser especificado']
    }],
    // Si el modelo soporta herramientas (function calling)
    supportsTools: {
        type: Boolean,
        default: false
    },
    // Si el modelo está activo y disponible para su uso
    isActive: {
        type: Boolean,
        default: true
    },
    // Descripción del modelo para mostrar en la UI
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
    },
    // Si este es el modelo predeterminado para nuevos usuarios
    isDefault: {
        type: Boolean,
        default: false
    },
    // Fecha de creación y actualización
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

const AIModelConfig = mongoose.model('AIModelConfig', aiModelConfigSchema);

export default AIModelConfig;