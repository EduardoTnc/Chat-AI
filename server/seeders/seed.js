// server/seeders/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import chalk from 'chalk'; // Para logs coloridos

// Importar modelos
import AIModelConfig from '../models/AIModelConfig.js';
import ApiKeyStore from '../models/ApiKeyStore.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

const connectDBForSeed = async () => {
    try {
        // Usar la URI de tu .env directamente para el seeder
        const dbUri = process.env.MONGODB_URI;
        if (!dbUri) {
            console.error(chalk.red('Error: MONGODB_URI no está definida en el archivo .env.'));
            process.exit(1);
        }
        await mongoose.connect(dbUri);
        console.log(chalk.green('MongoDB conectado para el seeder...'));
    } catch (err) {
        console.error(chalk.red('Error conectando a MongoDB para el seeder:'), err);
        process.exit(1);
    }
};

const seedAdminUser = async () => {
    try {
        await connectDBForSeed();

        // --- Crear Usuario Administrador Principal ---
        const adminEmail = 'admin@gmail.com';
        const adminPassword = 'admin22334455'; // Contraseña en texto plano para el seeder

        let adminUser = await User.findOne({ email: adminEmail });
        if (!adminUser) {
            console.log(chalk.yellow(`Creando usuario administrador: ${adminEmail}...`));
            // El pre-save hook del modelo User hasheará la contraseña
            adminUser = await User.create({
                name: 'Admin Principal',
                email: adminEmail,
                passwordHash: adminPassword, // Se hasheará automáticamente
                role: 'admin',
            });
            console.log(chalk.green('Usuario administrador creado con éxito.'));
        } else {
            console.log(chalk.blue(`Usuario administrador ${adminEmail} ya existe.`));
        }
    } catch (error) {
        console.error(chalk.red('Error durante el sembrado de datos:'), error);
    } finally {
        await mongoose.disconnect();
        console.log(chalk.yellow('MongoDB desconectado del seeder.'));
    }
};

