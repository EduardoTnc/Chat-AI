import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PREFIX = '/api/v1/order';

// Create axios instance with default config
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface OrderItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  // Add other item properties as needed
}

export interface DeliveryAddress {
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  city?: string;
  department?: string;
  zipCode?: string;
  phone?: string;
}

export interface Order {
  _id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  paymentMethod: string;
  payment: boolean;
  status: 'Procesando Orden' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

export const listOrdersAdmin = async (): Promise<Order[]> => {
  try {
    const res = await api.get(`${PREFIX}/list-admin`);
    return res.data.orders || [];
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
      throw new Error(error.response?.data?.message || 'Error al cargar las órdenes');
    }
    throw new Error('Error desconocido al cargar las órdenes');
  }
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<Order> => {
  try {
    const res = await api.put(`${PREFIX}/status`, { orderId, status });
    return res.data.order;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 401) {
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
      throw new Error(error.response?.data?.message || 'Error al actualizar el estado del pedido');
    }
    throw new Error('Error desconocido al actualizar el estado del pedido');
  }
};
