import { create } from 'zustand';

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  isDeleted?: boolean;
  createdAt?: string;
}

interface MenuItemState {
  items: MenuItem[];
  setItems: (items: MenuItem[]) => void;
  addItem: (item: MenuItem) => void;
  updateItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
}

export const useMenuItemStore = create<MenuItemState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (item) =>
    set((state) => ({ items: state.items.map((i) => (i._id === item._id ? item : i)) })),
  removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i._id !== id) })),
}));
