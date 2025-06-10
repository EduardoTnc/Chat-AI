import express from "express";
import { addToCart, clearCart, getCart, removeFromCart } from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const cartRouter = express.Router();

cartRouter.post("/add", protect, addToCart);
cartRouter.post("/remove", protect, removeFromCart);
cartRouter.post("/get", protect, getCart);
cartRouter.post("/clear", protect, clearCart);

export default cartRouter;