import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PREFIX = '/api/v1/order';

export interface Order {
  _id: string;
  items: Array<{ name: string; price: number; quantity: number }>;
  total: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  user?: { name: string; email: string };
  createdAt?: string;
}

export const listOrdersAdmin = async (): Promise<Order[]> => {
  const res = await axios.get(`${BASE_URL}${PREFIX}/list-admin`, { withCredentials: true });
  return res.data.data || res.data.orders || res.data; // según controlador
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<Order> => {
  const res = await axios.put(
    `${BASE_URL}${PREFIX}/status`,
    { orderId, status },
    { withCredentials: true }
  );
  return res.data.data;
};
