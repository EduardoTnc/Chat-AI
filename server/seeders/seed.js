// server/seeders/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import chalk from 'chalk'; // Para logs coloridos

// Importar modelos
import AIModelConfig from '../models/AIModelConfig.js';
import ApiKeyStore from '../models/ApiKeyStore.js';
import Message from '../models/Message.js'; // Por si necesitas crear un admin/agent para pruebas

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

const seedData = async () => {
    try {
        await connectDBForSeed();

        // Limpiar colecciones existentes (opcional, pero útil para consistencia)
        console.log(chalk.yellow('Limpiando colecciones AIModelConfig, ApiKeyStore y Message...'));
        await AIModelConfig.deleteMany({});
        await ApiKeyStore.deleteMany({});
        await Message.deleteMany({});
        // No limpies User a menos que quieras recrearlos siempre.

        // --- Crear Configuraciones de Modelos de IA ---
        const aiModelConfigsToSeed = [
            {
                modelId: 'ollama-llama3.2-3b-q4km',
                provider: 'ollama',
                name: 'Llama 3.2 (3B)',
                apiIdentifier: 'llama3.2:3b',
                systemPrompt: 'Eres un asistente de IA que responde a las preguntas de los usuarios, debes intentar resolver la consulta del usuario de la mejor manera posible y solo si no puedes resolver la consulta debes usar las tools para resolverla.',
                isVisibleToClient: true,
                allowedRoles: ['user', 'agent', 'admin'],
                supportsTools: true,
            },
            {
                modelId: 'ollama-qwen3-8b',
                provider: 'ollama',
                name: 'Qwen 3 (8B)',
                apiIdentifier: 'qwen3:8b',
                systemPrompt: 'Eres un asistente de IA útil y conciso, potenciado por Qwen 3, debes intentar resolver la consulta del usuario de la mejor manera posible y solo si no puedes resolver la consulta debes usar las tools para resolverla.',
                isVisibleToClient: true,
                allowedRoles: ['user', 'agent', 'admin'],
                supportsTools: true,
            },
            {
                modelId: 'ollama-gemma3-4b',
                provider: 'ollama',
                name: 'Gemma 3 (4B)',
                apiIdentifier: 'gemma3:4b',
                systemPrompt: 'Eres un asistente de IA útil, potenciado por Gemma 3, debes intentar resolver la consulta del usuario de la mejor manera posible.',
                isVisibleToClient: true,
                allowedRoles: ['user', 'agent', 'admin'],
                supportsTools: false,
            },
            {
                modelId: 'ollama-gemma3-1b',
                provider: 'ollama',
                name: 'Gemma 3 (1B)',
                apiIdentifier: 'gemma3:1b',
                systemPrompt: 'Eres un asistente de IA útil, potenciado por Gemma 3, debes intentar resolver la consulta del usuario de la mejor manera posible.',
                isVisibleToClient: true,
                allowedRoles: ['user', 'agent', 'admin'],
                supportsTools: false,
            },
            {
                modelId: 'openai-gpt-3.5-turbo',
                provider: 'openai',
                name: 'GPT-3.5 Turbo',
                apiIdentifier: 'gpt-3.5-turbo', // ID oficial de OpenAI
                systemPrompt: 'Eres GPT-3.5 Turbo, un asistente de IA útil, debes intentar resolver la consulta del usuario de la mejor manera posible y solo si no puedes resolver la consulta debes usar las tools para resolverla.',
                isVisibleToClient: true,
                allowedRoles: ['user', 'agent', 'admin'],
                supportsTools: true, // gpt-3.5-turbo soporta function calling
            },
            {
                modelId: 'openai-gpt-4-turbo',
                provider: 'openai',
                name: 'GPT-4 Turbo',
                apiIdentifier: 'gpt-4-turbo-preview', // o el ID actual de GPT-4 Turbo
                systemPrompt: 'Eres GPT-4 Turbo, un asistente de IA avanzado y capaz.',
                isVisibleToClient: true, // Quizás solo para admins/agents inicialmente
                allowedRoles: ['admin', 'agent'],
                supportsTools: true,
            },
            // Modelo no visible para cliente normal
            {
                modelId: 'internal-debug-model',
                provider: 'custom',
                name: 'Modelo Interno (No Visible)',
                apiIdentifier: 'debug-model-v1',
                systemPrompt: 'Soy un modelo de depuración.',
                isVisibleToClient: false, // NO visible
                allowedRoles: ['admin'],
                supportsTools: false,
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

seedData();