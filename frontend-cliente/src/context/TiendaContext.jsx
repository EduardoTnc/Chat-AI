import { createContext, useState, useEffect } from "react";
import axios from "axios";
export const TiendaContext = createContext(null)

const TiendaContextProvider = (props) => {

  const urlApi = "http://localhost:5001/api/v1"
  const [carritoItems, setCarritoItems] = useState({});
  const [token, setToken] = useState(localStorage.getItem("token") || "")
  const [listaPlatos, setListaPlatos] = useState([])

  const agregarAlCarrito = (itemId) => {
    if (!carritoItems[itemId]) {
      setCarritoItems(prev => ({ ...prev, [itemId]: 1 }))
    } else {
      setCarritoItems(prev => ({ ...prev, [itemId]: prev[itemId] + 1 }))
    }
    if (token) {
      axios.post(`${urlApi}/api/cart/add`, { itemId: itemId }, { headers: { token: token } })
    }
  }

  const quitarDelCarrito = (itemId) => {
    if (carritoItems[itemId] === 1) {
      setCarritoItems(prev => ({ ...prev, [itemId]: null }))
    } else {
      setCarritoItems(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }))
    }
    if (token) {
      axios.post(`${urlApi}/api/cart/remove`, { itemId: itemId }, { headers: { token: token } })
    }
  }

  const vaciarCarrito = () => {
    setCarritoItems({})
    if (token) {
      axios.post(`${urlApi}/api/cart/clear`,{}, { headers: { token: token } })
    }
  }

  const cargarCarrito = async (token) => {
    const response = await axios.post(`${urlApi}/api/cart/get`,{}, { headers: {token: token} })
    setCarritoItems(response.data.cartData)
  }

  const calcularMontoTotal = () => {
    let montoTotal = 0;
    for (const itemId in carritoItems) {
      const item = listaPlatos.find((item) => item._id === itemId);
      montoTotal += item.price * carritoItems[itemId];
    }
    return montoTotal
  }

  const calcularCantidadTotal = () => {
    let cantidadTotal = 0;
    for (const itemId in carritoItems) {
      cantidadTotal += carritoItems[itemId];
    }
    return cantidadTotal
  }

  const fecthListaPlatos = async () => {
    try {
      const response = await axios.get(`${urlApi}/api/menu-items/list`)
      const data = await response.data.menuItems
      setListaPlatos(data)
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    async function cargarData() {
      await fecthListaPlatos()
      if (token) {
        await cargarCarrito(token)
      }
    }
    cargarData()
  }, [token])

  const contextValue = {
    listaPlatos,
    carritoItems,
    setCarritoItems,
    agregarAlCarrito,
    quitarDelCarrito,
    calcularMontoTotal,
    calcularCantidadTotal,
    urlApi,
    token,
    setToken,
    vaciarCarrito
  }

  return (
    <TiendaContext.Provider value={contextValue}>
      {props.children}
    </TiendaContext.Provider>
  )
}

export default TiendaContextProvider