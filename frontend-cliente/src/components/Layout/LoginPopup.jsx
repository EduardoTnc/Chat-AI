import React, { useState } from 'react';
import { assets } from '../../assets/assets'; // Ajusta la ruta a tus assets
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const LoginPopup = ({ isOpen = false, onClose, onLoginSuccess }) => {
  const { login, urlApi } = useAuth();
  const [currState, setCurrState] = useState("Iniciar Sesión");
  const [data, setData] = useState({
    name: "",
    email: "",
    password: ""
  });
  const [error, setError] = useState(""); // Para mostrar errores del backend

  const handleChange = (e) => {
    setData({ ...data, [e.target.name]: e.target.value });
    setError(""); // Limpiar error al cambiar input
  };

  const handleLoginRegister = async (e) => {
    e.preventDefault();
    setError(""); // Limpiar errores previos
    let endpoint = "";
    let payload = { email: data.email, password: data.password };

    if (currState === "Iniciar Sesión") {
      endpoint = "/auth/login";
    } else {
      endpoint = "/auth/register";
      payload.name = data.name; // Añadir nombre para registro
    }

    try {
      if (currState === "Iniciar Sesión") {
        const loginResult = await login(payload.email, payload.password);
        if (loginResult.success) {
          if (onLoginSuccess) onLoginSuccess();
          if (onClose) onClose();
        } else {
          setError(loginResult.error || "Ocurrió un error al iniciar sesión.");
        }
      } else {
        const response = await axios.post(`${urlApi}${endpoint}`, payload);
        if (response.data.success) {
          const loginResult = await login(payload.email, payload.password);
          if (loginResult.success) {
            if (onLoginSuccess) onLoginSuccess();
            if (onClose) onClose();
          } else {
            setError(loginResult.error || "Ocurrió un error al iniciar sesión.");
          }
        } else {
          setError(response.data.message || "Ocurrió un error.");
        }
      }
    } catch (err) {
      console.error(`Error en ${currState}:`, err.response?.data || err.message);
      setError(err.response?.data?.message || "Error de conexión o del servidor.");
    }
  };

  // Don't render anything if not open
  if (!isOpen) return null;

  // Handle click outside to close
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  return (
    <div 
      className='fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-[100]'
      onClick={handleBackdropClick}
    >
      <form 
        onSubmit={handleLoginRegister} 
        className='w-[90%] md:w-[50%] lg:w-[30%] bg-white p-6 rounded-lg shadow-xl animate-fade-in-up'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex justify-between items-center mb-6'>
          <h2 className='text-2xl font-bold text-gray-800'>{currState}</h2>
          <img 
            onClick={(e) => {
              e.stopPropagation();
              onClose?.();
            }} 
            src={assets.cross_icon} 
            alt="Cerrar" 
            className='cursor-pointer w-5 hover:opacity-70 transition-opacity' 
          />
        </div>


        <div className='flex flex-col gap-4 mb-5'>
          {currState === "Registrate" && (
            <input type="text" placeholder='Tu nombre completo' className='border border-gray-300 rounded-md p-2.5 focus:outline-none focus:border-tomato transition-colors' required name="name" value={data.name} onChange={handleChange} />
          )}
          <input type="email" placeholder='Tu correo electrónico' className='border border-gray-300 rounded-md p-2.5 focus:outline-none focus:border-tomato transition-colors' required name="email" value={data.email} onChange={handleChange} />
          <input type="password" placeholder='Tu contraseña' className='border border-gray-300 rounded-md p-2.5 focus:outline-none focus:border-tomato transition-colors' required name="password" value={data.password} onChange={handleChange} />
        </div>

        <div className="flex items-center gap-2 my-4">
          <input type="checkbox" required className='accent-tomato cursor-pointer' id="terms-checkbox" />
          <label htmlFor="terms-checkbox" className="text-md text-gray-600 cursor-pointer">Acepto los términos de servicio y política de privacidad.</label>
        </div>

        {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
        <button type="submit" className='w-full bg-tomato hover:bg-opacity-90 transition-colors text-white font-medium px-2.5 py-3 rounded-md shadow-sm cursor-pointer'>
          {currState === "Registrate" ? "Crear Cuenta" : "Iniciar Sesión"}
        </button>


        <div className="text-center mt-5">
          {currState === "Iniciar Sesión" ? (
            <p className="text-sm text-gray-600">¿No tienes una cuenta? <span onClick={() => { setCurrState("Registrate"); setError(""); }} className='text-tomato cursor-pointer font-semibold hover:underline'>Regístrate aquí</span></p>
          ) : (
            <p className="text-sm text-gray-600">¿Ya tienes una cuenta? <span onClick={() => { setCurrState("Iniciar Sesión"); setError(""); }} className='text-tomato cursor-pointer font-semibold hover:underline'>Inicia Sesión aquí</span></p>
          )}
        </div>
      </form>
    </div>
  );
};

export default LoginPopup;