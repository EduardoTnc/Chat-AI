import React, { useState } from 'react'
import Navbar from './components/Navbar/Navbar'
import { Routes, Route } from 'react-router-dom'
import Inicio from './pages/Inicio/Inicio'
import Carrito from './pages/Carrito/Carrito'
import TomarOrden from './pages/TomarOrden/TomarOrden'
import Footer from './components/Footer/Footer'
import LoginPopup from './components/LoginPopup/LoginPopup'
import OrdenRecibida from './pages/OrdenRecibida/OrdenRecibida'
import MisOrdenes from './pages/MisOrdenes/MisOrdenes'
import ChatPage from './components/Chat/ChatPage'
import FloatingChatButton from './components/Chat/FloatingChatButton'

const App = () => {

  const [mostrarLogin, setMostrarLogin] = useState(false);

  return (
    <div className='min-h-[100dvh]'>


      {mostrarLogin && <LoginPopup setMostrarLogin={setMostrarLogin} />}

      <Navbar setMostrarLogin={setMostrarLogin} />
      <div className="w-[92%] md:w-[90%] lg:w-[80%] m-auto">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/carrito" element={<Carrito />} />
          <Route path="/tomar-orden" element={<TomarOrden />} />
          <Route path="/orden-recibida/:orderId" element={<OrdenRecibida />} />
          <Route path="/mis-ordenes" element={<MisOrdenes />} />
          <Route path="/mensajes" element={<ChatPage />} />
        </Routes>
      </div>
      <Footer />
      <FloatingChatButton />
    </div>
  )
}

export default App