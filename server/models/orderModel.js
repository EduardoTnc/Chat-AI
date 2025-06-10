import mongoose from "mongoose"

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: { type: Array, required: true },
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: Object, required: true },
  paymentMethod: { type: String, required: true },
  payment: { type: Boolean, default: false },
  status: { type: String, default: "Procesando Orden" },
  date: { type: Date, default: Date.now }
})

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema)

export default orderModel