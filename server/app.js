// server/app.js
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config'; // Asegúrate que dotenv/config está al inicio si config lo necesita

import config from './config/index.js';
import { notFoundMiddleware, errorHandlerMiddleware } from "./utils/errorHandler.js";

// Importar tus rutas
import authRouter from "./routes/authRoutes.js";
import chatApiRouter from "./routes/chatApiRoutes.js";
import aiApiRouter from "./routes/aiApiRoutes.js";
import adminApiRouter from "./routes/adminApiRoutes.js";

import menuItemRouter from "./routes/menuItemRoutes.js";
import cartRouter from "./routes/cartRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import categoryRouter from "./routes/categoryRoutes.js";

const app = express();

// Middleware
app.use(cors(config.corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuración de Morgan con Chalk
if (config.env !== 'test') { // No mostrar logs de Morgan durante los tests
    morgan.token('date', () => chalk.gray(new Date().toLocaleString()));
    morgan.token('method-colored', (req) => {
        const method = req.method;
        if (method === 'GET') return chalk.green.bold(method);
        if (method === 'POST') return chalk.cyan.bold(method);
        if (method === 'PUT') return chalk.yellow.bold(method);
        if (method === 'DELETE') return chalk.red.bold(method);
        return chalk.white.bold(method);
    });
    morgan.token('url-colored', (req) => chalk.blueBright(req.originalUrl));
    morgan.token('status-colored', (req, res) => {
        const status = res.statusCode;
        if (status >= 500) return chalk.red.bold(status);
        if (status >= 400) return chalk.yellow.bold(status);
        if (status >= 300) return chalk.cyan(status);
        if (status >= 200) return chalk.green(status);
        return chalk.white(status);
    });
    app.use(morgan(
        ':date :method-colored :url-colored :status-colored :response-time ms - :res[content-length] bytes'
    ));
}

// Endpoints API
// app.use("/uploads", express.static('uploads')); // Si lo necesitas
app.get("/", (req, res) => res.send(`Bienvenido al Backend del Chat. Documentación en /api-docs (si está configurada)`));


// Configuración de directorios
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = process.cwd();
const uploadsDir = path.join(rootDir, 'uploads');

// Asegurar que los directorios necesarios existen
const ensureDirectory = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDirectory(uploadsDir);
ensureDirectory(path.join(uploadsDir, 'categories'));
ensureDirectory(path.join(uploadsDir, 'menu-items'));

// Middleware para servir archivos estáticos
app.use(`${config.apiPrefix}/images`, (req, res, next) => {
    try {
        // Decodificar la URL y normalizar la ruta
        const filePath = decodeURIComponent(req.path)
            .replace(/^\/+|\/+$/g, '') // Eliminar barras al inicio y final
            .replace(/^uploads\//, ''); // Eliminar prefijo 'uploads/' si existe

        // Definir las posibles ubicaciones del archivo
        const possiblePaths = [
            path.join(uploadsDir, filePath), // Ruta directa
            path.join(uploadsDir, 'categories', filePath.replace(/^categories[\\/]?/, '')), // En directorio de categorías
            path.join(uploadsDir, 'menu-items', filePath.replace(/^menu-items[\\/]?/, '')) // En directorio de ítems de menú
        ];

        // Función para verificar si el archivo existe
        const tryServeFile = (index) => {
            if (index >= possiblePaths.length) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Archivo no encontrado',
                    path: filePath
                });
            }

            const currentPath = possiblePaths[index];
            
            // Verificar si el archivo existe
            fs.access(currentPath, fs.constants.F_OK, (err) => {
                if (err) {
                    // Intentar con la siguiente ruta
                    return tryServeFile(index + 1);
                }
                
                // Configurar headers de caché (1 día)
                res.setHeader('Cache-Control', 'public, max-age=86400');
                
                // Establecer el tipo de contenido según la extensión del archivo
                const extname = path.extname(currentPath).toLowerCase();
                const mimeTypes = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp',
                    '.svg': 'image/svg+xml'
                };
                
                const contentType = mimeTypes[extname] || 'application/octet-stream';
                res.setHeader('Content-Type', contentType);
                
                // Servir el archivo
                res.sendFile(currentPath, (err) => {
                    if (err) {
                        console.error('Error al enviar el archivo:', err);
                        if (!res.headersSent) {
                            res.status(500).json({
                                success: false,
                                message: 'Error al enviar el archivo',
                                error: err.message
                            });
                        }
                    }
                });
            });
        };

        // Comenzar la búsqueda del archivo
        tryServeFile(0);
    } catch (error) {
        console.error('Error en el middleware de archivos estáticos:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: error.message
        });
    }
});

app.use(`${config.apiPrefix}/auth`, authRouter);
app.use(`${config.apiPrefix}/chat-api`, chatApiRouter);
app.use(`${config.apiPrefix}/ai-api`, aiApiRouter);
app.use(`${config.apiPrefix}/admin-api`, adminApiRouter);
app.use(`${config.apiPrefix}/menu-items`, menuItemRouter)
app.use(`${config.apiPrefix}/cart`, cartRouter)
app.use(`${config.apiPrefix}/order`, orderRouter)
app.use(`${config.apiPrefix}/categories`, categoryRouter)

// Middleware para rutas no encontradas (404)
app.use(notFoundMiddleware);

// Middleware global para manejo de errores
app.use(errorHandlerMiddleware);

export default app;