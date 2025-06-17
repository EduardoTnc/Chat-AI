import React, { useContext, useState, useEffect } from 'react'
import { assets } from '../../assets/assets'
import { TiendaContext } from '../../context/TiendaContext'
import { useAuth } from '../../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

const PlatoItem = ({ id, nombre, precio, descripcion, imagen }) => {

  const { carritoItems, agregarAlCarrito, quitarDelCarrito } = useContext(TiendaContext);
  const { urlApi } = useAuth();
  const [showAddedNotification, setShowAddedNotification] = useState(false);
  const [quantity, setQuantity] = useState(carritoItems[id] || 0);

  // Update local quantity when carritoItems changes
  useEffect(() => {
    setQuantity(carritoItems[id] || 0);
  }, [carritoItems, id]);

  const handleAddToCart = () => {
    agregarAlCarrito(id);
    setShowAddedNotification(true);
    setTimeout(() => setShowAddedNotification(false), 2000);
  };

  const handleRemoveFromCart = () => {
    quitarDelCarrito(id);
  };

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value, 10) || 0;
    if (newQuantity >= 0) {
      setQuantity(newQuantity);
      // Update cart with new quantity
      if (newQuantity > 0) {
        // Add or update item with new quantity
        const diff = newQuantity - (carritoItems[id] || 0);
        if (diff > 0) {
          // Add the difference
          for (let i = 0; i < diff; i++) {
            agregarAlCarrito(id);
          }
        } else if (diff < 0) {
          // Remove the difference
          for (let i = 0; i < -diff; i++) {
            quitarDelCarrito(id);
          }
        }
      } else {
        // Remove item if quantity is 0
        while (carritoItems[id] > 0) {
          quitarDelCarrito(id);
        }
      }
    }
  };

  return (
    <div className='w-full m-auto rounded-2xl shadow-md animate-fade-in-down animate-duration-500 overflow-hidden hover:shadow-lg transition-shadow duration-300' data-id={id}>
      <div className='relative group'>
        <img 
          src={`${urlApi}/images/${imagen}`} 
          alt={nombre} 
          className='w-full h-48 object-cover rounded-t-2xl transition-transform duration-300 group-hover:scale-105' 
        />
        
        {/* Cart Action Buttons */}
        <div className='absolute bottom-4 right-4'>
          {!carritoItems[id] ? (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              className='w-12 h-12 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-green-100 transition-colors'
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </motion.button>
          ) : (
            <div className='flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full p-1 shadow-lg'>
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleRemoveFromCart}
                className='w-8 h-8 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors'
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
                </svg>
              </motion.button>
              
              <div className='w-10 text-center font-semibold text-gray-800 select-none'>
                {quantity}
              </div>
              
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={handleAddToCart}
                className='w-8 h-8 flex items-center justify-center rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors'
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v12m6-6H6" />
                </svg>
              </motion.button>
            </div>
          )}
        </div>
        
        {/* Added to cart notification */}
        <AnimatePresence>
          {showAddedNotification && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className='absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-md'
            >
              ¡Agregado al carrito!
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className='p-5'>
        <div className='flex justify-between items-start mb-2.5'>
          <h3 className='text-xl font-bold text-gray-800'>{nombre}</h3>
          <div className='flex items-center'>
            <img src={assets.rating_starts} alt={`Rating de ${nombre}`} className='w-[70px]' />
            <span className='ml-2 text-sm text-gray-500'>(24)</span>
          </div>
        </div>
        <p className='text-gray-600 text-sm mb-3 line-clamp-2'>{descripcion}</p>
        <div className='flex justify-between items-center'>
          <span className='text-2xl font-bold text-tomato'>S/.{precio.toFixed(2)}</span>
          {carritoItems[id] > 0 && (
            <span className='text-sm text-green-600 font-medium'>
              {carritoItems[id]} en el carrito
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlatoItem