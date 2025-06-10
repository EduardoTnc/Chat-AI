// server/server.js
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import chalk from 'chalk';
import 'dotenv/config'; // Ya debería estar en app.js, pero no hace daño aquí.

import app from './app.js'; // Importa la app Express configurada
import config from './config/index.js';
import { connectDB } from "./config/db.js";
import { initializeSocketIO } from './chat-module/socketHandlers/index.js';

// Crear el servidor HTTP a partir de la app Express
const httpServer = createServer(app);

// Función para iniciar el servidor
const startServer = async () => {

    await connectDB();

    // Configurar Socket.IO (crear instancia con el servidor HTTP)
    const io = new SocketIOServer(httpServer, {
        cors: config.corsOptions, // Usar corsOptions de config
        connectTimeout: 10000,  // 10 segundos
        pingTimeout: 5000,
        pingInterval: 10000,
        transports: ['websocket', 'polling'],
        allowUpgrades: true
    });

    // Inicializar manejadores de Socket.IO
    initializeSocketIO(io);

    // Solo escuchar si no estamos en modo test
    // Las pruebas de Supertest iniciarán el servidor por su cuenta usando la app exportada.
    if (config.env !== 'test') {
        httpServer.listen(config.port, () => {
            console.log(chalk.bold.cyan('\n==========================================='));
            console.log(chalk.bold.green('            CHAT MODULE BACKEND            '));
            console.log(chalk.bold.cyan('===========================================\n'));
            console.log(chalk.yellow.bold('🔗 URLs:'));
            console.log(chalk.green(`  → API URL:          ${chalk.white(`http://localhost:${config.port}${process.env.API_PREFIX || '/api/v1'}`)}`));
            console.log(chalk.magenta.bold('\n📡 Estado del Servidor:'));
            console.log(chalk.cyan(`  ✓ Socket.IO:        ${chalk.green('Escuchando')}`));
            console.log(chalk.green.bold('\n🚀 Servidor listo para recibir solicitudes!\n'));
        });
    }
}

// Iniciar el servidor solo si no es importado o si estamos en modo desarrollo (ej. por un test)
// Si este archivo es el punto de entrada principal (node server.js), startServer() se llamará.
if (import.meta.url === `file://${process.argv[1]}` || config.env !== 'test') {
    console.log("Iniciando servidor...");
    startServer().catch(err => { // Añadir un catch aquí por si connectDB falla y no estamos en test
        console.error(chalk.red.bold('Error fatal al iniciar la aplicación (fuera de test):'));
        console.error(err);
        process.exit(1);
    });
}

export { httpServer, app };