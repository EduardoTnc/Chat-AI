import User from '../models/User.js';
import { ApiError } from '../utils/errorHandler.js';

// Admin: Obtener todos los usuarios (incluyendo borrados si se especifica)
export const getAllUsers = async (req, res, next) => {
    try {
        const { withDeleted = false } = req.query;
        const query = User.find();
        if (withDeleted) {
            query.setOptions({ withDeleted: true });
        }
        const users = await query.select('-passwordHash -refreshTokens'); // Nunca devolver estos campos
        res.status(200).json({ success: true, data: users });
    } catch (error) {
        next(error);
    }
};

// Admin: Crear un usuario (agent o admin)
export const createUserByAdmin = async (req, res, next) => {
    const { name, email, password, role } = req.body;
    if (!['admin', 'agent'].includes(role)) {
        return next(new ApiError(400, 'Solo se pueden crear usuarios con rol "admin" o "agent" desde este endpoint.'));
    }
    // Lógica de registro similar a authController, pero sin generar tokens de sesión
    res.status(501).json({ success: false, message: 'Endpoint no implementado.' });
};

// Admin: Actualizar un usuario (ej. rol)
export const updateUserByAdmin = async (req, res, next) => {
    // Lógica para actualizar usuario
    res.status(501).json({ success: false, message: 'Endpoint no implementado.' });
};

// Admin: Borrado lógico de un usuario
export const deleteUserByAdmin = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndUpdate(
            userId,
            { isDeleted: true, deletedAt: new Date() },
            { new: true }
        );
        if (!user) return next(new ApiError(404, 'Usuario no encontrado.'));
        res.status(200).json({ success: true, message: 'Usuario borrado lógicamente.' });
    } catch (error) {
        next(error);
    }
};
