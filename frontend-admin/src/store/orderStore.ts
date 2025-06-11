import { create } from 'zustand';
import type { Order } from '@/api/orderService';

interface State {
  orders: Order[];
  setOrders: (o: Order[]) => void;
  updateOrder: (o: Order) => void;
}

export const useOrderStore = create<State>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
  updateOrder: (order) => set((s) => ({ orders: s.orders.map((o) => (o._id === order._id ? order : o)) })),
}));
