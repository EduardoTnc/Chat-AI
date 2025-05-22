import React, { useContext } from 'react'
import { TiendaContext } from '../../context/TiendaContext'
import PlatoItem from '../PlatoItem/PlatoItem'

const MostrarPlatos = ({categoria}) => {

    const {listaPlatos} = useContext(TiendaContext);

  return (
    <div className='mt-8 ' id='mostrar-platos'>
      <h2 className='text-4xl font-bold'>Los mejores platillos para ti</h2>
      <div className='grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] mt-[30px] gap-[30px] row-gap-[50px]'>
        {
        listaPlatos.map((item, index) => {
          if (categoria === "Todos" || categoria === item.category) {
            return <PlatoItem key={index} id={item._id} nombre={item.name} precio={item.price} descripcion={item.description} imagen={item.imageUrl}/>
          }
        })
        }
      </div>
    </div>
  )
}

export default MostrarPlatos