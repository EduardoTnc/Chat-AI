// Asumiendo que tienes una manera de hacer peticiones HTTP, ej. node-fetch o axios
// Para simplificar, usaré el 'fetch' global si Node.js >= 18, o puedes instalar 'node-fetch'.
import fetch from 'node-fetch'; // Descomentar si Node < 18

/**
 * Clase para interactuar con el proveedor de IA Ollama.
 * @class OllamaProvider
 * @param {string} [baseUrl=http://localhost:11434] - URL base de la API de Ollama (no incluye slash final)
 */
class OllamaProvider {

    /**
     * @function constructor
     * @description Inicializa el proveedor de IA Ollama con la URL base de la API.
     * @param {string} [baseUrl=http://localhost:11434] - URL base de la API de Ollama (no incluye slash final)
     */
    constructor(baseUrl = 'http://localhost:11434') {
        this.baseUrl = baseUrl.replace(/\/$/, ""); // Quitar slash final si existe
    }


    // MARK: - generate
    /**
     * @function generate
     * @description Genera una respuesta de IA basada en los mensajes proporcionados.
     * @param {Array<{role: string, content: string}>} messages - Array de mensajes con roles y contenido
     * @param {string} systemPrompt - Prompt del sistema
     * @param {string} modelApiIdentifier - Identificador API del modelo
     * @param {Object} [modelOptions={}] - Opciones adicionales para el modelo
     * @returns {Promise<{content: string, toolCalls: Array<{id: string, type: string, function: {name: string, arguments: string}}>}, usage: {promptTokens: number, completionTokens: number, totalTokens: number}, modelUsed: string}>} - Respuesta de IA
     */
    async generate(messages, systemPrompt, modelApiIdentifier, modelOptions = {}) {
        const endpoint = `${this.baseUrl}/api/chat`; // Endpoint para chat de Ollama
        // const endpoint = `${this.baseUrl}/api/generate`; // Endpoint para generación simple (menos control de historial)

        // Ollama /api/chat espera un array de mensajes { role, content }
        // El system prompt se puede poner como el primer mensaje con role: 'system'
        const ollamaMessages = [];
        if (systemPrompt) {
            ollamaMessages.push({ role: 'system', content: systemPrompt });
        }
        ollamaMessages.push(...messages); // messages ya debe ser [{role, content}, ...]

        const payload = {
            model: modelApiIdentifier,
            messages: ollamaMessages,
            stream: false, // Por ahora, no streaming para simplificar la respuesta
            format: modelOptions.format || 'json', // Si quieres que devuelva JSON para tool_calls
            options: { // Parámetros del modelo
                temperature: modelOptions.temperature,
                // num_predict: modelOptions.max_tokens, // num_predict es el equivalente a max_tokens
                // ... otros parámetros de Ollama
            },
            ...(modelOptions.tools && { tools: modelOptions.tools }) // Añadir tools si existen
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`Error de Ollama (${response.status}): ${errorBody}`);
            }

            const data = await response.json();
            // La respuesta de Ollama /api/chat con stream:false y format:'json'
            // para un tool_call es un objeto con un campo `message` que contiene `tool_calls`
            // y el `content` del mensaje puede ser null.
            // Si no hay tool_call, `message.content` tendrá la respuesta.

            let responseContent = data.message?.content || "";
            const toolCalls = data.message?.tool_calls || []; // Array de { function: { name, arguments (string JSON) }}

            // Simular 'usage' si es posible (Ollama no lo devuelve tan detallado como OpenAI)
            const usage = {
                promptTokens: data.prompt_eval_count,
                completionTokens: data.eval_count, // Para /api/generate, para /api/chat es solo eval_count
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            };

            return {
                content: responseContent,
                toolCalls: toolCalls.map(tc => ({ // Adaptar al formato común de ToolCall
                    id: `ollama-tool-${Date.now()}-${Math.random().toString(36).substring(7)}`, // Generar un ID
                    type: 'function',
                    function: {
                        name: tc.function.name,
                        arguments: JSON.stringify(tc.function.arguments) // Ollama devuelve arguments como objeto
                    }
                })),
                usage,
                modelUsed: modelApiIdentifier,
            };

        } catch (error) {
            console.error("Error comunicándose con Ollama:", error);
            throw error; // Re-lanzar para que AIService lo maneje
        }
    }

    // MARK: - listModels
    /**
     * @function listModels
     * @description Lista los modelos disponibles en Ollama.
     * @returns {Promise<Array<{id: string, name: string, providerInternal: any}>>} - Array de modelos disponibles
     */
    async listModels() {
        const endpoint = `${this.baseUrl}/api/tags`;
        try {
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Error de Ollama listando modelos (${response.status})`);
            }
            const data = await response.json();
            return data.models.map(m => ({ id: m.name, name: m.name, providerInternal: m }));
        } catch (error) {
            console.error("Error listando modelos de Ollama:", error);
            return [];
        }
    }
}

export default OllamaProvider;