import menuItemModel from "../models/menuItemModel.js"
import fs from 'fs'
import mongoose from 'mongoose';
import { ApiError } from "../utils/errorHandler.js";

// Agrega un ítem al menú
const addMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, category } = req.body;
    
    if (!req.file) {
      return next(new ApiError(400, 'La imagen es requerida'));
    }

    // Validar que la categoría exista
    const categoryExists = await mongoose.model('Category').findById(category);
    if (!categoryExists) {
      return next(new ApiError(400, 'La categoría especificada no existe'));
    }

    const menuItem = new menuItemModel({
      name,
      description,
      price: parseFloat(price),
      category,
      imageUrl: req.file.filename,
    });

    await menuItem.save();
    await menuItem.populate('category', 'name imageUrl');

    res.status(201).json({ 
      success: true, 
      message: "Ítem del menú agregado correctamente", 
      menuItem 
    });

  } catch (error) {
    console.error('Error al agregar ítem del menú:', error);
    next(new ApiError(500, 'Error al agregar el ítem del menú', error.message));
  }
};

// Lista todos los ítems del menú (excluyendo eliminados)
const listMenuItems = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { isDeleted: { $ne: true } };
    
    if (category) {
      query.category = mongoose.Types.ObjectId(category);
    }

    const menuItems = await menuItemModel.find(query)
      .populate('category', 'name imageUrl')
      .sort({ createdAt: -1 });
      
    res.json({ 
      success: true, 
      message: "Ítems del menú listados correctamente", 
      menuItems 
    });
  } catch (error) {
    console.error('Error al listar ítems del menú:', error);
    next(new ApiError(500, 'Error al listar los ítems del menú'));
  }
};

// Lista todos los ítems del menú (incluyendo eliminados)
const listAllMenuItems = async (req, res, next) => {
  try {
    const menuItems = await menuItemModel.find()
      .populate('category', 'name imageUrl')
      .setOptions({ withDeleted: true })
      .sort({ isDeleted: 1, name: 1 });
      
    res.json({
      success: true,
      message: "Todos los ítems del menú listados correctamente",
      menuItems
    });
  } catch (error) {
    console.error('Error al listar todos los ítems:', error);
    next(new ApiError(500, 'Error al listar los ítems del menú'));
  }
};

// Obtiene un ítem del menú por ID
const listMenuItem = async (req, res, next) => {
  try {
    const menuItem = await menuItemModel.findById(req.params.id)
      .populate('category', 'name imageUrl');
      
    if (!menuItem) {
      return next(new ApiError(404, 'Ítem del menú no encontrado'));
    }
    
    res.json({ 
      success: true, 
      message: "Ítem del menú encontrado", 
      menuItem 
    });
  } catch (error) {
    console.error('Error al obtener el ítem del menú:', error);
    next(new ApiError(500, 'Error al obtener el ítem del menú'));
  }
};

// elimina (lógicamente) un menuItem
const removeMenuItem = async (req, res, next) => {
  try {
    const menuItem = await menuItemModel.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!menuItem) {
      return next(new ApiError(404, 'Menu Item no encontrado.'));
    }
    // No eliminar la imagen físicamente, podrías querer restaurarla.
    res.json({ success: true, message: "MenuItem eliminado lógicamente", menuItem });
  } catch (error) {
    next(error);
  }
};

// Actualiza un ítem del menú con los campos proporcionados
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Buscar el ítem actual
    const currentItem = await menuItemModel.findById(id);
    if (!currentItem) {
      return next(new ApiError(404, 'Ítem del menú no encontrado'));
    }

    // Si se está actualizando la categoría, validar que exista
    if (updates.category) {
      const categoryExists = await mongoose.model('Category').findById(updates.category);
      if (!categoryExists) {
        return next(new ApiError(400, 'La categoría especificada no existe'));
      }
    }

    // Manejo de la imagen
    if (req.file) {
      updates.imageUrl = req.file.filename;
      // Eliminar la imagen anterior si existe
      if (currentItem.imageUrl) {
        try {
          fs.unlinkSync(`uploads/${currentItem.imageUrl}`);
        } catch (err) {
          console.error('Error al eliminar la imagen anterior:', err);
        }
      }
    } else if (updates.imageUrl === undefined) {
      // Si no se está actualizando la imagen, mantener la existente
      delete updates.imageUrl;
    }

    // Convertir el precio a número si está presente
    if (updates.price) {
      updates.price = parseFloat(updates.price);
    }

    // Actualizar el ítem
    const updatedItem = await menuItemModel
      .findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate('category', 'name imageUrl');

    res.json({
      success: true,
      message: 'Ítem del menú actualizado correctamente',
      updatedItem
    });
  } catch (error) {
    console.error('Error al actualizar el ítem del menú:', error);
    next(new ApiError(500, 'Error al actualizar el ítem del menú', error.message));
  }
};


