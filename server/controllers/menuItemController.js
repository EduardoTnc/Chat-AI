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

    res.json({success: true , message: "menuItem agregado correctamente"})
    
  } catch (error) {
    console.log(error)
    res.json({success: false , message: "Error al agregar el menuItem"})
  }
}

// lista todos los menuItems
const listMenuItems = async (req, res) => {
  try {
    const menuItems = await menuItemModel.find()
    res.json({success: true , message: "menuItems listados correctamente", menuItems})
  } catch (error) {
    console.log(error)
    res.json({success: false , message: "Error al listar los menuItems"})
  }
}

// lista un menuItem
const listMenuItem = async (req, res) => {
  try {
    const menuItem = await menuItemModel.findById(req.params.id)
    res.json({success: true , message: "menuItem listado correctamente", menuItem})
  } catch (error) {
    console.log(error)
    res.json({success: false , message: "Error al listar el menuItem"})
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

// actualiza un menuItem
const updateMenuItem = async (req, res) => {
  try {
    const menuItem = await menuItemModel.findByIdAndUpdate(req.params.id, req.body)
    fs.unlinkSync(`uploads/${menuItem.imageUrl}`, () => {
      console.log("Archivo eliminado")
    })
    res.json({success: true , message: "menuItem actualizado correctamente", menuItem})
  } catch (error) {
    console.log(error)
    res.json({success: false , message: "Error al actualizar el menuItem"})
  }
}

export {
  addMenuItem,
  listMenuItems,
  listMenuItem,
  removeMenuItem,
  updateMenuItem
}