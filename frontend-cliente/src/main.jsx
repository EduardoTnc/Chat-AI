import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import TiendaContextProvider from './context/TiendaContext'
import ChatContextProvider from './context/ChatContext'


createRoot(document.getElementById('root')).render(

  // StrictMode es un componente de React que identifica problemas potenciales en la aplicación.
  // Activa verificaciones y advertencias adicionales en desarrollo:
  // - Detecta efectos secundarios inesperados
  // - Identifica componentes con ciclos de vida obsoletos
  // - Advierte sobre el uso de API obsoletas
  // - No afecta la versión de producción
  <StrictMode>
    {/* BrowserRouter es un componente que proporciona la funcionalidad de enrutamiento en React Router.
    Permite navegar entre diferentes vistas de la aplicación.
    Tiene que envolver a toda la aplicación para que funcione el enrutamiento. */}
    <BrowserRouter>
      {/* TiendaContextProvider es un componente que proporciona el contexto de la tienda.
      Permite compartir datos entre componentes de manera global. */}
      <TiendaContextProvider>
        {/* ChatContextProvider proporciona la funcionalidad de mensajería en tiempo real utilizando Socket.IO */}
        <ChatContextProvider>
          {/* App es el componente principal de la aplicación.
          Renderiza la aplicación. */}
          <App />
        </ChatContextProvider>
      </TiendaContextProvider>
    </BrowserRouter>
  </StrictMode>
)
