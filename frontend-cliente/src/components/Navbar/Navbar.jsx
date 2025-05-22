import React, { useState } from 'react'
import { assets } from '../../assets/assets'
import { Link, useNavigate } from 'react-router-dom'
import { useContext } from 'react'
import { TiendaContext } from '../../context/TiendaContext'
import { ChatContext } from '../../context/ChatContext'

const Navbar = ({ setMostrarLogin }) => {

  const [menu, setMenu] = useState("Inicio")
  const { calcularCantidadTotal, token, setToken } = useContext(TiendaContext)
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("token")
    setToken("")
    navigate("/")
  }

  return (
    <div className='sticky top-0 z-50 bg-white shadow-md'>
      <div className='w-[92%] md:w-[90%] lg:w-[80%] m-auto flex justify-between items-center p-5 '>

        {/* Logo */}
        {/* <Link to="/"><img src={assets.logo} alt="logo" className='w-[100px] lg:w-[150px] xl:w-[200px]' /></Link> */}
        <Link to="/"><p className='text-2xl font-bold text-tomato'>El Buen Gusto</p></Link>


        {/* Menu */}
        <ul className="hidden md:flex gap-3 lg:gap-5 list-none text-azul-pastel md:text-[16px] lg:text-[18px]">

          <Link to="/" onClick={() => setMenu("Inicio")} className={`cursor-pointer ${menu === "Inicio" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Inicio</Link>

          <a href="#explorar-menu" onClick={() => setMenu("Menu")} className={`cursor-pointer ${menu === "Menu" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Menú</a>

          <a href="#app-download" onClick={() => setMenu("App")} className={`cursor-pointer ${menu === "App" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Aplicación Móvil</a>

          <a href="#footer" onClick={() => setMenu("Contactanos")} className={`cursor-pointer ${menu === "Contactanos" ? "text-tomato font-bold border-b-2 border-tomato" : ""}`}>Contáctanos</a>

        </ul>

        {/* Botones */}
        <div className="flex items-center gap-2 lg:gap-5">
          <img src={assets.search_icon} alt="" className='w-[20px] hover:scale-130 transition-transform cursor-pointer' />

          {/* Carrito */}
          <Link to="/carrito">
            <div className="relative cursor-pointer hover:scale-130 transition-transform">

              <img src={assets.basket_icon} alt="" className='w-[20px]' />

              <div className={calcularCantidadTotal() > 0 ? "absolute min-w-2.5 min-h-2.5 bg-tomato rounded-full -top-2 -right-2 text-white flex items-center justify-center px-1 text-[12px] hover:scale-110 transition-transform" : ""}>{calcularCantidadTotal() > 0 ? calcularCantidadTotal() : ""}</div>
            </div>
          </Link>

          {/* Boton de iniciar sesion */}
          {!token ?
            <button onClick={() => setMostrarLogin(true)} className=" border border-tomato hover:bg-tomato cursor-pointer transition-all duration-300 hover:text-white hover:translate-y-[-2px] hover:shadow-[0_2px_2px_0px_#0005] text-tomato px-2.5 py-2 rounded-full">
              Iniciar Sesión
            </button>
            :
            <div className='relative cursor-pointer group'>
              <img src={assets.profile_icon} alt="" className='w-[20px] group-hover:scale-130 transition-transform' />
              <ul className='absolute hidden right-0 z-10 bg-white shadow-md group-hover:flex flex-col gap-2.5 px-4 py-6 rounded-2xl list-none w-[180px] animate-fade-in animate-duration-300 animate-ease-in'>
                <li onClick={() => navigate("/mis-ordenes")} className='flex items-center gap-2.5 cursor-pointer hover:translate-y-[-2px] hover:text-tomato transition-all duration-300'><img src={assets.bag_icon} alt="" className='w-[20px]' /><p>Órdenes</p></li>
                <li onClick={() => navigate("/mensajes")} className='flex items-center gap-2.5 cursor-pointer hover:translate-y-[-2px] hover:text-tomato transition-all duration-300'>
                  <svg className='w-[20px]' fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"></path>
                  </svg>
                  <p>Mensajes</p>
                </li>
                <hr />
                <li onClick={() => logout()} className='flex items-center gap-2.5 cursor-pointer hover:translate-y-[-2px] hover:text-tomato transition-all duration-300'><img src={assets.logout_icon} alt="" className='w-[20px]' /><p>Cerrar Sesión</p></li>
              </ul>
            </div>
          }
        </div>
      </div>
    </div>)
}

export default Navbar