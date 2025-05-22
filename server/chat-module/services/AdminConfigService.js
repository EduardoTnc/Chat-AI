import AIModelConfig from '../../models/AIModelConfig.js';
import ApiKeyStore from '../../models/ApiKeyStore.js';
import { ApiError } from '../../utils/errorHandler.js';
import CryptoJS from 'crypto-js'; // Para encriptación
import config from '../../config/index.js';

class AdminConfigService {

    // MARK: - AI Model Configurations

    /**
     * Recupera todas las configuraciones de modelos de IA, ordenadas por proveedor y nombre.
     * Utiliza lean() para mejorar el rendimiento, devolviendo objetos JavaScript simples.
     * 
     * @returns {Promise<Array<Object>>} Una promesa que se resuelve a un array de configuraciones de modelos de IA.
     */
    async getAllAIModelConfigs() {
        return AIModelConfig.find().sort({ provider: 1, name: 1 }).lean();
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
        const modelConfig = await AIModelConfig.findOne({ modelId }).lean();
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
        const modelConfig = await AIModelConfig.findById(internalModelId).lean();
        if (!modelConfig) {
            throw new ApiError(`Configuración del modelo IA con ID interno '${internalModelId}' no encontrada.`, 404);
        }
        return modelConfig;
    }

    /**
     * Crea una nueva configuración de modelo de IA.
     * Si ya existe una configuración con el mismo modelId, lanza un ApiError con código 400.
     * 
     * @param {Object} configData - Los datos de la configuración a crear
     * @returns {Promise<Object>} La configuración recién creada, con sus campos en formato de objeto
     */
    async createAIModelConfig(configData) {
        const existing = await AIModelConfig.findOne({ modelId: configData.modelId });
        if (existing) {
            throw new ApiError(400, `Ya existe una configuración con modelId '${configData.modelId}'.`);
        }
        const newConfig = new AIModelConfig(configData);
        await newConfig.save();
        return newConfig.toObject();
    }

    /**
     * Actualiza una configuración de modelo de IA existente.
     * Si no se encuentra la configuración, lanza un ApiError con código 404.
     * Si hay errores de validación, lanza un ApiError con código 400.
     * 
     * @param {string} internalModelId - El _id de Mongo de la configuración del modelo
     * @param {Object} updateData - Los campos de la configuración a actualizar
     * @returns {Promise<Object>} La configuración actualizada, con sus campos en formato de objeto
     */
    async updateAIModelConfig(internalModelId, updateData) {
        const updatedConfig = await AIModelConfig.findByIdAndUpdate(internalModelId, updateData, {
            new: true,
            runValidators: true,
        }).lean();

        if (!updatedConfig) {
            throw new ApiError(404, `Configuración del modelo IA con ID interno '${internalModelId}' no encontrada para actualizar.`);
        }
        return updatedConfig;
    }

    /**
     * Elimina una configuración de modelo de IA existente.
     * Si no se encuentra la configuración, lanza un ApiError con código 404.
     * 
     * @param {string} internalModelId - El _id de Mongo de la configuración del modelo
     * @returns {Promise<{message: string}>} Un objeto con un mensaje de confirmación de eliminación
     */
    async deleteAIModelConfig(internalModelId) {
        const result = await AIModelConfig.findByIdAndDelete(internalModelId);
        if (!result) {
            throw new ApiError(404, `Configuración del modelo IA con ID interno '${internalModelId}' no encontrada para eliminar.`);
        }
        return { message: 'Configuración eliminada exitosamente.' };
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
     * Guarda una API Key para el proveedor especificado.
     * Si ya existe una API Key para ese proveedor, se actualiza.
     * La API Key se encripta antes de guardarla en la base de datos.
     * 
     * @param {string} provider - El nombre del proveedor de IA (OpenAI, Ollama, etc.)
     * @param {string} plainApiKey - La API Key plana a guardar
     * @param {string} [description=''] - Una descripción opcional para la API Key
     * @returns {Promise<{provider: string, description: string, lastUpdated: Date}>}
     *  Un objeto con los siguientes campos:
     *  - provider: El nombre del proveedor
     *  - description: La descripción de la API Key
     *  - lastUpdated: La fecha de la última actualización
     */
    async saveApiKey(provider, plainApiKey, description = '') {
        const encryptedKey = this._encryptApiKey(plainApiKey);

        const apiKeyRecord = await ApiKeyStore.findOneAndUpdate(
            { provider },
            { apiKeyEncrypted: encryptedKey, description }, // No IV con CryptoJS AES simple
            { upsert: true, new: true, runValidators: true }
        );
        return { provider: apiKeyRecord.provider, description: apiKeyRecord.description, lastUpdated: apiKeyRecord.updatedAt };
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
        const apiKeyRecord = await ApiKeyStore.findOne({ provider }).select('+apiKeyEncrypted').lean(); // Asegurar que se traiga
        if (!apiKeyRecord) {
            console.warn(`API Key para ${provider} no encontrada en ApiKeyStore.`);
            return null;
        }
        return this._decryptApiKey(apiKeyRecord.apiKeyEncrypted);
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
        const apiKeyRecord = await ApiKeyStore.findOne({ provider }).select('provider lastUpdated description').lean();
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
        const result = await ApiKeyStore.deleteOne({ provider });
        if (result.deletedCount === 0) {
            throw new ApiError(404, `API Key para el proveedor '${provider}' no encontrada para eliminar.`);
        }
        return { message: `API Key para '${provider}' eliminada exitosamente.` };
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