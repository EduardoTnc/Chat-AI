import { Router } from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import multer from 'multer';

// Configuración de multer con sanitización de nombres de archivo
const storage = multer.diskStorage({
  destination: "uploads/categories",
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

const router = Router();

// Public routes
router.route('/').get(getCategories);
router.route('/:id').get(getCategory);

// Protected routes (Admin only)
router.use(protect, authorize('admin'));

router
  .route('/')
  .post(upload.single('image'), createCategory);

router
  .route('/:id')
  .put(upload.single('image'), updateCategory)
  .delete(deleteCategory);

export default router;