const seedAiModelsConfigs = async () => {
    try {
        await connectDBForSeed();

        // Limpiar colecciones existentes (opcional, pero útil para consistencia)
        console.log(chalk.yellow('Limpiando colecciones AIModelConfig y ApiKeyStore...'));
        await AIModelConfig.deleteMany({});
        await ApiKeyStore.deleteMany({});
        // await Message.deleteMany({});

        // --- Crear Configuraciones de Modelos de IA ---
        const aiModelConfigsToSeed = [
            {
                modelId: 'ollama-llama3.2-3b-q4km',
                provider: 'ollama',
                name: 'Asistente de Restaurante (Llama 3.2)',
                apiIdentifier: 'llama3.2:3b',
                systemPrompt: `Eres un asistente virtual para el restaurante, especializado en brindar información sobre nuestro menú, promociones y servicios. 

INSTRUCCIONES IMPORTANTES:
1. Solo responde preguntas relacionadas con el restaurante, su menú, promociones, horarios y servicios.
2. Para consultas sobre menú, precios o disponibilidad, DEBES usar la función search_menu_items.
3. Si no tienes información precisa sobre una pregunta, usa las funciones disponibles para obtenerla.
4. No respondas preguntas fuera del contexto del restaurante. Para temas ajenos, responde amablemente que solo puedes ayudar con información del restaurante.
5. Mantén un tono amable y profesional en todo momento.
6. Para consultas sobre pedidos existentes, usa la función check_order_status.
7. Si el cliente necesita asistencia que no puedes proporcionar, ofrécete a escalar la conversación a un agente humano.`,
                isVisibleToClient: true,
                allowedRoles: ['user', 'agent', 'admin'],
                supportsTools: true,
            },
            {
                modelId: 'ollama-qwen3-8b',
                provider: 'ollama',
                name: 'Asistente de Menú (Qwen 3)',
                apiIdentifier: 'qwen3:8b',
                systemPrompt: `Eres un experto en el menú del restaurante, especializado en describir platos, ingredientes y hacer recomendaciones.

DIRECTRICES:
- Usa la función search_menu_items para TODA consulta sobre el menú, precios o disponibilidad.
- No inventes información que no tengas en la base de datos.
- Para preguntas sobre alérgenos o ingredientes, verifica siempre con la función antes de responder.
- Si no estás seguro de algo, dilo abiertamente y ofrece buscar la información.
- Mantén las respuestas concisas y centradas en la consulta del cliente.`,
                isVisibleToClient: true,
                allowedRoles: ['user', 'agent', 'admin'],
                supportsTools: true,
            },
            {
                modelId: 'openai-gpt-4o',
                provider: 'openai',
                name: 'Asistente Premium (GPT-4o)',
                apiIdentifier: 'gpt-4o-2024-08-06',
                systemPrompt: `Eres un asistente virtual avanzado para el restaurante con acceso a las siguientes funciones:

FUNCIONES DISPONIBLES:
1. search_menu_items: Para consultar el menú, precios y disponibilidad
2. check_order_status: Para verificar el estado de pedidos
3. get_opening_hours: Para consultar horarios de atención
4. get_promotions: Para información sobre promociones vigentes

REGLAS ESTRICTAS:
- NUNCA inventes información sobre el restaurante que no estés 100% seguro.
- Para CUALQUIER consulta que requiera datos específicos (precios, disponibilidad, ingredientes), DEBES usar las funciones disponibles.
- Si no tienes la información solicitada, usa las funciones para obtenerla.
- Mantén un tono profesional pero cercano.
- No respondas preguntas fuera del ámbito del restaurante.`,
                isVisibleToClient: true,
                allowedRoles: ['user', 'admin', 'agent'],
                supportsTools: true,
            },
            // Modelo interno para desarrollo
            {
                modelId: 'internal-debug-model',
                provider: 'custom',
                name: 'Modelo de Desarrollo (No Visible)',
                apiIdentifier: 'debug-model-v1',
                systemPrompt: `Modelo de desarrollo para pruebas. Todas las respuestas deben incluir "[DEBUG]" al inicio. 

- Usa funciones para TODA consulta de datos.
- Registra las decisiones de razonamiento.
- No asumas información que no te sea proporcionada.`,
                isVisibleToClient: false,
                allowedRoles: ['admin'],
                supportsTools: true,
            },
        ];

        const insertedAIModels = await AIModelConfig.insertMany(aiModelConfigsToSeed);
        console.log(chalk.green(`${insertedAIModels.length} configuraciones de modelos IA insertadas.`));

        // --- Crear API Keys (si es necesario, ej. para OpenAI) ---
        // NECESITARÁS TU API KEY REAL DE OPENAI AQUÍ (guardada en .env)
        // Y la clave de encriptación también en .env
        const openAIApiKey = process.env.OPENAI_API_KEY_FOR_SEEDING;
        const encryptionSecret = process.env.API_KEY_ENCRYPTION_SECRET;

        if (openAIApiKey && encryptionSecret) {
            // Replicar la lógica de encriptación de AdminConfigService
            // (Sería mejor si AdminConfigService fuera reutilizable aquí, pero para un script simple...)
            const CryptoJS = (await import('crypto-js')).default; // Import dinámico
            const encryptedOpenAIKey = CryptoJS.AES.encrypt(openAIApiKey, encryptionSecret).toString();

            await ApiKeyStore.create({
                provider: 'OpenAI', // Debe coincidir con lo que busca AIService
                apiKeyEncrypted: encryptedOpenAIKey,
                description: 'API Key para modelos de OpenAI (GPT-3.5, GPT-4)',
            });
            console.log(chalk.green('API Key de OpenAI (encriptada) insertada.'));
        } else {
            console.warn(chalk.yellow('OPENAI_API_KEY_FOR_SEEDING o API_KEY_ENCRYPTION_SECRET no definidas en .env. No se sembró API Key de OpenAI.'));
        }

        console.log(chalk.blue.bold('¡Sembrado de datos completado!'));

    } catch (error) {
        console.error(chalk.red('Error durante el sembrado de datos:'), error);
    } finally {
        await mongoose.disconnect();
        console.log(chalk.yellow('MongoDB desconectado del seeder.'));
    }
};

seedAiModelsConfigs();
// seedAdminUser();

