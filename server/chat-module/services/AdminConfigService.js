import AIModelConfig from '../../models/AIModelConfig.js';
import ApiKeyStore from '../../models/ApiKeyStore.js';
import { ApiError } from '../../utils/errorHandler.js';
import CryptoJS from 'crypto-js'; // Para encriptación
import config from '../../config/index.js';
import ModelKeyService from '../../services/ModelKeyService.js';

class AdminConfigService {

    // MARK: - AI Model Configurations

    /**
     * Recupera todas las configuraciones de modelos de IA, ordenadas por proveedor y nombre.
     * Utiliza lean() para mejorar el rendimiento, devolviendo objetos JavaScript simples.
     * 
     * @returns {Promise<Array<Object>>} Una promesa que se resuelve a un array de configuraciones de modelos de IA.
     */
    async getAllAIModelConfigs() {
        return AIModelConfig.find()
            .populate('apiKeyRef', 'provider description lastUsedAt usageCount')
            .sort({ provider: 1, name: 1 })
            .lean();
    }

    /**
     * Recupera la configuración del modelo de IA por su modelId único.
     * Si la configuración no se encuentra, devuelve null.
     * El AIService manejará los casos críticos.
     * 
     * @param {string} modelId - El identificador único del modelo, no el _id de Mongo
     * @returns {Promise<Object>} La configuración del modelo, o null si no se encuentra
     */
    async getAIModelConfig(modelId) { //? modelId es el identificador único, no el _id de mongo
        const modelConfig = await AIModelConfig.findOne({ modelId })
            .populate('apiKeyRef', 'provider description lastUsedAt usageCount')
            .lean();
        if (!modelConfig) {
            return null; //! AIService lo manejará si es crítico.
        }
        return modelConfig;
    }

    /**
     * Recupera la configuración del modelo de IA por su _id de Mongo.
     * Si la configuración no se encuentra, lanza un ApiError con código 404.
     * 
     * @param {string} internalModelId - El _id de Mongo de la configuración del modelo
     * @returns {Promise<Object>} La configuración del modelo, o null si no se encuentra
     */
    async getAIModelConfigByInternalId(internalModelId) { //? internalModelId es el _id de mongo
        const modelConfig = await AIModelConfig.findById(internalModelId)
            .populate('apiKeyRef', 'provider description lastUsedAt usageCount')
            .lean();
        if (!modelConfig) {
            throw new ApiError(`Configuración del modelo IA con ID interno '${internalModelId}' no encontrada.`, 404);
        }
        return modelConfig;
    }

