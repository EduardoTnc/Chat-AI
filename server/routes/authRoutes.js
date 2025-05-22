import express from 'express';
import { login, register, getCurrentUser, logout, refreshToken } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout); // Ruta para invalidar tokens si usas una blacklist, o solo para el cliente
router.get('/me', protect, getCurrentUser); // Obtener información del usuario logueado

export default router;