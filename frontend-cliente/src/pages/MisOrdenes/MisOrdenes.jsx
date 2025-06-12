import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { assets } from '../../assets/assets';
import { useAuth } from '../../context/AuthContext';
import LoginPopup from '../../components/Layout/LoginPopup';

const MisOrdenes = () => {
  const { urlApi, token, isAuthenticated } = useAuth();
  const [ordersData, setOrdersData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [error, setError] = useState('');
  const [initialAuthCheck, setInitialAuthCheck] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const fetchOrders = async () => {
    console.log('fetchOrders called, isAuthenticated:', isAuthenticated, 'token:', !!token);
    
    // If we're still checking auth state, don't show the login popup yet
    if (isCheckingAuth) {
      console.log('Still checking auth state...');
      return;
    }
    
    // Only show login if we're sure the user is not authenticated
    if (!token) {
      console.log('No token found, user not authenticated');
      setShowLogin(true);
      setLoading(false);
      return;
    }

    // If we have a token but isAuthenticated is still false, wait for the auth state to update
    if (token && !isAuthenticated) {
      console.log('Token exists but not authenticated yet, waiting...');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log('Fetching orders with token:', token);
      const response = await axios.post(
        `${urlApi}/order/list`, 
        {}, 
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        }
      );
      
      console.log('Orders response:', response.data);
      if (response.data.success) {
        setOrdersData(response.data.orders || []);
        setShowLogin(false); // Ensure login popup is hidden when orders load successfully
      } else {
        setError('No se pudieron cargar las órdenes');
      }
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
      if (error.response?.status === 401) {
        console.log('401 Unauthorized, showing login');
        setShowLogin(true);
      } else {
        setError('Error al conectar con el servidor');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Procesando Orden':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle auth state changes
  useEffect(() => {
    console.log('Auth state changed - isAuthenticated:', isAuthenticated, 'token:', !!token);
    
    // If we're still checking auth, don't do anything yet
    if (isCheckingAuth) {
      return;
    }
    
    // If we have a token and are authenticated, fetch orders
    if (token && isAuthenticated) {
      console.log('User is authenticated, fetching orders');
      fetchOrders();
      setShowLogin(false);
    } else if (initialAuthCheck && !token) {
      // Only show login if we've completed the initial check and there's no token
      console.log('No token after initial check, showing login');
      setShowLogin(true);
      setLoading(false);
    }
  }, [isAuthenticated, token, initialAuthCheck, isCheckingAuth]);

  // Initial auth check to prevent showing login popup during initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Initial auth check complete');
      setInitialAuthCheck(true);
      setIsCheckingAuth(false);
      
      // Only show login if there's no token after the initial check
      if (!token) {
        console.log('No token found after initial check, showing login');
        setShowLogin(true);
      } else {
        console.log('Token found, not showing login');
        setShowLogin(false);
      }
    }, 300); // Slightly longer delay to ensure auth context is ready
    
    return () => clearTimeout(timer);
  }, [token]);

  const handleLoginSuccess = () => {
    console.log('Login successful, closing popup and refreshing orders');
    setShowLogin(false);
    // Force a refresh of the orders after a short delay to ensure auth state is updated
    setTimeout(() => {
      fetchOrders();
    }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tomato"></div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6 mt-24 px-4 max-w-7xl mx-auto w-full'>
      <h2 className='text-3xl font-bold text-gray-800'>Mis Órdenes</h2>
      
      {!isAuthenticated ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-2xl mx-auto w-full">
          <div className="bg-tomato/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <img src={assets.parcel_icon} alt="" className="w-8 h-8 text-tomato" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Inicia sesión para ver tus pedidos</h3>
          <p className="text-gray-600 mb-6">Accede a tu historial de pedidos y realiza un seguimiento de tus órdenes actuales.</p>
          <button 
            onClick={() => setShowLogin(true)}
            className="bg-tomato text-white px-6 py-2.5 rounded-full font-medium hover:bg-tomato/90 transition-colors"
          >
            Iniciar sesión
          </button>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : ordersData.length > 0 ? (
        <div className='bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100'>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Productos</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ordersData.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img className="h-10 w-10 rounded-full" src={assets.parcel_icon} alt="" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {order.items[0]?.name || 'Producto'}
                            {order.items.length > 1 && ` y ${order.items.length - 1} más`}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.items[0]?.quantity} x S/.{order.items[0]?.price || '0.00'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">S/.{order.totalAmount}</div>
                      <div className="text-sm text-gray-500">{order.paymentMethod}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(order.createdAt).toLocaleString('es-PE', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={fetchOrders}
                        className="text-tomato hover:text-tomato/80"
                      >
                        Actualizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-100">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">No hay órdenes</h3>
          <p className="mt-1 text-gray-500">Aún no has realizado ningún pedido.</p>
          <div className="mt-6">
            <a
              href="/menu"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tomato hover:bg-tomato/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tomato"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
              Ver menú
            </a>
          </div>
        </div>
      )}

      <LoginPopup 
        isOpen={showLogin} 
        onClose={() => setShowLogin(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
};

export default MisOrdenes;