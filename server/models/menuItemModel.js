import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  name: {type: String, required: true},
  description: {type: String, required: true},
  price: {type: Number, required: true},
  category: {type: String, required:true},
  imageUrl: {type: String, required:true}
})

const menuItemModel = mongoose.models.menuItem || mongoose.model("menuItem", menuItemSchema)

export default menuItemModel