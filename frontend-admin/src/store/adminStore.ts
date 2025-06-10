import { create } from 'zustand';

// Define the types for the store's state
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'agent' | 'admin' | 'user';
  isDeleted: boolean;
  createdAt: string;
}

interface AdminState {
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (updatedUser: User) => void;
  removeUser: (userId: string) => void;
}

// Create the Zustand store
export const useAdminStore = create<AdminState>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
  addUser: (user) => set((state) => ({ users: [...state.users, user] })),
  updateUser: (updatedUser) =>
    set((state) => ({
      users: state.users.map((user) =>
        user._id === updatedUser._id ? updatedUser : user
      ),
    })),
  removeUser: (userId) =>
    set((state) => ({ users: state.users.filter((user) => user._id !== userId) })),
}));
