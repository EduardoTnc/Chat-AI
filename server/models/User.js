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
    cartData: { type: Object, default: {} },
    refreshTokens: [refreshTokenSchema], // Array para almacenar refresh tokens válidos
    isDeleted: { 
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: { 
        type: Date,
        default: null,
    }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
    if (!this.isModified('passwordHash')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
});

// Hook pre-find para filtrar automáticamente los borrados lógicamente
// Método para eliminación lógica
userSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

// Método estático para encontrar usuarios eliminados
userSchema.statics.findDeleted = function() {
  return this.find({ isDeleted: true });
};

// Método estático para restaurar usuarios
export const restoreUser = async (id) => {
  return this.findByIdAndUpdate(
    id,
    { $set: { isDeleted: false }, $unset: { deletedAt: 1 } },
    { new: true, runValidators: true }
  ).setOptions({ withDeleted: true });
};

// Hook para filtrar usuarios eliminados en las consultas
userSchema.pre(/^find/, function(next) {
  // Si la query no especifica lo contrario, solo mostrar los no borrados
  if (this.getOptions().withDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
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

userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        delete returnedObject.passwordHash;
        delete returnedObject.refreshTokens;
        return returnedObject;
    }
});

const User = mongoose.model('User', userSchema);
export default User;