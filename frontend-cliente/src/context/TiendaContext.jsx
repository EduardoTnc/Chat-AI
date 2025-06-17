import { createContext, useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "./AuthContext";

export const TiendaContext = createContext(null);

const TiendaContextProvider = (props) => {
  const { token, urlApi } = useAuth();
  const [carritoItems, setCarritoItems] = useState({});
  const [listaPlatos, setListaPlatos] = useState([]);

  useEffect(() => {
    fecthListaPlatos();
    if (token) {
      cargarCarrito(token);
    }
  }, [token]);

  const agregarAlCarrito = async (itemId) => { // Hacerla async si la llamada API es importante para el estado
    setCarritoItems(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));
    if (token) {
      try {
        await axios.post(`${urlApi}/cart/add`, { itemId }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (error) {
        console.error("Error agregando al carrito en backend:", error);
        // Aquí podrías revertir el cambio optimista si la llamada falla
      }
    }
  };

  const quitarDelCarrito = async (itemId) => {
    setCarritoItems(prev => {
      const newCount = (prev[itemId] || 0) - 1;
      if (newCount <= 0) {
        const { [itemId]: _, ...rest } = prev; // Quitar el item
        return rest;
      }
      return { ...prev, [itemId]: newCount };
    });
    if (token) {
      try {
        await axios.post(`${urlApi}/cart/remove`, { itemId }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (error) {
        console.error("Error quitando del carrito en backend:", error);
      }
    }
  };

  const vaciarCarrito = async () => {
    setCarritoItems({});
    if (token) {
      try {
        await axios.post(`${urlApi}/cart/clear`, {}, { headers: { Authorization: `Bearer ${token}` } });
      } catch (error) {
        console.error("Error vaciando carrito en backend:", error);
      }
    }
  };

  const cargarCarrito = async (currentToken) => {
    if (!currentToken) return;
    try {
      const response = await axios.get(`${urlApi}/cart/get`, { headers: { Authorization: `Bearer ${currentToken}` } }); // Asumiendo GET para obtener
      if (response.data.success) {
        setCarritoItems(response.data.cartData || {});
      }
    } catch (error) {
      console.error("Error cargando carrito:", error);
    }
  };

  const calcularMontoTotal = () => {
    let montoTotal = 0;
    for (const itemId in carritoItems) {
      if (carritoItems[itemId] > 0) {
        const item = listaPlatos.find((item) => item._id === itemId);
        if (item) {
          montoTotal += item.price * carritoItems[itemId];
        }
      }
    }
    return montoTotal;
  };

  const calcularCantidadTotal = () => {
    let cantidadTotal = 0;
    for (const itemId in carritoItems) {
      cantidadTotal += carritoItems[itemId] || 0;
    }
    return cantidadTotal;
  };

  const fecthListaPlatos = async () => {
    try {      // Asumiendo que la ruta es parte de tu API y no necesita token para ver menú
      const response = await axios.get(`${urlApi}/menu-items/list`);
      if (response.data.success) {
        setListaPlatos(response.data.menuItems);
      }
    } catch (error) {
      console.log("Error fetching listaPlatos", error);
    }
  };

  // Calcular el total de ítems en el carrito
  const totalItems = calcularCantidadTotal();
  
  // Obtener los ítems del carrito con sus detalles
  const cartItemsWithDetails = Object.entries(carritoItems)
    .filter(([_, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const item = listaPlatos.find(p => p._id === itemId);
      return item ? { ...item, quantity: qty } : null;
    })
    .filter(Boolean);
    
  // Calcular el total del carrito
  const cartTotal = calcularMontoTotal().toFixed(2);

  const contextValue = {
    listaPlatos,
    carritoItems,
    setCarritoItems,
    agregarAlCarrito,
    quitarDelCarrito,
    calcularMontoTotal,
    totalItems,
    cartItemsWithDetails,
    cartTotal,
    vaciarCarrito,
    calcularCantidadTotal
  };

  return (
    <TiendaContext.Provider value={contextValue}>
      {props.children}
    </TiendaContext.Provider>
  );
};

export default TiendaContextProvider;