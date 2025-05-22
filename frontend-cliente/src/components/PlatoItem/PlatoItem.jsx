import React, { useContext } from 'react'
import { assets } from '../../assets/assets'
import { TiendaContext } from '../../context/TiendaContext'

const PlatoItem = ({ id, nombre, precio, descripcion, imagen }) => {

  const {carritoItems, agregarAlCarrito, quitarDelCarrito, urlApi} = useContext(TiendaContext);

  return (
    <div className='w-full m-auto rounded-2xl shadow-md animate-fade-in-down animate-duration-500' data-id={id}>
      <div className='relative'>
        <img src={urlApi + "/images/" + imagen} alt="" className='w-full rounded-t-2xl min-h-[120px]' />
        {
          !carritoItems[id]
            ? <img className="absolute w-11 bottom-[15px] right-[15px] cursor-pointer" onClick={() => agregarAlCarrito(id)} src={assets.add_icon_white} alt="" />
            : <div className='absolute bottom-[15px] right-[15px] flex items-center gap-2.5 bg-amber-50 rounded-full p-1 shadow-2xl font-bold'>
              <img src={assets.remove_icon_red} alt="" onClick={() => quitarDelCarrito(id)} className='cursor-pointer'/>
              <p>{carritoItems[id]}</p>
              <img src={assets.add_icon_green} alt="" onClick={() => agregarAlCarrito(id)} className='cursor-pointer'/>

            </div>
        }
      </div>
      <div className='p-5'>
        <div className='flex justify-between items-center mb-2.5 '>
          <p className='text-2xl font-semibold'>{nombre}</p>
          <img src={assets.rating_starts} alt="" className='w-[70px]' />
        </div>
        <p className='text-azul-pastel text-[14px]'>{descripcion}</p>
        <p className='text-2xl font-semibold text-tomato'>S/.{precio}</p>
      </div>
    </div>
  )
}

export default PlatoItem