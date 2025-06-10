import mongoose from "mongoose"

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: { type: Array, required: true },
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: Object, required: true },
  paymentMethod: { type: String, required: true },
  payment: { type: Boolean, default: false },
  status: { type: String, default: "Procesando Orden" },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

// Hook pre-find para soft delete
orderSchema.pre(/^find/, function(next) {
    if (this.getOptions().withDeleted !== true) {
        this.where({ isDeleted: { $ne: true } });
    }
    next();
});

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema)

export default orderModel