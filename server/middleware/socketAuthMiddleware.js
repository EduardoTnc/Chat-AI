import jwt from 'jsonwebtoken';
import User from '../models/User.js'; 

const authenticateSocket = async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers['x-auth-token'];

    if (!token) {
        console.warn('Socket: Conexión sin token.');
        return next(new Error('Authentication error: No token provided'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-passwordHash');

        if (!user) {
            console.warn(`Socket Auth: Usuario no encontrado para ID ${decoded.userId}`);
            return next(new Error('Authentication error: User not found'));
        }

        socket.user = user; // Adjuntar el usuario al objeto socket
        console.log(`Socket autenticado para usuario: ${user.email} (ID: ${user._id})`);
        next();
    } catch (error) {
        console.error('Socket Auth Error:', error.message);
        if (error.name === 'JsonWebTokenError') {
            return next(new Error('Authentication error: Invalid token'));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Authentication error: Token expired'));
        }
        return next(new Error('Authentication error'));
    }
};

export { authenticateSocket };