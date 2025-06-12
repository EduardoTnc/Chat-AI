import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  imageUrl: { type: String, required: true },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// Hook pre-find para soft delete
menuItemSchema.pre(/^find/, function(next) {
  // Solo aplicar el filtro si withDeleted no es true
  if (this.getOptions().withDeleted !== true) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

const menuItemModel = mongoose.models.menuItem || mongoose.model("menuItem", menuItemSchema)

export default menuItemModel