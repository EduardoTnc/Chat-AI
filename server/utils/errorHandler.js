/**
 * Utilidad para manejar errores de manera consistente siguiendo el formato
 * definido en los schemas components.responses de la documentación Swagger
 */

// MARK: validationError
/**
 * Error de validación (400 Bad Request)
 * @param {Object} res - Objeto response de Express
 * @param {String} message - Mensaje de error
 * @param {Array} errors - Array de errores de validación [opcional]
 * @returns {Object} Respuesta HTTP con formato estandarizado
 */
export const validationError = (res, message = 'Error de validación.', errors = []) => {
    return res.status(400).json({
        success: false,
        message,
        errors
    });
};

// MARK: unauthorizedError
/**
 * Error de autenticación (401 Unauthorized)
 * @param {Object} res - Objeto response de Express
 * @param {String} message - Mensaje de error
 * @returns {Object} Respuesta HTTP con formato estandarizado
 */
export const unauthorizedError = (res, message = 'Token de acceso no proporcionado o inválido.') => {
    return res.status(401).json({
        success: false,
        message
    });
};

// MARK: forbiddenError
/**
 * Error de permisos (403 Forbidden)
 * @param {Object} res - Objeto response de Express
 * @param {String} message - Mensaje de error
 * @returns {Object} Respuesta HTTP con formato estandarizado
 */
export const forbiddenError = (res, message = 'Acceso prohibido. No tiene los permisos necesarios.') => {
    return res.status(403).json({
        success: false,
        message
    });
};

// MARK: notFoundError
/**
 * Error de recurso no encontrado (404 Not Found)
 * @param {Object} res - Objeto response de Express
 * @param {String} message - Mensaje de error
 * @returns {Object} Respuesta HTTP con formato estandarizado
 */
export const notFoundError = (res, message = 'Recurso no encontrado.') => {
    return res.status(404).json({
        success: false,
        message
    });
};

// MARK: serverError
/**
 * Error interno del servidor (500 Internal Server Error)
 * @param {Object} res - Objeto response de Express
 * @param {String} message - Mensaje de error
 * @returns {Object} Respuesta HTTP con formato estandarizado
 */
export const serverError = (res, message = 'Error interno del servidor.') => {
    return res.status(500).json({
        success: false,
        message
    });
};

// MARK: handleError (renombrado a errorHandlerMiddleware)
/**
 * Manejador de errores general (Middleware)
 * Determina el tipo de error y lo maneja adecuadamente
 * @param {Error} err - Objeto error
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 * @param {Function} next - Función next de Express
 * @returns {Object} Respuesta HTTP con formato estandarizado
 */
export const errorHandlerMiddleware = (err, req, res, next) => {
    console.error('Error Capturado:', err.name, '-', err.message);
    if (process.env.NODE_ENV === 'development' && err.stack) {
        console.error(err.stack);
    }


    // Error de validación de Mongoose
    if (err.name === 'ValidationError') {
        const errors = Object.keys(err.errors).map(field => ({
            field,
            message: err.errors[field].message
        }));
        return validationError(res, 'Error en la validación de datos.', errors);
    }

    // Error de duplicado de valores únicos
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        const value = err.keyValue[field];
        return validationError(
            res,
            `El valor '${value}' para el campo '${field}' ya existe.`,
            [{ field, message: 'Este valor ya está en uso.' }]
        );
    }

    // Error de ID inválido de MongoDB
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        return notFoundError(res, `ID de recurso inválido: ${err.value}`);
    }

    // Error de JWT
    if (err.name === 'JsonWebTokenError') {
        return unauthorizedError(res, 'Token inválido o malformado.');
    }

    if (err.name === 'TokenExpiredError') {
        return unauthorizedError(res, 'Token expirado. Por favor, inicie sesión de nuevo.');
    }

    // Error personalizado con código HTTP (ApiError)
    if (err instanceof ApiError) { // Usar instanceof
        const statusCode = err.statusCode;
        const message = err.message || 'Error en la operación.';

        switch (statusCode) {
            case 400:
                return validationError(res, message, err.errors || []);
            case 401:
                return unauthorizedError(res, message);
            case 403:
                return forbiddenError(res, message);
            case 404:
                return notFoundError(res, message);
            default: // Para otros errores ApiError con códigos como 409, 422, etc.
                return res.status(statusCode).json({ success: false, message, errors: err.errors || [] });
        }
    }

    // Error no controlado (500)
    return serverError(res, 'Ha ocurrido un error inesperado en el servidor.');
};

// MARK: ApiError
// Clase de error personalizada para facilitar lanzamiento de errores con código HTTP
export class ApiError extends Error {
    constructor(statusCode, message, errors = []) {
        super(message);
        this.statusCode = statusCode;
        this.errors = errors; // Para errores de validación múltiples
        this.name = 'ApiError'; // Para identificarlo si es necesario
        Error.captureStackTrace(this, this.constructor); // Para mantener el stack trace correcto
    }
}

// Middleware para rutas no encontradas (404)
export const notFoundMiddleware = (req, res, next) => {
    return notFoundError(res, `Ruta no encontrada: ${req.originalUrl}`);
};