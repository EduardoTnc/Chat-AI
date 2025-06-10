import menuItemModel from "../models/menuItemModel.js"
import fs from 'fs'

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

// elimina un menuItem
const removeMenuItem = async (req, res) => {
  try {
    const menuItem = await menuItemModel.findByIdAndDelete(req.params.id)
    fs.unlinkSync(`uploads/${menuItem.imageUrl}`, () => {
      console.log("Archivo eliminado")
    })
    res.json({success: true , message: "menuItem eliminado correctamente", menuItem})
  } catch (error) {
    console.log(error)
    res.json({success: false , message: "Error al eliminar el menuItem"})
  }
}

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