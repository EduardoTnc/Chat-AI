import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { assets } from '../../assets/assets'
import { useAuth } from '../../context/AuthContext'
import { TiendaContext } from '../../context/TiendaContext'
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const Navbar = ({ onLoginClick }) => {
  const [menu, setMenu] = useState("Inicio");
  const navigate = useNavigate();
  const { token, isAuthenticated, logout, urlApi } = useAuth();
  const { cartItems, totalItems, cartItemsWithDetails } = useContext(TiendaContext);
  const [showCartPreview, setShowCartPreview] = useState(false);

  const handleLogout = async () => {
    if (token) {
      try {
        await axios.post(`${urlApi}/auth/logout`, {}, {
        });
      } catch (error) {
        console.error("Error durante el logout en backend:", error);
      }
    }
    logout();
    navigate("/");
  };

  const handleCartClick = () => {
    if (totalItems > 0) {
      navigate("/cart");
    }
  };

  return (
    <div className='sticky top-0 z-[99] bg-white shadow-md'>
      <div className='w-[92%] md:w-[90%] lg:w-[80%] m-auto flex justify-between items-center p-5 '>
        <Link to="/"><p className='text-2xl font-bold text-tomato'>El Buen Gusto</p></Link>
        <ul className="hidden md:flex gap-3 lg:gap-5 list-none text-azul-pastel md:text-[16px] lg:text-[18px]">
          <Link to="/" onClick={() => setMenu("Inicio")} className={`cursor-pointer ${menu === "Inicio" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Inicio</Link>
          <a href="#explore-menu" onClick={() => setMenu("Menú")} className={`cursor-pointer ${menu === "Menú" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Menú</a>
          {/* <a href="#app-download" onClick={() => setMenu("App Móvil")} className={`cursor-pointer ${menu === "App Móvil" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>App Móvil</a> */}
          <a href="#footer" onClick={() => setMenu("Contactanos")} className={`cursor-pointer ${menu === "Contactanos" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Contáctanos</a>
        </ul>
        <div className="flex items-center gap-2 lg:gap-5">
          {/* <img src={assets.search_icon} alt="" className='w-[20px] cursor-pointer' /> */}
          <div className='relative'>
            <Link 
              to={totalItems > 0 ? '/cart' : '#'}
              onClick={handleCartClick}
              onMouseEnter={() => setShowCartPreview(true)}
              onMouseLeave={() => setShowCartPreview(false)}
              className='relative p-2 rounded-full transition-colors'
            >
              <img 
                src={assets.basket_icon} 
                alt="Carrito de compras" 
                className='w-5 h-5 cursor-pointer' 
              />
              {totalItems > 0 && (
                <div className='absolute top-4 -right-1 min-w-[18px] h-[18px] bg-tomato text-white text-xs rounded-full flex items-center justify-center'>
                  {totalItems}
                </div>
              )}
            </Link>
            
            {/* Vista previa del carrito */}
            <AnimatePresence>
              {showCartPreview && cartItemsWithDetails.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden"
                  onMouseEnter={() => setShowCartPreview(true)}
                  onMouseLeave={() => setShowCartPreview(false)}
                >
                  <div className="p-3 border-b border-gray-100">
                    <h4 className="font-semibold text-gray-800">Tu pedido</h4>
                    <p className="text-xs text-gray-500">{totalItems} {totalItems === 1 ? 'ítem' : 'ítems'}</p>
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto">
                    {cartItemsWithDetails.map((item) => (
                      <div key={item._id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-50">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden mr-3">
                          <img 
                            src={`${urlApi}/images/${item.imageUrl}`} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">{item.quantity} x S/.{item.price.toFixed(2)}</span>
                            <span className="text-sm font-medium">S/.{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="p-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Total:</span>
                      <span className="font-bold">
                        S/.{cartItemsWithDetails.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                    <Link 
                      to="/cart" 
                      className="block w-full bg-tomato text-white text-center py-2 rounded-lg font-medium hover:bg-tomato/90 transition-colors"
                      onClick={() => setShowCartPreview(false)}
                    >
                      Ver carrito
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!isAuthenticated ? (
            <button 
              onClick={onLoginClick} 
              className="border border-tomato hover:bg-tomato cursor-pointer transition-all duration-300 hover:text-white hover:translate-y-[-2px] hover:shadow-[0_2px_2px_0px_#0005] text-tomato px-2.5 py-2 rounded-full"
            >
              Iniciar Sesión
            </button>
          ) : (
            <div className='relative cursor-pointer group'>
              <img src={assets.profile_icon} alt="" className='w-[20px] transition-transform' />
              <ul className='absolute hidden right-0 z-10 bg-white shadow-md group-hover:flex flex-col gap-2.5 px-4 py-6 rounded-2xl list-none w-[180px] animate-fade-in animate-duration-300 animate-ease-in'>
                <li onClick={() => navigate("/mis-ordenes")} className='flex items-center gap-2.5 cursor-pointer hover:translate-y-[-2px] hover:text-tomato transition-all duration-300'><img src={assets.bag_icon} alt="" className='w-[20px]' /><p>Órdenes</p></li>
                <li onClick={() => navigate("/mensajes")} className='flex items-center gap-2.5 cursor-pointer hover:translate-y-[-2px] hover:text-tomato transition-all duration-300'>
                  <img src={assets.message_icon} alt="" className='w-[20px]' />
                  <p>Mensajes</p>
                </li>
                <hr />
                <li onClick={handleLogout} className='flex items-center gap-2.5 cursor-pointer hover:translate-y-[-2px] hover:text-tomato transition-all duration-300'><img src={assets.logout_icon} alt="" className='w-[20px]' /><p>Cerrar Sesión</p></li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;