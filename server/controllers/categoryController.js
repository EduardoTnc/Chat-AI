import Category from '../models/Category.js';
import { ApiError } from '../utils/errorHandler.js';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/categories');
await fs.mkdir(uploadDir, { recursive: true });

/**
 * @desc    Create a new category
 * @route   POST /api/v1/categories
 * @access  Private/Admin
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    
    // Check if category already exists
    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return next(new ApiError(400, 'Ya existe una categoría con ese nombre'));
    }

    // Check if file exists
    if (!req.file) {
      return next(new ApiError(400, 'La imagen es requerida'));
    }
    
    // Create image URL based on the saved file
    const imageUrl = `/uploads/categories/${req.file.filename}`;

    const category = await Category.create({
      name,
      imageUrl,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all categories
 * @route   GET /api/v1/categories
 * @access  Public
 */
export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category
 * @route   GET /api/v1/categories/:id
 * @access  Public
 */
export const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ApiError(404, `Categoría no encontrada con id ${req.params.id}`));
    }

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/v1/categories/:id
 * @access  Private/Admin
 */
export const updateCategory = async (req, res, next) => {
  try {
    let category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ApiError(404, `Categoría no encontrada con id ${req.params.id}`));
    }

    // Check if name is being updated and if it's already taken
    if (req.body.name && req.body.name !== category.name) {
      const categoryExists = await Category.findOne({ name: req.body.name });
      if (categoryExists) {
        return next(new ApiError(400, 'Ya existe una categoría con ese nombre'));
      }
    }

    // Handle new image upload if provided
    if (req.file) {
      // If there was a previous image, delete it
      if (category.imageUrl) {
        try {
          const oldImagePath = path.join(__dirname, '../../', category.imageUrl);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.error('Error deleting old image:', error);
          // Continue even if old image deletion fails
        }
      }
      // Set new image URL
      req.body.imageUrl = `/uploads/categories/${req.file.filename}`;
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/v1/categories/:id
 * @access  Private/Admin
 */
export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return next(new ApiError(404, `Categoría no encontrada con id ${req.params.id}`));
    }

    // Delete the image file if it exists
    if (category.imageUrl) {
      try {
        const imagePath = path.join(__dirname, '../../', category.imageUrl);
        await fs.unlink(imagePath);
      } catch (error) {
        console.error('Error eliminando la imagen de la categoría:', error);
        // Continue with category deletion even if image deletion fails
      }
    }

    // Soft delete
    await category.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
