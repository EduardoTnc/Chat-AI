import Category from '../models/Category.js';
import mongoose from 'mongoose';
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

    // Verifica si el nombre está siendo actualizado y si ya existe
    if (req.body.name && req.body.name !== category.name) {
      const categoryExists = await Category.findOne({ name: req.body.name });
      if (categoryExists) {
        return next(new ApiError(400, 'Ya existe una categoría con ese nombre'));
      }
    }

    // Maneja la subida de una nueva imagen si se proporciona
    if (req.file) {
      // Si había una imagen anterior, la elimina
      if (category.imageUrl) {
        try {
          const oldImagePath = path.join(__dirname, '../../', category.imageUrl);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.error('Error deleting old image:', error);
          // Continúa incluso si la eliminación de la imagen anterior falla
        }
      }
      // Establece la nueva URL de la imagen
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

    // Elimina la imagen si existe
    if (category.imageUrl) {
      try {
        const imagePath = path.join(process.cwd(), category.imageUrl);
        await fs.unlink(imagePath);
      } catch (error) {
        // Si el archivo no existe o hay otro error, registra el error pero continua
        console.error('Error eliminando la imagen de la categoría:', error);
        // Continúa con la eliminación de la categoría incluso si la eliminación de la imagen falla
      }
    }

    // Elimina la categoría
    await Category.findByIdAndDelete(req.params.id);

    // Elimina esta categoría de cualquier elemento de menú que la esté referenciando
    await mongoose.model('menuItem').updateMany(
      { category: req.params.id },
      { $unset: { category: "" } }
    );

    res.status(200).json({
      success: true,
      data: {},
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar la categoría:', error);
    next(new ApiError(500, 'Error al eliminar la categoría', error.message));
  }
};
