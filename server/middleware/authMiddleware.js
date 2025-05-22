import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/index.js';
import { ApiError } from '../utils/errorHandler.js';

// Middleware para proteger rutas
const protect = async (req, res, next) => {
    let token;

    // Verificar si hay un token de autorización en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraer el token del header "Bearer <token>"
            token = req.headers.authorization.split(' ')[1];
            
            // Verificar la validez del token
            const decoded = jwt.verify(token, config.jwt.secret);
            console.log('Token verificado exitosamente:', decoded);
            
            // Buscar el usuario en la base de datos (sin incluir passwordHash)
            const user = await User.findById(decoded.userId);
            console.log('Usuario encontrado en BD:', user ? 'Sí' : 'No', user ? user._id : 'N/A');
            
            if (!user) {
                return next(new ApiError(401, 'Usuario no encontrado con este token.'));
            }

            // Adjuntar el usuario al objeto request para uso posterior
            req.user = user;
            return next();
        } catch (error) {
            console.error('Error de autenticación JWT:', error.message);
            return next(new ApiError(401, 'No autorizado, token inválido o expirado.'));
        }
    }

    // Si no hay token, retornar error
    return next(new ApiError(401, 'No autorizado, no hay token.'));
};

// Middleware para autorizar por roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.some(role => req.user.role === role)) { // Usar some
            return next(new ApiError(403, `Rol de usuario (${req.user ? req.user.role : 'ninguno'}) no autorizado para acceder a esta ruta.`));
        }
        next();
    };
};

export { protect, authorize };