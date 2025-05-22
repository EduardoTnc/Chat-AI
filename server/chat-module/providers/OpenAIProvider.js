import OpenAI from 'openai';

class OpenAIProvider {

    constructor(apiKey) {
        if (!apiKey) {
            throw new Error("API Key de OpenAI es requerida para OpenAIProvider.");
        }
        this.openai = new OpenAI({ apiKey });
    }

    // MARK: - generate
    /**
     * @function generate
     * @description Genera una respuesta de IA basada en los mensajes proporcionados.
     * @param {Array<{role: string, content: string}>} messages - Array de mensajes con roles y contenido
     * @param {string} systemPrompt - Prompt del sistema
     * @param {string} modelApiIdentifier - Identificador API del modelo
     * @param {Object} [modelOptions={}] - Opciones adicionales para el modelos
     * @returns {Promise<{content: string, toolCalls: Array<{id: string, type: string, function: {name: string, arguments: string}}>}, usage: {promptTokens: number, completionTokens: number, totalTokens: number}, modelUsed: string}>} - Respuesta de IA
     */
    async generate(messages, systemPrompt, modelApiIdentifier, modelOptions = {}) {

        //? 1. Preparar los mensajes para OpenAI
        // OpenAI espera un array de mensajes { role, content }
        // El system prompt se puede poner como el primer mensaje con role: 'system'
        const openAIMessages = [];
        if (systemPrompt) {
            openAIMessages.push({ role: 'system', content: systemPrompt });
        }
        openAIMessages.push(...messages); // messages ya debe ser [{role, content, tool_calls?, tool_call_id?}, ...]

        //? 2. Preparar los parámetros para OpenAI
        const params = {
            model: modelApiIdentifier,
            messages: openAIMessages,
            temperature: modelOptions.temperature || 0.7,
            max_tokens: modelOptions.max_tokens || 1024, // Un default razonable
            // ... otros parámetros de OpenAI como top_p, presence_penalty, etc.
            ...(modelOptions.tools && modelOptions.tools.length > 0 && {
                tools: modelOptions.tools, // [{ type: "function", function: { name, description, parameters } }]
                tool_choice: modelOptions.tool_choice || "auto", // "auto", "none", o {"type": "function", "function": {"name": "my_function"}}
            })
        };

        try {
            //? 3. Generar la respuesta con OpenAI
            const completion = await this.openai.chat.completions.create(params);

            //? 4. Procesar la respuesta de OpenAI
            const choice = completion.choices[0];
            const message = choice.message; // { role: 'assistant', content: '...', tool_calls: [] }

            let responseContent = message.content || ""; // Puede ser null si hay tool_calls
            const toolCalls = message.tool_calls || []; // Array de { id, type: 'function', function: { name, arguments (string JSON) }}

            const usage = {
                promptTokens: completion.usage?.prompt_tokens || 0,
                completionTokens: completion.usage?.completion_tokens || 0,
                totalTokens: completion.usage?.total_tokens || 0,
            };

            //? 5. Devolver la respuesta
            return {
                content: responseContent,
                toolCalls: toolCalls.map(tc => ({ // Ya está en el formato común
                    id: tc.id,
                    type: tc.type,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments // OpenAI ya devuelve arguments como JSON string
                    }
                })),
                usage,
                modelUsed: modelApiIdentifier, // o completion.model si quieres el exacto devuelto
            };

        } catch (error) {
            console.error("Error comunicándose con OpenAI:", error);
            // Puedes intentar parsear el error de OpenAI para más detalles
            // if (error.response) { console.error(error.response.data); }
            throw error; // Re-lanzar para que AIService lo maneje
        }
    }

    // MARK: - listModels
    /**
     * @function listModels
     * @description Lista los modelos disponibles en OpenAI.
     * @returns {Promise<Array<{id: string, name: string, providerInternal: any}>>} - Array de modelos disponibles
     */
    async listModels() {
        try {
            const response = await this.openai.models.list();

            //? 1. Procesar la respuesta de OpenAI
            return response.data.map(m => ({ id: m.id, name: m.id, providerInternal: m })); // OpenAI usa 'id' para el nombre del modelo

        } catch (error) {
            console.error("Error listando modelos de OpenAI:", error);
            return [];
        }
    }
}

export default OpenAIProvider;