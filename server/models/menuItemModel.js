import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'El nombre del ítem es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  description: { 
    type: String, 
    required: [true, 'La descripción es requerida'],
    trim: true,
    maxlength: [500, 'La descripción no puede tener más de 500 caracteres']
  },
  price: { 
    type: Number, 
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  category: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'La categoría es requerida'],
    index: true
  },
  imageUrl: { 
    type: String, 
    required: [true, 'La URL de la imagen es requerida']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isDeleted: { 
    type: Boolean, 
    default: false, 
    index: true 
  },
  deletedAt: { 
    type: Date, 
    default: null 
  },
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
menuItemSchema.index({ name: 'text', description: 'text' });

// Hook pre-find para soft delete
menuItemSchema.pre(/^find/, function(next) {
  // Solo aplicar el filtro si withDeleted no es true
  if (this.getOptions().withDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

// Virtual para popular la categoría
menuItemSchema.virtual('categoryDetails', {
  ref: 'Category',
  localField: 'category',
  foreignField: '_id',
  justOne: true
});

// Middleware para validar que la categoría exista
menuItemSchema.pre('save', async function(next) {
  if (this.isModified('category')) {
    try {
      const Category = mongoose.model('Category');
      const categoryExists = await Category.exists({ _id: this.category, isDeleted: { $ne: true } });
      
      if (!categoryExists) {
        throw new Error('La categoría especificada no existe o ha sido eliminada');
      }
    } catch (error) {
      next(error);
    }
  }
  next();
});

const menuItemModel = mongoose.models.menuItem || mongoose.model("menuItem", menuItemSchema);

export default menuItemModel;