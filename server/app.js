// server/app.js
import express from "express";
import cors from "cors";
import morgan from "morgan";
import chalk from 'chalk';
import cookieParser from 'cookie-parser';
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

// Rutas del módulo de Chat y Admin

app.use(`${config.apiPrefix}/auth`, authRouter);
app.use(`${config.apiPrefix}/chat-api`, chatApiRouter);
app.use(`${config.apiPrefix}/ai-api`, aiApiRouter);
app.use(`${config.apiPrefix}/admin-api`, adminApiRouter);

app.use(`${config.apiPrefix}/menu-items`, menuItemRouter)
app.use(`${config.apiPrefix}/images`, express.static('uploads'))
app.use(`${config.apiPrefix}/cart`, cartRouter)
app.use(`${config.apiPrefix}/order`, orderRouter)

// Middleware para rutas no encontradas (404)
app.use(notFoundMiddleware);

// Middleware global para manejo de errores
app.use(errorHandlerMiddleware);

export default app;