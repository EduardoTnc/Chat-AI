import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const refreshTokenSchema = new mongoose.Schema({
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    // Podría añadir IP, User-Agent para seguridad adicional
});

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        lowercase: true,
        trim: true,
    },
    passwordHash: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        select: false,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'agent'],
        default: 'user',
    },
    refreshTokens: [refreshTokenSchema], // Array para almacenar refresh tokens válidos
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
});

/**
 * Compara una contraseña candidata con la contraseña hash del usuario.
 * @param {string} candidatePassword - Contraseña candidata para comparar.
 * @returns {Promise<boolean>} Promesa que resuelve a true si las contraseñas coinciden, false en caso contrario.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.passwordHash) {
        console.log('No passwordHash found for user during comparison');
        return false;
    }
    console.log('Comparing passwords - candidatePassword exists:', !!candidatePassword);
    console.log('Comparing with hashed password in DB:', this.passwordHash.substring(0, 10) + '...');
    
    try {
        const isMatch = await bcrypt.compare(candidatePassword, this.passwordHash);
        console.log('Password comparison result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('Error comparing passwords:', error.message);
        return false;
    }
};

/**
 * Limpia los tokens de refresco expirados del array refreshTokens
 * del usuario y guarda los cambios en la base de datos.
 * @returns {Promise} Promesa que se resuelve cuando se guardan los cambios
 */
userSchema.methods.cleanupRefreshTokens = function () {
    this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > new Date());
    return this.save();
};

const User = mongoose.model('User', userSchema);
export default User;