    /**
     * Crea una nueva configuración de modelo de IA.
     * Si ya existe una configuración con el mismo modelId, lanza un ApiError con código 400.
     * Si se marca como predeterminado, desmarca cualquier otro modelo predeterminado.
     * 
     * @param {Object} configData - Los datos de la configuración a crear
     * @returns {Promise<Object>} La configuración recién creada, con sus campos en formato de objeto
     */
    async createAIModelConfig(configData) {
        // Verificar si ya existe un modelo con el mismo modelId
        const existing = await AIModelConfig.findOne({ modelId: configData.modelId });
        if (existing) {
            throw new ApiError(400, `Ya existe una configuración con modelId '${configData.modelId}'.`);
        }

        // Extraer apiKeyId de los datos si está presente
        const { apiKeyId, ...modelData } = configData;

        // Si se está creando un modelo como predeterminado, quitar la marca de predeterminado de los demás
        if (modelData.isDefault) {
            await AIModelConfig.updateMany(
                { isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        // Asegurarse de que los roles permitidos sean válidos
        if (!modelData.allowedRoles || !Array.isArray(modelData.allowedRoles) || modelData.allowedRoles.length === 0) {
            modelData.allowedRoles = ['user']; // Valor por defecto
        }

        // Crear el modelo sin la referencia a la API key primero
        const newConfig = new AIModelConfig(modelData);
        await newConfig.save();

        // Si se proporcionó un apiKeyId, asociarlo al modelo
        if (apiKeyId) {
            try {
                await ModelKeyService.associateModelWithKey(newConfig._id, apiKeyId);
                // Recargar el modelo para obtener la referencia poblada
                return AIModelConfig.findById(newConfig._id).populate('apiKeyRef').lean();
            } catch (error) {
                // Si hay un error al asociar la clave, eliminar el modelo recién creado
                await AIModelConfig.findByIdAndDelete(newConfig._id);
                throw error; // Relanzar el error para manejarlo en el controlador
            }
        }

        return newConfig.toObject();
    }

    /**
     * Actualiza una configuración de modelo de IA existente.
     * Si no se encuentra la configuración, lanza un ApiError con código 404.
     * Si hay errores de validación, lanza un ApiError con código 400.
     * Si se marca como predeterminado, desmarca cualquier otro modelo predeterminado.
     * 
     * @param {string} internalModelId - El _id de Mongo de la configuración del modelo
     * @param {Object} updateData - Los campos de la configuración a actualizar
     * @returns {Promise<Object>} La configuración actualizada, con sus campos en formato de objeto
     */
    async updateAIModelConfig(internalModelId, updateData) {
        // Extraer apiKeyId de los datos si está presente
        const { apiKeyId, ...updateFields } = updateData;

        // Si se está actualizando el campo isDefault a true, quitar la marca de predeterminado de los demás
        if (updateFields.isDefault === true) {
            await AIModelConfig.updateMany(
                { _id: { $ne: internalModelId }, isDefault: true },
                { $set: { isDefault: false } }
            );
        }

        // Validar y normalizar los roles permitidos si se están actualizando
        if (updateFields.allowedRoles) {
            if (!Array.isArray(updateFields.allowedRoles) || updateFields.allowedRoles.length === 0) {
                updateFields.allowedRoles = ['user']; // Valor por defecto
            } else {
                // Filtrar roles no válidos
                updateFields.allowedRoles = updateFields.allowedRoles.filter(role =>
                    ['user', 'agent', 'admin'].includes(role)
                );
                if (updateFields.allowedRoles.length === 0) {
                    updateFields.allowedRoles = ['user']; // Asegurar al menos un rol
                }
            }
        }

        // Actualizar el modelo con los campos normales
        const updatedConfig = await AIModelConfig.findByIdAndUpdate(
            internalModelId,
            updateFields,
            {
                new: true,
                runValidators: true,
            }
        );

        if (!updatedConfig) {
            throw new ApiError(404, `Configuración del modelo IA con ID interno '${internalModelId}' no encontrada para actualizar.`);
        }

        // Manejar la actualización de la API key si se proporcionó
        if (apiKeyId !== undefined) {
            try {
                if (apiKeyId) {
                    // Asociar la nueva clave
                    await ModelKeyService.associateModelWithKey(internalModelId, apiKeyId);
                } else {
                    // Si apiKeyId es null o vacío, desasociar la clave actual
                    await ModelKeyService.disassociateModelFromKey(internalModelId);
                }
                // Recargar el modelo para obtener la referencia actualizada
                return AIModelConfig.findById(internalModelId).populate('apiKeyRef').lean();
            } catch (error) {
                // Si hay un error al actualizar la clave, revertir los cambios
                if (updateData.isDefault === true) {
                    // Revertir el cambio de isDefault si falla la actualización de la clave
                    await AIModelConfig.updateMany(
                        { _id: internalModelId, isDefault: true },
                        { $set: { isDefault: false } }
                    );
                }
                throw error; // Relanzar el error para manejarlo en el controlador
            }
        }

        return updatedConfig.toObject();
    }

    /**
     * Elimina una configuración de modelo de IA existente.
     * Si no se encuentra la configuración, lanza un ApiError con código 404.
     * No permite eliminar el modelo predeterminado a menos que sea el último.
     * 
     * @param {string} internalModelId - El _id de Mongo de la configuración del modelo
     * @returns {Promise<{message: string}>} Un objeto con un mensaje de confirmación de eliminación
     */
    async deleteAIModelConfig(internalModelId) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Primero obtener el modelo para verificar si es el predeterminado
            const model = await AIModelConfig.findById(internalModelId).session(session);
            if (!model) {
                throw new ApiError(404, `Configuración del modelo IA con ID interno '${internalModelId}' no encontrada para eliminar.`);
            }

            // Verificar si es el último modelo (no permitir eliminar el último)
            const modelCount = await AIModelConfig.countDocuments().session(session);
            if (modelCount <= 1) {
                throw new ApiError(400, 'No se puede eliminar el único modelo de IA existente.');
            }

            // Si es el predeterminado, marcar otro modelo como predeterminado antes de eliminar
            if (model.isDefault) {
                // Encontrar otro modelo para marcar como predeterminado
                const otherModel = await AIModelConfig.findOne({ _id: { $ne: internalModelId } })
                    .session(session);
                if (otherModel) {
                    otherModel.isDefault = true;
                    await otherModel.save({ session });
                }
            }

            // Si el modelo tiene una API key asociada, limpiar la referencia
            if (model.apiKeyRef) {
                await ModelKeyService.disassociateModelFromKey(internalModelId);
            }

            // Eliminar el modelo
            await AIModelConfig.findByIdAndDelete(internalModelId, { session });

            await session.commitTransaction();
            return { message: 'Configuración eliminada correctamente' };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession();
        }
    }

    // MARK: - API Key Management

    /**
     * Encripta una API Key plana en un texto cifrado.
     * Si no se encuentra la variable de entorno API_KEY_ENCRYPTION_SECRET,
     * lanza un ApiError con código 500.
     * 
     * @param {string} plainKey - La API Key plana a encriptar
     * @returns {Promise<string>} El texto cifrado de la API Key
     */
    _encryptApiKey(plainKey) {
        if (!config.apiKeyEncryptionSecret) throw new ApiError(500, "API_KEY_ENCRYPTION_SECRET no configurada.");
        return CryptoJS.AES.encrypt(plainKey, config.apiKeyEncryptionSecret).toString();
    }

    /**
     * Desencripta un texto cifrado de una API Key.
     * Si no se encuentra la variable de entorno API_KEY_ENCRYPTION_SECRET,
     * lanza un ApiError con código 500.
     * Si no hay texto cifrado, devuelve null.
     * 
     * @param {string} cipherText - El texto cifrado de la API Key
     * @returns {Promise<string>} La API Key plana desencriptada
     */
    _decryptApiKey(cipherText) {
        if (!config.apiKeyEncryptionSecret) throw new ApiError(500, "API_KEY_ENCRYPTION_SECRET no configurada.");
        if (!cipherText) return null; // Si no hay texto cifrado
        const bytes = CryptoJS.AES.decrypt(cipherText, config.apiKeyEncryptionSecret);
        return bytes.toString(CryptoJS.enc.Utf8);
    }

    /**
     * Guarda o actualiza una API Key para el proveedor especificado.
     * Si ya existe una API Key para ese proveedor, se actualiza.
     * Si no se proporciona una nueva API Key, solo se actualiza la descripción.
     * La API Key se encripta antes de guardarla en la base de datos.
     * 
     * @param {string} provider - El nombre del proveedor de IA (OpenAI, Ollama, etc.)
     * @param {string} plainApiKey - La API Key plana a guardar (opcional si solo se actualiza la descripción)
     * @param {string} [description=''] - Una descripción opcional para la API Key
     * @param {boolean} [isUpdate=false] - Indica si es una actualización (permite actualizar solo la descripción)
     * @returns {Promise<{provider: string, description: string, lastUpdated: Date}>}
     *  Un objeto con los siguientes campos:
     *  - provider: El nombre del proveedor
     *  - description: La descripción de la API Key
     *  - lastUpdated: La fecha de la última actualización
     */
    async saveApiKey(provider, plainApiKey, description = '', isUpdate = false) {
        if (!provider) {
            throw new ApiError(400, 'El proveedor es requerido');
        }
        // Normalize provider name to lowercase for consistency
        const normalizedProvider = provider.toLowerCase();

        // Si es una actualización y no se proporciona una nueva API key, mantener la existente
        let updateData = { description };

        if (plainApiKey) {
            // Si se proporciona una nueva API key, encriptarla
            updateData.apiKeyEncrypted = this._encryptApiKey(plainApiKey);
        } else if (!isUpdate) {
            // Si no es una actualización y no se proporciona API key, lanzar error
            throw new ApiError(400, 'La API Key es requerida para crear un nuevo registro');
        }

        const options = {
            upsert: !isUpdate, // Solo permitir upsert si no es una actualización
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true
        };

        // Use case-insensitive search for provider
        const apiKeyRecord = await ApiKeyStore.findOneAndUpdate(
            { provider: { $regex: new RegExp(`^${normalizedProvider}$`, 'i') } },
            { ...updateData, provider: normalizedProvider },
            options
        );
        
        // If no record found and it's an update, throw error
        if (!apiKeyRecord && isUpdate) {
            throw new ApiError(404, `No se encontró una API Key para el proveedor '${normalizedProvider}'`);
        }

        if (!apiKeyRecord && isUpdate) {
            throw new ApiError(404, `No se encontró una API Key para el proveedor '${provider}'`);
        }

        return {
            provider: apiKeyRecord.provider,
            description: apiKeyRecord.description,
            lastUpdated: apiKeyRecord.updatedAt
        };
    }

    /**
     * @function getApiKey
     * @description Recupera una API Key encriptada para el proveedor especificado y la desencripta.
     *              Si no hay una API Key guardada para ese proveedor, devuelve null.
     * 
     * @param {string} provider - El nombre del proveedor de IA (OpenAI, Ollama, etc.)
     * @returns {Promise<string>} La API Key plana desencriptada
     */
    async getApiKey(provider) {
        try {
            // Normalize provider to lowercase for consistent lookup
            const normalizedProvider = provider.toLowerCase();

            // Case-insensitive search using regex
            const apiKeyRecord = await ApiKeyStore.findOne({
                provider: { $regex: new RegExp(`^${normalizedProvider}$`, 'i') }
            }).select('+apiKeyEncrypted').lean();

            if (!apiKeyRecord) {
                console.warn(`API Key for ${provider} not found in ApiKeyStore.`);
                return null;
            }

            // Update the provider in the database to be lowercase for consistency
            if (apiKeyRecord.provider !== normalizedProvider) {
                await ApiKeyStore.updateOne(
                    { _id: apiKeyRecord._id },
                    { $set: { provider: normalizedProvider } }
                );
                console.log(`Updated provider name to lowercase for ${apiKeyRecord._id}`);
            }

            return this._decryptApiKey(apiKeyRecord.apiKeyEncrypted);
        } catch (error) {
            console.error('Error in getApiKey:', error);
            throw error;
        }
    }

    /**
     * @function getApiKeyStatus
     * @description Recupera el estado de una API Key para el proveedor especificado.
     * Si no hay una API Key guardada para ese proveedor, devuelve un objeto con {exists: false}.
     * 
     * @param {string} provider - El nombre del proveedor de IA (OpenAI, Ollama, etc.)
     * @returns {Promise<{exists: boolean, lastUpdated: Date | null, provider: string, description: string}>}
     *  Un objeto con los siguientes campos:
     *  - exists: True si hay una API Key guardada para ese proveedor, false de lo contrario.
     *  - lastUpdated: La fecha de la última actualización de la API Key si existe, null de lo contrario.
     *  - provider: El nombre del proveedor.
     *  - description: La descripción de la API Key si existe, cadena vacía de lo contrario.
     */
    async getApiKeyStatus(provider) {
        if (!provider) {
            return {
                exists: false,
                lastUpdated: null,
                provider: '',
                description: ''
            };
        }
        // Normalize provider name and perform case-insensitive search
        const normalizedProvider = provider.toLowerCase();
        const apiKeyRecord = await ApiKeyStore.findOne({ 
            provider: { $regex: new RegExp(`^${normalizedProvider}$`, 'i') } 
        }).select('provider lastUpdated description').lean();
        return {
            exists: !!apiKeyRecord,
            lastUpdated: apiKeyRecord ? apiKeyRecord.lastUpdated : null,
            provider: apiKeyRecord ? apiKeyRecord.provider : provider,
            description: apiKeyRecord ? apiKeyRecord.description : '',
        };
    }

    /**
     * @function getAllApiKeyStatus
     * @description Recupera el estado de todas las API Keys almacenadas.
     *              Retorna un array de objetos que indican si la API Key existe,
     *              la fecha de la última actualización, el proveedor y la descripción.
     *
     * @returns {Promise<Array<{exists: boolean, lastUpdated: Date, provider: string, description: string}>>}
     *  Un array de objetos con la información de las API Keys.
     */
    async getAllApiKeyStatus() {
        const apiKeyRecords = await ApiKeyStore.find().select('provider lastUpdated description').lean();
        return apiKeyRecords.map(record => ({
            exists: true,
            lastUpdated: record.lastUpdated,
            provider: record.provider,
            description: record.description,
        }));
    }

    /**
     * @function deleteApiKey
     * @description Elimina una API Key para el proveedor especificado.
     *              Lanza un ApiError con código 404 si no se encuentra la API Key.
     * 
     * @param {string} provider - El nombre del proveedor de IA (OpenAI, Ollama, etc.)
     * @returns {Promise<{message: string}>} Un objeto con un mensaje de confirmación de eliminación
     */
    async deleteApiKey(provider) {
        if (!provider) {
            throw new ApiError(400, 'El proveedor es requerido');
        }
        // Normalize provider name and perform case-insensitive delete
        const normalizedProvider = provider.toLowerCase();
        const result = await ApiKeyStore.deleteOne({ 
            provider: { $regex: new RegExp(`^${normalizedProvider}$`, 'i') } 
        });
        
        if (result.deletedCount === 0) {
            throw new ApiError(404, `API Key para el proveedor '${normalizedProvider}' no encontrada para eliminar.`);
        }
        return { message: `API Key para '${normalizedProvider}' eliminada exitosamente.` };
    }

    // MARK: - Costos (no implementado)
    /**
     * @function calculateCosts
     * @description Calcula los costos estimados para un proveedor y opciones de período dados.
     *              Esta función actualmente no está completamente implementada y devuelve una respuesta predeterminada.
     *
     * @param {string} provider - El nombre del proveedor de IA (por ejemplo, OpenAI, Ollama).
     * @param {object} periodOptions - Un objeto que contiene opciones para el período, como mes o fechas de inicio y fin.
     * @returns {Promise<{provider: string, periodOptions: object, estimatedCost: number, message: string}>}
     *  Un objeto con los siguientes campos:
     *  - provider: El nombre del proveedor.
     *  - periodOptions: Las opciones para el período.
     *  - estimatedCost: El costo estimado (actualmente un valor provisional).
     *  - message: Un mensaje que indica que el cálculo no está implementado.
     */
    async calculateCosts(provider, periodOptions) {
        console.warn("calculateCosts no implementado completamente.");
        return { provider, periodOptions, estimatedCost: 0, message: "Cálculo de costos no implementado." };
    }
}

export default AdminConfigService;