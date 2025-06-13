import mongoose from 'mongoose';
import AIModelConfig from '../models/AIModelConfig.js';
import ApiKeyStore from '../models/ApiKeyStore.js';
import { notFoundError, validationError } from '../utils/errorHandler.js';

/**
 * Servicio para gestionar la relación entre modelos de IA y claves API
 */
class ModelKeyService {
    /**
     * Asocia una clave API a un modelo de IA
     * @param {string} modelId - ID del modelo de IA
     * @param {string} keyId - ID de la clave API
     * @returns {Promise<Object>} - Modelo actualizado
     */
    static async associateModelWithKey(modelId, keyId) {
        if (!modelId || !keyId) {
            throw new ValidationError('Se requieren tanto el ID del modelo como el de la clave API');
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Verificar que el modelo y la clave existen
            const [model, key] = await Promise.all([
                AIModelConfig.findById(modelId).session(session),
                ApiKeyStore.findById(keyId).session(session)
            ]);

            if (!model) {
                throw new NotFoundError('Modelo de IA no encontrado');
            }
            if (!key) {
                throw new NotFoundError('Clave API no encontrada');
            }

            // Si el modelo ya tenía una clave asociada, limpiar la referencia anterior
            if (model.apiKeyRef) {
                await ApiKeyStore.findByIdAndUpdate(
                    model.apiKeyRef,
                    { $pull: { usedByModels: model._id } },
                    { session }
                );
            }

            // Actualizar la referencia en el modelo
            model.apiKeyRef = key._id;
            await model.save({ session });

            // Actualizar la lista de modelos en la clave
            if (!key.usedByModels.includes(model._id)) {
                key.usedByModels.push(model._id);
                await key.save({ session });
            }

            await session.commitTransaction();
            
            // Devolver el modelo con la clave API poblada
            return AIModelConfig.findById(modelId).populate('apiKeyRef');
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    /**
     * Desasocia una clave API de un modelo de IA
     * @param {string} modelId - ID del modelo de IA
     * @returns {Promise<Object>} - Modelo actualizado
     */
    static async disassociateModelFromKey(modelId) {
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            const model = await AIModelConfig.findById(modelId).session(session);
            if (!model) {
                throw new NotFoundError('Modelo de IA no encontrado');
            }

            if (!model.apiKeyRef) {
                return model; // No hay clave para desasociar
            }

            // Eliminar la referencia en la clave API
            await ApiKeyStore.findByIdAndUpdate(
                model.apiKeyRef,
                { $pull: { usedByModels: model._id } },
                { session }
            );

            // Eliminar la referencia en el modelo
            model.apiKeyRef = undefined;
            await model.save({ session });

            await session.commitTransaction();
            return model;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    /**
     * Obtiene la clave API para un modelo específico
     * @param {string} modelId - ID del modelo de IA
     * @returns {Promise<Object>} - Objeto con la clave API y metadatos
     */
    static async getApiKeyForModel(modelId) {
        const model = await AIModelConfig.findById(modelId).populate('apiKeyRef');
        
        if (!model) {
            throw new NotFoundError('Modelo de IA no encontrado');
        }

        if (!model.apiKeyRef) {
            if (model.provider === 'custom') {
                return { 
                    hasKey: false,
                    provider: 'custom',
                    message: 'Este modelo no requiere una clave API externa.'
                };
            }
            throw new ValidationError('No se encontró una clave API configurada para este modelo');
        }

        return {
            hasKey: true,
            keyId: model.apiKeyRef._id,
            provider: model.provider,
            key: model.apiKeyRef.apiKeyEncrypted,
            description: model.apiKeyRef.description,
            lastUsedAt: model.apiKeyRef.lastUsedAt,
            usageCount: model.apiKeyRef.usageCount
        };
    }

    /**
     * Registra el uso de una clave API
     * @param {string} keyId - ID de la clave API
     * @returns {Promise<void>}
     */
    static async recordKeyUsage(keyId) {
        if (!keyId) return;
        
        try {
            await ApiKeyStore.findByIdAndUpdate(
                keyId,
                {
                    $set: { lastUsedAt: new Date() },
                    $inc: { usageCount: 1 }
                }
            );
        } catch (error) {
            console.error('Error al registrar el uso de la clave API:', error);
            // No lanzamos el error para no interrumpir el flujo principal
        }
    }

    /**
     * Obtiene todas las claves API de un proveedor específico
     * @param {string} provider - Proveedor (openai, ollama, etc.)
     * @returns {Promise<Array>} - Lista de claves API
     */
    static async getKeysByProvider(provider) {
        if (!provider) {
            throw new ValidationError('Se requiere especificar un proveedor');
        }

        return ApiKeyStore.find({ 
            provider: provider.toLowerCase(),
            isActive: true 
        }).select('_id provider description lastUsedAt usageCount');
    }
}

export default ModelKeyService;
