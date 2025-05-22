import mongoose from 'mongoose';

/**
 * Esquema de MongoDB para la configuración de modelos de IA.
 * Guarda metadatos y parámetros de configuración de cada modelo,
 * como su identificador único, nombre amigable, proveedor, 
 * identificador API, visibilidad para los clientes, roles permitidos,
 * soporte para herramientas y límites de tokens de entrada y salida.
 * @typedef {import('mongoose').Document & {
 *   modelId: string;
 *   provider: 'openai' | 'ollama' | 'custom';
 *   name: string;
 *   apiIdentifier: string;
 *   systemPrompt: string;
 *   isVisibleToClient: boolean;
 *   allowedRoles: Array<'user' | 'agent' | 'admin'>;
 *   supportsTools: boolean;
 *   maxInputTokens: number;
 *   maxOutputTokens: number;
 * }} AIModelConfig
 */
const aiModelConfigSchema = new mongoose.Schema({
    modelId: { //? Identificador único interno, ej: "gpt-4-turbo-preview", "ollama-llama3.2:3b"
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    provider: { //? De dónde viene el modelo
        type: String,
        enum: ['openai', 'ollama', 'custom'], // 'custom' para modelos locales no Ollama
        required: true,
    },
    name: { //? Nombre amigable para mostrar en la UI, ej: "GPT-4 Turbo", "Llama 3.2 (3B)"
        type: String,
        required: true,
        trim: true,
    },
    apiIdentifier: { //? Nombre/ID que usa la API del proveedor, ej: "gpt-4-turbo-preview", "llama3.2:3b"
        type: String,
        required: true,
        trim: true,
    },
    systemPrompt: {
        type: String,
        default: "Eres un asistente de IA que responde a las preguntas de los usuarios.",
        trim: true,
    },
    isVisibleToClient: { //? Si los clientes finales pueden seleccionar este modelo
        type: Boolean,
        default: true,
    },
    allowedRoles: [{ //? Qué roles de usuario pueden ver/usar este modelo (admin, agent, user)
        type: String,
        enum: ['user', 'agent', 'admin'],
    }],
    supportsTools: { //? Si el modelo soporta "tools" (Ollama) o "function calling" (OpenAI)
        type: Boolean,
        default: false,
    },
    maxInputTokens: { Number }, //? Límite de tokens de entrada (informativo)
    maxOutputTokens: { Number }, //? Límite de tokens de salida (informativo o para configurar al proveedor)
    // Otros parámetros específicos del modelo que se puedan configurar
    // modelParameters: {
    //    temperature: Number,
    //    topP: Number,
    // }
    // apiKeyStoreProviderRef: String, // Si este modelo usa una API Key de ApiKeyStore (ej. "OpenAI")
}, { timestamps: true });

const AIModelConfig = mongoose.model('AIModelConfig', aiModelConfigSchema);

export default AIModelConfig;