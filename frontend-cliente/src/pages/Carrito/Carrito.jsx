import React, { useContext } from 'react'
import { TiendaContext } from '../../context/TiendaContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Carrito = () => {

  const { carritoItems, listaPlatos, quitarDelCarrito, calcularMontoTotal } = useContext(TiendaContext);
  const {urlApi} = useAuth();

  const mobileScreen = window.innerWidth < 640;

  const navigate = useNavigate();

  return (
    <div className='mt-24'>
      <div className="">
        <div className="grid grid-cols-6 items-center text-gray-700 text-[12px] md:text-[16px] mb-2">
          <p className='col-span-2'>{mobileScreen ? "Item" : "Item / Platillo"}</p>
          <p className='col-span-1'>{mobileScreen ? "P/u" : "Precio Unitario"}</p>
          <p className='col-span-1'>{mobileScreen ? "Cant." : "Cantidad"}</p>
          <p className='col-span-1'>Subtotal</p>
          <p className='col-span-1'>Quitar</p>
        </div>
        <hr className='text-gray-400' />
        {listaPlatos.map((item) => {
          if (carritoItems[item._id] > 0) {
            return (
              <>
                <div className="grid grid-cols-6 items-center text-[12px] md:text-[16px] my-2.5 text-black">
                  <div className='flex items-center gap-2 col-span-2'>
                    <img src={urlApi + "/images/" + item.imageUrl} alt="" className={`object-cover rounded-2xl shadow ${mobileScreen ? "w-[30px] h-[30px]" : "w-[80px] h-[30px]"}`} />
                    <p className={mobileScreen ? "" : "ms-2"}>{item.name}</p>
                  </div>
                  <p className='col-span-1'>S/.{item.price}</p>
                  <p className='col-span-1'>{carritoItems[item._id]}</p>
                  <p className='col-span-1'>S/.{item.price * carritoItems[item._id]}</p>
                  <button onClick={() => quitarDelCarrito(item._id)} className={`col-span-1 cursor-pointer bg-red-500 text-white px-2 py-1 rounded-full ${mobileScreen ? "w-[40px]" : "w-[80px]"}`}>{mobileScreen ? "X" : "Quitar"}</button>
                </div>
                <hr className='text-gray-300 h-[1px]' />
              </>

            )
          }
        })}
      </div>

      <div className='mt-20 flex flex-col sm:flex-row items-center sm:items-start justify-between  gap-8 '>

        <div className='flex flex-1 w-full'>
          {/* <div className='flex flex-col gap-2'>
            <p className='text-[16px] '>Si tienes un cupón de descuento</p>
            <div className='flex items-center gap-2'>
              <input type="text" placeholder='Introduce el cupón aquí' className='border border-gray-300 rounded-full p-2.5 focus:outline-none' />
              <button className='border border-tomato hover:bg-tomato hover:text-white cursor-pointer transition-all hover:translate-y-[-1px] hover:shadow-[0_1px_2px_0px_#0005] text-tomato px-3 py-2 rounded-full max-w-[200px]'>Aplicar</button>
            </div>
          </div> */}
        </div>

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
            {calcularMontoTotal() > 0 ? (
              <button onClick={() => navigate("/tomar-orden")} className='w-full bg-tomato hover:bg-tomato cursor-pointer transition-all hover:text-white hover:translate-y-[-1px] hover:shadow-[0_1px_2px_0px_#0005] text-white px-3 py-1 rounded-full max-w-[200px] self-end'>Ingresar información de envío</button>
            ) : (
              <button disabled className='w-full bg-gray-700 cursor-not-allowed transition-all hover:text-white hover:translate-y-[-1px] hover:shadow-[0_1px_2px_0px_#0005] text-white px-3 py-1 rounded-full max-w-[200px] self-end'>Agrega al menos un producto al carrito</button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Carrito