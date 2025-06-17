import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la categoría es requerido'],
      trim: true,
      unique: true,
      maxlength: [50, 'El nombre no puede tener más de 50 caracteres'],
    },
    imageUrl: {
      type: String,
      required: [true, 'La imagen de la categoría es requerida'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índice para búsqueda por nombre
categorySchema.index({ name: 'text' });

// Middleware para eliminar en cascada los menús asociados
categorySchema.pre('remove', async function (next) {
  await this.model('MenuItem').updateMany(
    { category: this._id },
    { $set: { category: null } }
  );
  next();
});

const Category = mongoose.model('Category', categorySchema);

export default Category;
