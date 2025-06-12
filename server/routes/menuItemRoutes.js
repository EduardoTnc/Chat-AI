import express from "express"
import { 
  addMenuItem, 
  listMenuItems, 
  listMenuItem, 
  listAllMenuItems, 
  removeMenuItem, 
  updateMenuItem, 
  restoreMenuItem,
  getUniqueCategories 
} from "../controllers/menuItemController.js"
import multer from "multer"
import { protect, authorize } from "../middleware/authMiddleware.js"

const menuItemRouter = express.Router();

// Configuración de multer
const storage = multer.diskStorage({
  destination: "uploads",
  filename: (req, file, cb) => {
    return cb(null, `${Date.now()} ${file.originalname}`)
  }
})

const upload = multer({storage:storage})

menuItemRouter.post("/add", protect, authorize("admin"), upload.single("imageUrl"), addMenuItem)
menuItemRouter.get("/list-all", protect, authorize("admin"), listAllMenuItems)
menuItemRouter.get("/list", listMenuItems)
menuItemRouter.get("/list/:id", listMenuItem)
menuItemRouter.delete("/remove/:id", protect, authorize("admin"), removeMenuItem)
menuItemRouter.put("/update/:id", protect, authorize("admin"), upload.single("imageUrl"), updateMenuItem)
menuItemRouter.put("/restore/:id", protect, authorize("admin"), restoreMenuItem);
menuItemRouter.get('/categories', protect, getUniqueCategories);

export default menuItemRouter;