import React, { useState } from 'react'
import axios from 'axios'
import { useEffect } from 'react'
import { assets } from '../../assets/assets'
import { useAuth } from '../../context/AuthContext'

const MisOrdenes = () => {

  const { urlApi, token } = useAuth()
  const [ordersData, setOrdersData] = useState([])

  const fetchOrders = async () => {
    try {
      const response = await axios.post(`${urlApi}/api/order/list`, {}, { headers: { token } })
      if (response.data.success) {
        setOrdersData(response.data.orders)
      } else {
        alert(response.data.message)
      }
    } catch (error) {
      console.log(error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Procesando Orden':
        return 'bg-yellow-100 text-yellow-800';
      case 'Enviado':
        return 'bg-blue-100 text-blue-800';
      case 'Entregado':
        return 'bg-green-100 text-green-800';
      case 'Cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  useEffect(() => {
    if (token) {
      fetchOrders()
    }

  }, [token])

  return (
    <div className='flex flex-col  gap-2.5 mt-24'>
      <h2 className='text-[32px] font-semibold mb-4'>Mis Ordenes</h2>
      <div className='flex flex-col gap-5'>
        {/* lista de ordenes */}
        {ordersData.length > 0 ? ordersData.map((order, index) => (
          <div key={index} className='grid grid-cols-[2fr_1fr_1fr] md:grid-cols-[2fr__1.5fr_1fr_1fr_1fr] items-center gap-1 md:gap-5 bg-gray-100 rounded shadow-md text-[14px] sm:text-[15px] cursor-pointer transition-all border-[1px] border-[#323232] hover:translate-y-[-1px] hover:shadow-lg py-2 px-4 leading-tight group'>
            <div className='flex items-center gap-1 md:gap-5'>
              {/* icono de paquete */}
              <img src={assets.parcel_icon} alt="" className="w-6 h-6 md:w-12 md:h-12  group-hover:animate-jiggle" />

              {/* lista de platos */}
              <div className='flex flex-wrap gap-1'>
                {order.items.map((item, index) => {
                  if (index === order.items.length - 1) {
                    return (
                      <p>{item.name} <span className="font-bold text-tomato">x {item.quantity}</span></p>
                    )
                  } else {
                    return (
                      <p>{item.name} <span className="font-bold text-tomato">x {item.quantity}</span>, </p>
                    )
                  }
                })}
              </div>
            </div>

            <p className='bg-gray-700 text-white px-2 py-1 rounded text-center w-fit col-span-2 md:col-span-1 ml-auto'>S/.{order.totalAmount} - {order.paymentMethod}</p>
            <div className={`flex items-center justify-start md:justify-center gap-1 col-span-1`}>
              <p className={`font-semibold text-center  rounded border px-2 w-fit ${getStatusColor(order.status)}`}>{order.status}</p>
            </div>
            <p className='col-span-2 md:col-span-1 ms-auto'>{new Date(order.date).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
            <button onClick={fetchOrders} className='bg-tomato text-white px-2 py-1 rounded text-center w-full md:w-fit transition-all hover:scale-105 hover:bg-amber-500 cursor-pointer col-span-3 md:col-span-1'>Actualizar estado</button>
          </div>

        )) : <p>No hay ordenes</p>}
      </div>
    </div>
  )
}

export default MisOrdenes