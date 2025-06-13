import { create } from 'zustand';
import type { Order } from '@/api/orderService';
import { listOrdersAdmin, updateOrderStatus as updateOrderStatusApi } from '@/api/orderService';

export type OrderStatus = 'Procesando Orden' | 'pending' | 'in_progress' | 'completed' | 'cancelled';

interface OrderState {
  orders: Order[];
  isLoading: boolean;
  error: string | null;
  fetchOrders: (statuses?: OrderStatus[]) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<{ 
    success: boolean; 
    order?: Order;
    error?: string 
  }>;
  getOrderById: (orderId: string) => Order | undefined;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  isLoading: false,
  error: null,

  fetchOrders: async (statuses?: OrderStatus[]) => {
    set({ isLoading: true, error: null });
    try {
      const response = await listOrdersAdmin(statuses);
      set({ orders: response || [], error: null });
    } catch (error) {
      console.error('Error fetching orders:', error);
      set({ error: error instanceof Error ? error.message : 'Error desconocido al cargar las órdenes' });
    } finally {
      set({ isLoading: false });
    }
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    set({ isLoading: true, error: null });
    try {
      const updatedOrder = await updateOrderStatusApi(orderId, status);
      
      set((state) => ({
        orders: state.orders.map((o) => (o._id === updatedOrder._id ? updatedOrder : o)),
        error: null,
      }));

      return { 
        success: true, 
        order: updatedOrder 
      };
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al actualizar el estado';
      set({ error: errorMessage });
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      set({ isLoading: false });
    }
  },

  getOrderById: (orderId) => {
    return get().orders.find((o) => o._id === orderId);
  },
}));