// Restaurar un ítem eliminado
const restoreMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Primero verificamos si el ítem existe
    const existingItem = await menuItemModel.findById(id).setOptions({ withDeleted: true });
    if (!existingItem) {
      return next(new ApiError(404, 'Ítem no encontrado.'));
    }

    // Si el ítem no está eliminado, retornamos un error
    if (!existingItem.isDeleted) {
      return next(new ApiError(400, 'El ítem no está eliminado.'));
    }

    // Actualizamos el ítem para restaurarlo
    // Usamos $set y $unset en operaciones separadas para evitar conflictos
    const update = {
      $set: { isDeleted: false },
      $unset: { deletedAt: '' }
    };

    const menuItem = await menuItemModel.findByIdAndUpdate(
      id,
      update,
      {
        new: true,
        runValidators: true
      }
    ).setOptions({ withDeleted: true });

    res.json({
      success: true,
      message: 'Ítem restaurado correctamente',
      menuItem
    });
  } catch (error) {
    console.error('Error al restaurar el ítem:', error);
    next(new ApiError(500, 'Error al restaurar el ítem'));
  }
};

// Obtener todas las categorías únicas con información de los ítems
const getUniqueCategories = async (req, res, next) => {
  try {
    // Obtener categorías únicas que están siendo usadas en ítems no eliminados
    const categories = await menuItemModel.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$category' } },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $project: {
          _id: 1,
          name: '$categoryInfo.name',
          imageUrl: '$categoryInfo.imageUrl',
          itemCount: 1
        }
      }
    ]);

    // Contar ítems por categoría
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await menuItemModel.countDocuments({
          category: category._id,
          isDeleted: { $ne: true }
        });
        return {
          ...category,
          itemCount: count
        };
      })
    );

    res.json({
      success: true,
      message: "Categorías obtenidas correctamente",
      data: categoriesWithCounts
    });
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    next(new ApiError(500, 'Error al obtener las categorías'));
  }
};

// Buscar ítems del menú con filtros avanzados
const searchMenuItems = async (req, res, next) => {
  try {
    const { query, category, maxPrice, minPrice, limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const searchQuery = {
      isDeleted: { $ne: true },
      $or: [
        { name: { $regex: query || '', $options: 'i' } },
        { description: { $regex: query || '', $options: 'i' } },
      ]
    };

    // Aplicar filtros adicionales
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      searchQuery.category = new mongoose.Types.ObjectId(category);
    }
    
    if (maxPrice || minPrice) {
      searchQuery.price = {};
      if (maxPrice) searchQuery.price.$lte = parseFloat(maxPrice);
      if (minPrice) searchQuery.price.$gte = parseFloat(minPrice);
    }

    // Búsqueda con conteo total para paginación
    const [items, total] = await Promise.all([
      menuItemModel.find(searchQuery)
        .populate('category', 'name imageUrl')
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      menuItemModel.countDocuments(searchQuery)
    ]);

    res.json({
      success: true,
      message: 'Búsqueda completada',
      data: {
        items,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error al buscar ítems del menú:', error);
    next(new ApiError(500, 'Error al buscar ítems del menú', error.message));
  }
};

export {
  addMenuItem,
  listMenuItems,
  listMenuItem,
  listAllMenuItems,
  removeMenuItem,
  updateMenuItem,
  restoreMenuItem,
  getUniqueCategories,
  searchMenuItems
}