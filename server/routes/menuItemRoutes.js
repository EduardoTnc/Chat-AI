import express from "express"
import { 
  addMenuItem, 
  listMenuItems, 
  listMenuItem, 
  listAllMenuItems, 
  removeMenuItem, 
  updateMenuItem, 
  restoreMenuItem,
  getUniqueCategories,
  searchMenuItems
} from "../controllers/menuItemController.js"
import multer from "multer";
import { protect, authorize } from "../middleware/authMiddleware.js";
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const menuItemRouter = express.Router();

// Configuración de multer con sanitización de nombres de archivo
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Create a subdirectory for menu items
      const dest = join(process.cwd(), 'uploads/menu-items');
      // Ensure directory exists
      await fs.mkdir(dest, { recursive: true });
      cb(null, dest);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize filename: replace spaces with underscores and remove special characters
    const sanitizedFilename = `${Date.now()}_${file.originalname.replace(/[^\w\d.-]/g, '_').replace(/\s+/g, '_')}`;
    return cb(null, sanitizedFilename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return cb(new Error('Solo se permiten archivos de imagen (jpg, jpeg, png, gif, webp)'), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

menuItemRouter.post("/add", protect, authorize("admin"), upload.single("imageUrl"), addMenuItem)
menuItemRouter.get("/list-all", protect, authorize("admin"), listAllMenuItems)
menuItemRouter.get("/list", listMenuItems)
menuItemRouter.get("/list/:id", listMenuItem)
menuItemRouter.delete("/remove/:id", protect, authorize("admin"), removeMenuItem)
menuItemRouter.put("/update/:id", protect, authorize("admin"), upload.single("imageUrl"), updateMenuItem)
menuItemRouter.put("/restore/:id", protect, authorize("admin"), restoreMenuItem);
menuItemRouter.get('/categories', protect, getUniqueCategories);
menuItemRouter.get('/search', searchMenuItems);

export default menuItemRouter;