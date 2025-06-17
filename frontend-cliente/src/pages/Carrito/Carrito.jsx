import React, { useContext, useEffect, useMemo, useState } from 'react'
import { TiendaContext } from '../../context/TiendaContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Carrito = () => {
  const { carritoItems, listaPlatos, quitarDelCarrito, calcularMontoTotal, totalItems, vaciarCarrito } = useContext(TiendaContext);
  const { urlApi } = useAuth();
  const navigate = useNavigate();
  const mobileScreen = window.innerWidth < 640;
  const [isLoading, setIsLoading] = useState(true);

  // Scroll to top on component mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Filter valid cart items that exist in listaPlatos
  const validCartItems = useMemo(() => {
    return Object.entries(carritoItems || {})
      .filter(([itemId, qty]) => qty > 0 && listaPlatos.some(item => item?._id === itemId))
      .map(([itemId, qty]) => {
        const item = listaPlatos.find(p => p._id === itemId);
        return item ? { ...item, quantity: qty } : null;
      })
      .filter(Boolean);
  }, [carritoItems, listaPlatos]);

  // Clear invalid cart items
  useEffect(() => {
    if (listaPlatos.length > 0) {
      const invalidItems = Object.keys(carritoItems || {}).filter(
        itemId => !listaPlatos.some(item => item._id === itemId)
      );
      
      if (invalidItems.length > 0) {
        invalidItems.forEach(itemId => quitarDelCarrito(itemId));
      }
      setIsLoading(false);
    }
  }, [listaPlatos, carritoItems, quitarDelCarrito]);

  if (isLoading) {
    return <div className='mt-24 text-center'>Cargando productos...</div>;
  }

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
        
        {validCartItems.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Tu carrito está vacío</p>
            <button 
              onClick={() => navigate('/')}
              className="mt-4 bg-tomato text-white px-4 py-2 rounded-full hover:bg-tomato/90"
            >
              Ver menú
            </button>
          </div>
        ) : (
          validCartItems.map((item) => (
            <div key={item._id}>
              <div className="grid grid-cols-6 items-center text-[12px] md:text-[16px] my-2.5 text-black">
                <div className='flex items-center gap-2 col-span-2'>
                  <img 
                    src={`${urlApi}/images/${item.imageUrl}`} 
                    alt={item.name} 
                    className={`object-cover rounded-2xl shadow ${mobileScreen ? "w-[30px] h-[30px]" : "w-[80px] h-[30px]"}`} 
                  />
                  <p className={mobileScreen ? "" : "ms-2"}>{item.name}</p>
                </div>
                <p className='col-span-1'>S/.{item.price.toFixed(2)}</p>
                <p className='col-span-1'>{item.quantity}</p>
                <p className='col-span-1'>S/.{(item.price * item.quantity).toFixed(2)}</p>
                <button 
                  onClick={() => quitarDelCarrito(item._id)} 
                  className={`col-span-1 cursor-pointer bg-red-500 text-white px-2 py-1 rounded-full ${mobileScreen ? "w-[40px]" : "w-[80px]"}`}
                >
                  {mobileScreen ? "X" : "Quitar"}
                </button>
              </div>
              <hr className='text-gray-300 h-[1px]' />
            </div>
          ))
        )}
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