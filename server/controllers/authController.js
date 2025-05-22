import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Para generar el refresh token aleatorio
import config from '../config/index.js';
import { ApiError } from '../utils/errorHandler.js';



/**
 * Genera un Access Token JWT.
 *
 * @param {string} userId - ID del usuario
 * @returns {string} Token de acceso
 */
const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, config.jwt.secret, {
        expiresIn: config.jwt.accessExpiresIn,
    });
};



/**
 * Genera un Refresh Token seguro.
 *
 * @returns {string} Token de refresco aleatorio
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(64).toString('hex');
};



// MARK: - sendRefreshTokenCookie
/**
 * Envía el refresh token como cookie HttpOnly.
 *
 * @param {Object} res - Response de Express
 * @param {string} token - Token de refresco a enviar
 */
const sendRefreshTokenCookie = (res, token) => {
    res.cookie(config.jwt.refreshCookieName, token, {
        httpOnly: true, // El cliente JS no puede acceder
        secure: config.env === 'production', // Solo en HTTPS en producción
        sameSite: 'strict', // Mitiga CSRF
        path: `${config.apiPrefix || '/api/v1'}/auth/refresh-token`, // Alcance de la cookie
        maxAge: parseInt(config.jwt.refreshExpiresIn) * 24 * 60 * 60 * 1000, // ej: 7 * 24 * 60 * 60 * 1000 para 7 días
    });
};



// MARK: - register
/**
 * Registra un nuevo usuario con credenciales de email y contraseña.
 *
 * Genera un nuevo usuario con el rol 'user' y lo guarda en la base de datos.
 * Genera un token de acceso (accessToken) y un token de refresco (refreshToken)
 * y los devuelve en el cuerpo de la respuesta.
 *
 * El token de refresco se envía como cookie HttpOnly con el nombre especificado
 * en la configuración.
 *
 * @param {Object} req - Request de Express - Contiene el body con el email y contraseña
 * @param {Object} res - Response de Express - Contiene el Access Token y el usuario
 * @param {Function} next - Función next de Express
 * @throws {ApiError} 400 si no se proporcionan credenciales válidas.
 * @throws {ApiError} 400 si el usuario ya existe con ese email.
 */
export const register = async (req, res, next) => {
    const { name, email, password } = req.body; // No tomar 'role' del body

    try {
        if (!name || !email || !password) {
            return next(new ApiError(400, 'Por favor, proporciona nombre, email y contraseña.'));
        }
        if (password.length < 6) {
            return next(new ApiError(400, 'La contraseña debe tener al menos 6 caracteres.'));
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return next(new ApiError(400, 'El usuario ya existe con este email.'));
        }

        const user = new User({
            name,
            email,
            passwordHash: password,
            role: 'user', // << SEXTO: Forzar rol 'user' en registro público
        });
        await user.save();


        // Generar tokens
        const accessToken = generateAccessToken(user._id);
        const refreshTokenValue = generateRefreshToken();
        const refreshTokenExpires = new Date(Date.now() + parseInt(config.jwt.refreshExpiresIn) * 24 * 60 * 60 * 1000);

        user.refreshTokens.push({ token: refreshTokenValue, expiresAt: refreshTokenExpires });
        await user.cleanupRefreshTokens(); // Limpiar tokens viejos y guardar
        await user.save();

        sendRefreshTokenCookie(res, refreshTokenValue);

        const userResponse = user.toObject();
        delete userResponse.passwordHash;
        delete userResponse.refreshTokens;

        res.status(201).json({
            success: true,
            message: "Usuario registrado exitosamente",
            user: userResponse,
            accessToken,
        });
    } catch (error) {
        next(error);
    }
};



// MARK: - login
/**
 * Inicia sesión con credenciales de email y contraseña.
 *
 * Devuelve un objeto con un token de acceso (accessToken) y un usuario
 * sin passwordHash y refreshTokens. El token de refresco se envía
 * como cookie HttpOnly con el nombre especificado en la configuración.
 *
 * @param {Object} req - Request de Express - Contiene el body con el email y contraseña
 * @param {Object} res - Response de Express - Contiene el usuario y el token de acceso
 * @param {Function} next - Función next de Express
 * @throws {ApiError} 400 si falta email o contraseña
 * @throws {ApiError} 401 si email o contraseña son incorrectos
 */
export const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return next(new ApiError(400, 'Por favor, proporciona email y contraseña.'));
        }

        const user = await User.findOne({ email }).select('+passwordHash').select('+refreshTokens');

        if (!user) {
            return next(new ApiError(401, 'Email o contraseña incorrectos.'));
        }
        
        const isPasswordMatch = await user.comparePassword(password);
        console.log('Password match result:', isPasswordMatch);
        
        if (!isPasswordMatch) {
            return next(new ApiError(401, 'Email o contraseña incorrectos.'));
        }

        // Limpiar tokens expirados antes de añadir uno nuevo
        await user.cleanupRefreshTokens();

        const accessToken = generateAccessToken(user._id);
        const refreshTokenValue = generateRefreshToken();
        const refreshTokenExpires = new Date(Date.now() + parseInt(config.jwt.refreshExpiresIn) * 24 * 60 * 60 * 1000);

        user.refreshTokens.push({ token: refreshTokenValue, expiresAt: refreshTokenExpires });
        await user.save();

        sendRefreshTokenCookie(res, refreshTokenValue);

        const userResponse = user.toObject();
        delete userResponse.passwordHash;
        delete userResponse.refreshTokens;

        res.json({
            success: true,
            message: "Inicio de sesión exitoso",
            user: userResponse,
            accessToken,
        });
    } catch (error) {
        next(error);
    }
};



