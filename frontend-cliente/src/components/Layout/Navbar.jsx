import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assets } from '../../assets/assets';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Navbar = ({ setMostrarLogin }) => {
  const [menu, setMenu] = useState("Inicio");
  const navigate = useNavigate();
  const { token, isAuthenticated, logout, urlApi } = useAuth();

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

  return (
    <div className='sticky top-0 z-[99] bg-white shadow-md'>
      <div className='w-[92%] md:w-[90%] lg:w-[80%] m-auto flex justify-between items-center p-5 '>
        <Link to="/"><p className='text-2xl font-bold text-tomato'>El Buen Gusto</p></Link>
        <ul className="hidden md:flex gap-3 lg:gap-5 list-none text-azul-pastel md:text-[16px] lg:text-[18px]">
          <Link to="/" onClick={() => setMenu("Inicio")} className={`cursor-pointer ${menu === "Inicio" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Inicio</Link>
          <a href="#explore-menu" onClick={() => setMenu("Menú")} className={`cursor-pointer ${menu === "Menú" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Menú</a>
          <a href="#app-download" onClick={() => setMenu("App Móvil")} className={`cursor-pointer ${menu === "App Móvil" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>App Móvil</a>
          <a href="#footer" onClick={() => setMenu("Contactanos")} className={`cursor-pointer ${menu === "Contactanos" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Contáctanos</a>
        </ul>
        <div className="flex items-center gap-2 lg:gap-5">
          <img src={assets.search_icon} alt="" className='w-[20px] cursor-pointer' />
          <div className='relative'>
            <Link to='/cart'><img src={assets.basket_icon} alt="" className='w-[20px] cursor-pointer' /></Link>
            <div className='absolute min-w-[10px] min-h-[10px] bg-tomato rounded-full -top-[8px] right-[-8px]'></div>
          </div>
          {!isAuthenticated ? (
            <button onClick={() => setMostrarLogin(true)} className=" border border-tomato hover:bg-tomato cursor-pointer transition-all duration-300 hover:text-white hover:translate-y-[-2px] hover:shadow-[0_2px_2px_0px_#0005] text-tomato px-2.5 py-2 rounded-full">Iniciar Sesión</button>
          ) : (
            <div className='relative cursor-pointer group'>
              <img src={assets.profile_icon} alt="" className='w-[20px] group-hover:scale-130 transition-transform' />
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