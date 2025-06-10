import userModel from "../models/User.js";

/**
 * Agrega un item al carrito de un usuario.
 * 
 * @param {Object} req - El objeto de solicitud que contiene el id del usuario y el id del item.
 * @param {Object} res - El objeto de respuesta que se env a al cliente.
 * @returns {Object} Un objeto JSON que contiene el estado de la operaci n y un mensaje.
 */
const addToCart = async (req, res) => {
  try {
    let userData = await userModel.findById(req.user._id)
    let cartData = await userData.cartData;

    if (!cartData[req.body.itemId]) {
      cartData[req.body.itemId] = 1
    } else {
      cartData[req.body.itemId]++
    }

    await userModel.findByIdAndUpdate(req.user._id, { cartData })
    res.json({ success: true, message: "Item agregado al carrito" })

  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Error al agregar el item al carrito" })
  }
}

/**
 * Quita un item del carrito de un usuario.
 * 
 * @param {Object} req - El objeto de solicitud que contiene el id del usuario y el id del item.
 * @param {Object} res - El objeto de respuesta que se env a al cliente.
 * @returns {Object} Un objeto JSON que contiene el estado de la operaci n y un mensaje.
 */
const removeFromCart = async (req, res) => {
  try {
    let userData = await userModel.findById(req.user._id)
    let cartData = await userData.cartData;

    if (cartData[req.body.itemId] > 0) {
      cartData[req.body.itemId]--
    }

    await userModel.findByIdAndUpdate(req.user._id, { cartData })
    res.json({ success: true, message: "Item quitado del carrito" })

  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Error al quitar el item del carrito" })
  }
}

/**
 * Obtiene el carrito de un usuario.
 * 
 * @param {Object} req - El objeto de solicitud que contiene el id del usuario.
 * @param {Object} res - El objeto de respuesta que se env a al cliente.
 * @returns {Object} Un objeto JSON que contiene el estado de la operaci n y el carrito.
 */
const getCart = async (req, res) => {
  try {
    let userData = await userModel.findById(req.user._id)

    let cartData = await userData.cartData;
    res.json({ success: true, cartData })
  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Error al obtener el carrito" })
  }
}

/**
 * Vacía el carrito de un usuario.
 * 
 * @param {Object} req - El objeto de solicitud que contiene el id del usuario.
 * @param {Object} res - El objeto de respuesta que se env a al cliente.
 * @returns {Object} Un objeto JSON que contiene el estado de la operaci n y un mensaje.
 */
const clearCart = async (req, res) => {
  try {
    let cartData = {};

    await userModel.findByIdAndUpdate(req.user._id, { cartData })
    res.json({ success: true, message: "Carrito vaciado" })

  } catch (error) {
    console.log(error)
    res.json({ success: false, message: "Error al vaciar el carrito" })
  }
}

export { addToCart, removeFromCart, getCart, clearCart }