// MARK: - refreshToken
/**
 * Genera un nuevo Access Token y Refresh Token para el usuario,
 * si el token de refresco proporcionado es válido.
 *
 * @param {Object} req - Request de Express - Contiene el cookie con el token de refresco
 * @param {Object} res - Response de Express - Contiene el Access Token y el usuario
 * @param {Function} next - Función next de Express
 * @throws {ApiError} 401 si no se proporciona token de refresco
 * @throws {ApiError} 403 si el token de refresco es inválido o expirado.
 */
export const refreshToken = async (req, res, next) => {
    const incomingRefreshToken = req.cookies[config.jwt.refreshCookieName];

    if (!incomingRefreshToken) {
        return next(new ApiError(401, 'No se proporcionó token de refresco.'));
    }

    try {
        // Buscar usuario por el refresh token y que no haya expirado
        const user = await User.findOne({
            'refreshTokens.token': incomingRefreshToken,
            'refreshTokens.expiresAt': { $gt: new Date() }
        }).select('+refreshTokens'); // Asegurarse de traer refreshTokens

        if (!user) {
            // Limpiar la cookie si el token no es válido
            res.clearCookie(config.jwt.refreshCookieName, {
                httpOnly: true,
                secure: config.env === 'production',
                sameSite: 'strict',
                path: `${config.apiPrefix || '/api/v1'}/auth/refresh-token`
            });
            return next(new ApiError(403, 'Token de refresco inválido o expirado.'));
        }

        // Generar nuevo Access Token
        const newAccessToken = generateAccessToken(user._id);

        // Rotación de Refresh Token (mayor seguridad)
        const newRefreshTokenValue = generateRefreshToken();
        const newRefreshTokenExpires = new Date(Date.now() + parseInt(config.jwt.refreshExpiresIn) * 24 * 60 * 60 * 1000);

        // Actualizar el refresh token en la DB
        user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== incomingRefreshToken); // Remover el viejo
        user.refreshTokens.push({ token: newRefreshTokenValue, expiresAt: newRefreshTokenExpires }); // Añadir el nuevo
        await user.cleanupRefreshTokens(); // Limpiar otros expirados y guardar
        // Guardar usuario con el nuevo token
        await user.save();


        // Enviar la nueva cookie de refresh token
        sendRefreshTokenCookie(res, newRefreshTokenValue);

        // Enviar respuesta con el nuevo access token
        res.json({
            success: true,
            accessToken: newAccessToken
        });

    } catch (error) {
        next(error);
    }
};



// MARK: - getCurrentUser
/**
 * Obtiene el usuario actual autenticado.
 *
 * @param {Object} req - Request de Express - Contiene el usuario autenticado
 * @param {Object} res - Response de Express - Contiene el usuario autenticado
 * @param {Function} next - Función next de Express
 * @throws {ApiError} 404 si el usuario no se encuentra
 */
export const getCurrentUser = async (req, res, next) => {
    try {
        // El middleware protect ya adjuntó el usuario al request
        if (!req.user) {
            return next(new ApiError(404, 'Usuario no encontrado.'));
        }

        // Si llegamos aquí, tenemos un usuario autenticado
        res.status(200).json({
            success: true,
            user: req.user
        });
    } catch (error) {
        next(error);
    }
};



// MARK: - logout
/**
 * Cierra la sesión del usuario actual.
 *
 * @param {Object} req - Request de Express - Contiene el cookie con el token de refresco
 * @param {Object} res - Response de Express - Contiene el mensaje de éxito
 * @param {Function} next - Función next de Express
 */
export const logout = async (req, res, next) => {
    const incomingRefreshToken = req.cookies[config.jwt.refreshCookieName];

    if (incomingRefreshToken) {
        try {
            // Invalidar el refresh token en la base de datos
            await User.updateOne(
                { 'refreshTokens.token': incomingRefreshToken },
                { $pull: { refreshTokens: { token: incomingRefreshToken } } }
            );
        } catch (error) {
            // No bloquear el logout si hay error de DB, pero loguearlo
            console.error("Error invalidando refresh token en DB durante logout:", error);
        }
    }

    res.clearCookie(config.jwt.refreshCookieName, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        path: `${process.env.API_PREFIX || '/api/v1'}/auth/refresh-token`,
    });

    res.status(200).json({ success: true, message: "Logout exitoso." });
};