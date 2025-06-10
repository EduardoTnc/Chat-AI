import express from "express";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { placeOrder, listOrders, listOrdersAdmin, updateOrderStatus } from "../controllers/orderController.js";

const orderRouter = express.Router();

orderRouter.post("/place", protect, placeOrder);
orderRouter.post("/list", protect, listOrders);
orderRouter.get("/list-admin", protect, authorize("admin"), listOrdersAdmin);
orderRouter.put("/status", protect, authorize("admin"), updateOrderStatus);

export default orderRouter;
