import orderModel from "../models/orderModel.js";
import userModel from "../models/User.js";

// Tomar orden del frontend
const placeOrder = async (req, res) => {

    const urlFrontendCliente = "http://localhost:5173"

    try {
        const newOrder = new orderModel({
            userId: req.user._id,
            items: req.body.items,
            totalAmount: req.body.totalAmount,
            deliveryAddress: req.body.deliveryAddress,
            paymentMethod: req.body.paymentMethod,
            payment: false,
            status: "Procesando Orden",
            date: Date.now()
        })
        console.log(newOrder)
        await newOrder.save();
        await userModel.findByIdAndUpdate(req.user._id, { cartData: {} })

        // Lógica para procesar con la pasarela de pagos de Culqi
        if (req.body.paymentMethod === "Culqi") {
            // const order = {
            //     amount: req.body.totalAmount,
            //     currency: "PEN",
            //     description: "Orden de compra",
            //     source: req.body.source,
            //     metadata: {
            //         userId: req.body.userId,
            //         orderId: newOrder._id
            //     }
            // }
            // const session = await culqi.orders.create(order)
            // res.json({ success: true, message: "Orden creada exitosamente", session_url: session.url })
            res.json({ success: false, message: "Error al crear la orden: aún no se implementó la pasarela de pagos de Culqi" })
        } else if (req.body.paymentMethod === "Cash on Delivery") {
            res.json({ success: true, message: "Orden creada exitosamente", session_url: `${urlFrontendCliente}/orden-recibida/${newOrder._id}?success=true` })
        } else {
            res.json({ success: false, message: "Error al crear la orden: método de pago no válido" })
        }
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Error al crear la orden" })
    }
}


// lista todas las ordenes de un usuario
const listOrders = async (req, res) => {
    try {
        const orders = await orderModel.find({ userId: req.user._id })
        res.json({ success: true, message: "Ordenes listadas correctamente", orders })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Error al listar las ordenes" })
    }
}


// Listar ordenes para el panel de administrador
const listOrdersAdmin = async (req, res) => {
    try {
        const orders = await orderModel.find({})
        res.json({ success: true, message: "Ordenes listadas correctamente", orders })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Error al listar las ordenes" })
    }
}

//  API para actualizar el estado de una orden
const updateOrderStatus = async (req, res) => {
    try {
        const order = await orderModel.findByIdAndUpdate(req.body.orderId, { status: req.body.status })
        res.json({ success: true, message: "Estado de la orden actualizado" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Error al actualizar el estado de la orden" })
    }
}

export { placeOrder, listOrders, listOrdersAdmin, updateOrderStatus }