import mongoose from 'mongoose';

/**
 * Esquema de MongoDB para la configuración de API Keys.
 * Almacena el identificador único del proveedor, la API Key encriptada,
 * y una descripción opcional. La API Key se encripta antes de guardarla,
 * y se desencripta solo cuando se necesita.
 * 
 * @typedef {import('mongoose').Document & {
 *   provider: 'openai' | 'ollama' | string; // Tipo de proveedor
 *   apiKeyEncrypted: string; // API Key encriptada
 *   description?: string; // Descripción opcional
 *   usedByModels: mongoose.Types.ObjectId[]; // Referencia a los modelos que usan esta key
 *   isActive: boolean; // Si la key está activa
 *   lastUsedAt?: Date; // Último uso registrado
 *   usageCount: number; // Contador de usos
 * }} ApiKeyStore
 */
const apiKeyStoreSchema = new mongoose.Schema({
    // Identificador del proveedor (debe coincidir con los proveedores de AIModelConfig)
    provider: {
        type: String,
        required: [true, 'El proveedor es obligatorio'],
        trim: true,
        lowercase: true,
        enum: {
            values: ['openai', 'ollama', 'custom'],
            message: 'Proveedor no válido. Debe ser openai, ollama o custom.'
        }
    },
    
    // La API Key, ENCRIPTADA
    apiKeyEncrypted: {
        type: String,
        required: [true, 'La API key es obligatoria'],
    },
    
    // Descripción opcional
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
    },
    
    // Referencia a los modelos que usan esta key
    usedByModels: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AIModelConfig',
        default: []
    }],
    
    // Si la key está activa
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Último uso registrado
    lastUsedAt: {
        type: Date,
        default: null
    },
    
    // Contador de usos
    usageCount: {
        type: Number,
        default: 0
    },
    
    // Metadata adicional
    metadata: {
        type: Map,
        of: String,
        default: {}
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Índice compuesto para búsquedas frecuentes
apiKeyStoreSchema.index({ provider: 1, isActive: 1 });

// Middleware para limpiar referencias antes de eliminar
apiKeyStoreSchema.pre('remove', async function(next) {
    try {
        // Eliminar la referencia de los modelos que usan esta key
        const AIModelConfig = mongoose.model('AIModelConfig');
        await AIModelConfig.updateMany(
            { apiKeyRef: this._id },
            { $unset: { apiKeyRef: '' } }
        );
        next();
    } catch (error) {
        next(error);
    }
});

// Virtual para contar modelos que usan esta key
apiKeyStoreSchema.virtual('modelCount').get(function() {
    return this.usedByModels?.length || 0;
});

// Método para registrar uso
apiKeyStoreSchema.methods.recordUsage = function() {
    this.lastUsedAt = new Date();
    this.usageCount += 1;
    return this.save();
};

const ApiKeyStore = mongoose.model('ApiKeyStore', apiKeyStoreSchema);

export default ApiKeyStore;