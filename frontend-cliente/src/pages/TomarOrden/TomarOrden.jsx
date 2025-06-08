import React, { useEffect, useState } from 'react'
import { useContext } from 'react'
import { TiendaContext } from '../../context/TiendaContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import {useAuth} from '../../context/AuthContext'

const TomarOrden = () => {

  const { calcularMontoTotal, listaPlatos, carritoItems } = useContext(TiendaContext)
  const {urlApi, token} = useAuth()

  const navigate = useNavigate();

  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    department: "",
    zipCode: "",
    phone: ""
  })

  const onChangeHandler = (e) => {
    setData({ ...data, [e.target.name]: e.target.value })
  }

  const placeOrder = async (e) => {
    e.preventDefault()
    try {

      let orderItems = [];
      listaPlatos.map((item) => {
        if (carritoItems[item._id] > 0) {
          orderItems.push({
            ...item,
            quantity: carritoItems[item._id]
          })
        }
      })

      let orderData = {
        items: orderItems,
        totalAmount: calcularMontoTotal() + 10,
        deliveryAddress: data,
        paymentMethod: "Cash on Delivery",
      }
      console.log(orderData)
      const response = await axios.post(`${urlApi}/api/order/place`, orderData, { headers: { token } })
      console.log(response)
      if (response.data.success) {
        const {session_url} = response.data;
        window.location.replace(session_url);
      } else {
        alert(response.data.message)
      }
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(()=>{
    if(!token){
      navigate('/carrito')
    }
    if(carritoItems.length === 0){
      navigate('/carrito')
    }
  },[token,carritoItems,navigate])

  return (
    <form onSubmit={placeOrder} action="" className='flex flex-col md:flex-row items-center md:items-start justify-center gap-12 mt-24'>

      {/* Información de envío */}
      <div className='w-full max-w-[500px] [&_input]:border [&_input]:border-gray-300 [&_input]:rounded-full [&_input]:p-2.5 [&_input]:focus:outline-none [&_input]:w-full [&_input]:focus:border-tomato [&_input]:mb-4'>
        <p className='text-[22px] font-semibold'>Información de envío</p>
        <div className='flex gap-2.5'>
          <input required type="text" placeholder='Nombre' name="firstName" value={data.firstName} onChange={onChangeHandler} />
          <input required type="text" placeholder='Apellido' name="lastName" value={data.lastName} onChange={onChangeHandler} />
        </div>
        <div className='flex flex-col'>
          <input required type="email" placeholder='Correo electrónico' name="email" value={data.email} onChange={onChangeHandler} />
          <input required type="text" placeholder='Dirección' name="address" value={data.address} onChange={onChangeHandler} />
        </div>
        <div className='flex gap-2.5'>
          <input required type="text" placeholder='Ciudad' name="city" value={data.city} onChange={onChangeHandler} />
          <input required type="text" placeholder='Departamento' name="department" value={data.department} onChange={onChangeHandler} />
          <input required type="text" placeholder='Código Postal' name="zipCode" value={data.zipCode} onChange={onChangeHandler} />
        </div>
        <div>
          <input required type="text" placeholder='Teléfono' name="phone" value={data.phone} onChange={onChangeHandler} />
        </div>
      </div>

      {/* Resumen de la compra */}
      <div className='w-full max-w-[500px]'>
        <div className='flex flex-col flex-1 gap-5 w-full'>
          <h2 className='text-[22px] font-semibold'>Resumen de la compra</h2>
          <div className='flex flex-col gap-2'>
            <div className='flex justify-between'>
              <p>Subtotal</p>
              <p>S/.{calcularMontoTotal()}</p>
            </div>
            <div className='flex justify-between'>
              <p>Envío</p>
              <p>S/.{calcularMontoTotal() > 0 ? 10 : 0}</p>
            </div>
            <div className='flex justify-between text-[16px] font-bold'>
              <p>Total</p>
              <p>S/.{calcularMontoTotal() + (calcularMontoTotal() > 0 ? 10 : 0)}</p>
            </div>
            <hr className='text-gray-300 h-[1px] my-2.5 ' />
            <button type="submit" className='w-full bg-tomato hover:bg-tomato cursor-pointer transition-all hover:text-white hover:translate-y-[-1px] hover:shadow-[0_1px_2px_0px_#0005] text-white px-3 py-2 rounded-full max-w-[200px] self-end'>Continuar con el Pago</button>
          </div>
        </div>
      </div>
    </form>
  )
}

export default TomarOrden;