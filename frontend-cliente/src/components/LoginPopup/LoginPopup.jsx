import React, { useState } from 'react'
import { assets } from '../../assets/assets'
import { useContext } from 'react'
import { TiendaContext } from '../../context/TiendaContext'
import axios from 'axios'

const LoginPopup = ({ setMostrarLogin }) => {

  const {urlApi, setToken} = useContext(TiendaContext)
  const [currState, setCurrState] = useState("Iniciar Sesión");
  const [data, setData] = useState({
    name: "",
    email: "",
    password: ""
  })

  const handleChange = (e) => {
    setData({
      ...data,
      [e.target.name]: e.target.value
    })
  }

  const handleLoginRegister = async (e) => {
    e.preventDefault();
    let newUrl = urlApi;
    if(currState === "Iniciar Sesión"){
      newUrl += "/api/user/login"
    }else{
      newUrl += "/api/user/register"
    }

    const response = await axios.post(newUrl, data)
    
    if (response.data.success){
      setToken(response.data.token)
      localStorage.setItem("token", response.data.token)
      setMostrarLogin(false)
    } else {
      alert(response.data.message)
    }
    
  }


  return (
    <div className='fixed top-0 left-0 right-0 bottom-0 bg-black/50 flex items-center justify-center z-60'>
      <form onSubmit={handleLoginRegister} className='w-[90%] md:w-[50%] lg:w-[30%] bg-white p-5 rounded-2xl shadow-md animate-fade-in-up'>
        <div className='flex justify-between items-center mb-5'>
          <h2 className='text-2xl font-bold'>{currState}</h2>
          <img onClick={() => setMostrarLogin(false)} src={assets.cross_icon} alt="" className='cursor-pointer w-[20px] hover:translate-y-[-1px] transition-transform' />
        </div>
        <div className='flex flex-col gap-5 mb-5'>
          {currState === "Registrate" && (
            <input type="text" placeholder='Tu nombre' className='border border-tomato rounded-full p-2.5  focus:outline-none ' required name="name" value={data.name} onChange={handleChange}/>
          )}
          <input type="email" placeholder='Tu correo' className='border border-tomato rounded-full p-2.5  focus:outline-none' required name="email" value={data.email} onChange={handleChange}/>
          <input type="password" placeholder='Tu contraseña' className='border border-tomato rounded-full p-2.5   focus:outline-none' required name="password" value={data.password} onChange={handleChange}/>
        </div>
        <button type="submit" className='w-full bg-tomato hover:bg-tomato cursor-pointer transition-all hover:text-white hover:translate-y-[-1px] hover:shadow-[0_1px_2px_0px_#0005] text-white px-2.5 py-2 rounded-full'>{currState}</button>

        <div className="flex justify-center items-center gap-2 mt-5">
          <input type="checkbox" required className='mt-1' />
          <p>Al continuar, aceptas nuestros términos y condiciones</p>
        </div>
        <div className="flex justify-center items-center gap-2 mt-5">
          {currState === "Iniciar Sesión" && (
            <p className="text-center">¿No tienes una cuenta? <span onClick={() => setCurrState("Registrate")} className=' text-tomato cursor-pointer font-semibold'>Registrate</span></p>
          )}
          {currState === "Registrate" && (
            <p className="text-center">Ya tienes una cuenta? <span onClick={() => setCurrState("Iniciar Sesión")} className=' text-tomato cursor-pointer font-semibold'>Iniciar Sesión</span></p>
          )}
        </div>

      </form>
    </div>
  )
}

export default LoginPopup