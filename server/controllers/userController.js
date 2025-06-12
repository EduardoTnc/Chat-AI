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
        res.status(200).json({ success: true, users });
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

    console.log('Creando usuario...', req.body);

    try {
        // Use passwordHash instead of password to trigger the pre-save hook
        const user = await User.create({
            name,
            email,
            passwordHash: password, // This will be hashed by the pre-save hook
            role
        });

        // Remove sensitive data before sending response
        const userResponse = user.toObject();
        delete userResponse.passwordHash;
        delete userResponse.refreshTokens;

        res.status(201).json({
            success: true,
            message: 'Usuario creado correctamente',
            user: userResponse
        });
    } catch (error) {
        console.error('Error creating user:', error);
        next(new ApiError(500, `Error al crear el usuario: ${error.message}`));
    }
};

// Admin: Actualizar un usuario (ej. rol)
export const updateUserByAdmin = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { role: req.body.role } },
            { new: true, runValidators: true }
        ).setOptions({ withDeleted: true });
        
        if (!user) {
            return next(new ApiError(404, 'Usuario no encontrado'));
        }

        res.status(200).json({
            success: true,
            message: 'Usuario actualizado correctamente',
            user
        });
    } catch (error) {
        next(new ApiError(500, 'Error al actualizar el usuario'));
    }
};

// Admin: Borrado lógico de un usuario
export const deleteUserByAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.userId).setOptions({ withDeleted: true });
        
        if (!user) {
            return next(new ApiError(404, 'Usuario no encontrado'));
        }

        if (user.isDeleted) {
            return next(new ApiError(400, 'El usuario ya ha sido eliminado'));
        }

        await user.softDelete();
        
        res.status(200).json({
            success: true,
            message: 'Usuario eliminado correctamente'
        });
    } catch (error) {
        next(new ApiError(500, 'Error al eliminar el usuario'));
    }
};

// Admin: Obtener todos los usuarios eliminados
export const getDeletedUsers = async (req, res, next) => {
    try {
        const users = await User.find({ isDeleted: true }).setOptions({ withDeleted: true });
        
        res.status(200).json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        next(new ApiError(500, 'Error al obtener usuarios eliminados'));
    }
};

// Admin: Restaurar un usuario eliminado
export const restoreUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { $set: { isDeleted: false }, $unset: { deletedAt: 1 } },
            { new: true, runValidators: true }
        ).setOptions({ withDeleted: true });
        
        if (!user) {
            return next(new ApiError(404, 'Usuario no encontrado'));
        }

        res.status(200).json({
            success: true,
            message: 'Usuario restaurado correctamente',
            user
        });
    } catch (error) {
        next(new ApiError(500, 'Error al restaurar el usuario'));
    }
};
