import React, { useContext, useMemo } from 'react'
import { TiendaContext } from '../../context/TiendaContext'
import PlatoItem from './PlatoItem'

const MostrarPlatos = ({ categoria }) => {
  const { listaPlatos } = useContext(TiendaContext);

  // Filter items based on selected category
  const filteredItems = useMemo(() => {
    if (categoria === 'Todos') {
      return listaPlatos;
    }
    
    return listaPlatos.filter(item => {
      // Handle both string and object category references
      if (!item.category) return false;
      
      // If category is an object (populated), check its name
      if (typeof item.category === 'object' && item.category !== null) {
        return item.category.name === categoria;
      }
      
      // If category is a string (not populated), check directly
      return item.category === categoria;
    });
  }, [listaPlatos, categoria]);

  return (
    <div className='mt-8' id='mostrar-platos'>
      <h2 className='text-4xl font-bold'>Los mejores platillos para ti</h2>
      {filteredItems.length === 0 ? (
        <p className='mt-4 text-gray-500'>
          No hay platillos disponibles en esta categoría.
        </p>
      ) : (
        <div className='grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] mt-[30px] gap-[30px] row-gap-[50px]'>
          {filteredItems.map((item) => (
            <PlatoItem 
              key={item._id} 
              id={item._id} 
              nombre={item.name} 
              precio={item.price} 
              descripcion={item.description} 
              imagen={item.imageUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MostrarPlatos;