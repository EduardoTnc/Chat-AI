import menuItemModel from "../models/menuItemModel.js"
import fs from 'fs'
import { ApiError } from "../utils/errorHandler.js";

// agregra un menuItem
const addMenuItem = async (req, res) => {
  try {
    let image_filename = `${req.file.filename}`;

    const menuItem = new menuItemModel({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      imageUrl: image_filename,
    })

    await menuItem.save()

    res.json({ success: true, message: "menuItem agregado correctamente", menuItem })

  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Error al agregar el menuItem" })
  }
}

// lista todos los menuItems
const listMenuItems = async (req, res) => {
  try {
    const menuItems = await menuItemModel.find()
    res.json({ success: true, message: "menuItems listados correctamente", menuItems })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Error al listar los menuItems" })
  }
}

// lista todos los menuItems (incluyendo los eliminados)
const listAllMenuItems = async (req, res, next) => {
  try {
    const menuItems = await menuItemModel.find().setOptions({ withDeleted: true });
    res.json({
      success: true,
      message: "Todos los ítems del menú listados correctamente",
      menuItems
    });
  } catch (error) {
    console.error('Error al listar todos los ítems:', error);
    next(new ApiError(500, 'Error al listar los ítems del menú'));
  }
}

// lista un menuItem
const listMenuItem = async (req, res) => {
  try {
    const menuItem = await menuItemModel.findById(req.params.id)
    res.json({ success: true, message: "menuItem listado correctamente", menuItem })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Error al listar el menuItem" })
  }
}

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
    res.json({ success: true, message: "MenuItem eliminado lógicamente", data: menuItem });
  } catch (error) {
    next(error);
  }
};

// Actualiza un menuItem con los campos proporcionados


const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // Buscar el item actual para verificar si se está actualizando la imagen
    const currentItem = await menuItemModel.findById(id);
    if (!currentItem) {
      return next(new ApiError(404, 'Menu Item no encontrado.'));
    }

    // Si se está subiendo una nueva imagen, eliminar la anterior
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

    // Actualizar solo los campos proporcionados
    const updatedItem = await menuItemModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Menu Item actualizado correctamente',
      updatedItem
    });
  } catch (error) {
    console.error('Error al actualizar el menu item:', error);
    next(new ApiError(500, 'Error al actualizar el Menu Item'));
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

// Obtener todas las categorías únicas
const getUniqueCategories = async (req, res, next) => {
  try {
    const categories = await menuItemModel.distinct('category');
    res.json({
      success: true,
      message: "Categorías obtenidas correctamente",
      data: categories
    });
  } catch (error) {
    console.error('Error al obtener las categorías:', error);
    next(new ApiError(500, 'Error al obtener las categorías'));
  }
};

// Buscar ítems del menú
const searchMenuItems = async (req, res, next) => {
  try {
    const { query, category, maxPrice, limit = 5 } = req.query;
    
    if (!query) {
      return next(new ApiError(400, 'El parámetro de búsqueda es requerido'));
    }

    const searchQuery = {
      $and: [
        { deleted: { $ne: true } }, // No incluir eliminados
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { category: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    };

    // Aplicar filtros adicionales si se proporcionan
    if (category) {
      searchQuery.$and.push({ category: { $regex: new RegExp(`^${category}$`, 'i') } });
    }
    
    if (maxPrice) {
      searchQuery.$and.push({ price: { $lte: parseFloat(maxPrice) } });
    }

    const items = await menuItemModel.find(searchQuery)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      message: 'Búsqueda completada',
      data: items
    });
  } catch (error) {
    console.error('Error al buscar ítems del menú:', error);
    next(new ApiError(500, 'Error al buscar ítems del menú'));
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