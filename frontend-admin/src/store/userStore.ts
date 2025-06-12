import { create } from 'zustand';
import type { User } from '@/api/userService';

interface UserState {
  // All users (both active and deleted)
  users: User[];
  setUsers: (users: User[]) => void;
  addUser: (user: User) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  removeUser: (userId: string, isDeleted?: boolean) => void;
  
  // Separate state for deleted users
  deletedUsers: User[];
  setDeletedUsers: (users: User[]) => void;
  moveToDeleted: (userId: string) => void;
  restoreUser: (userId: string) => void;
  
  // Helper to get users by status
  getUsersByStatus: (isDeleted: boolean) => User[];
}

// Create the Zustand store
export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  deletedUsers: [],
  
  // Set all active users
  setUsers: (users) => set({ users }),
  
  // Set all deleted users
  setDeletedUsers: (deletedUsers) => set({ deletedUsers }),
  
  // Add a new user to active users
  addUser: (user) => set((state) => ({
    users: [...state.users, user]
  })),
  
  // Update a user in either active or deleted users
  updateUser: (userId, updates) => set((state) => ({
    users: state.users.map(user => 
      user._id === userId ? { ...user, ...updates } : user
    ),
    deletedUsers: state.deletedUsers.map(user => 
      user._id === userId ? { ...user, ...updates } : user
    )
  })),
  
  // Move a user from active to deleted
  moveToDeleted: (userId) => set((state) => {
    const userToDelete = state.users.find(user => user._id === userId);
    if (!userToDelete) return state;
    
    return {
      users: state.users.filter(user => user._id !== userId),
      deletedUsers: [...state.deletedUsers, { ...userToDelete, isDeleted: true, deletedAt: new Date().toISOString() }]
    };
  }),
  
  // Restore a user from deleted to active
  restoreUser: (userId) => set((state) => {
    const userToRestore = state.deletedUsers.find(user => user._id === userId);
    if (!userToRestore) return state;
    
    const { isDeleted, deletedAt, ...userData } = userToRestore;
    
    return {
      users: [...state.users, userData],
      deletedUsers: state.deletedUsers.filter(user => user._id !== userId)
    };
  }),
  
  // Remove a user completely
  removeUser: (userId, isDeleted = false) => set((state) => ({
    users: isDeleted 
      ? state.users 
      : state.users.filter(user => user._id !== userId),
    deletedUsers: isDeleted 
      ? state.deletedUsers.filter(user => user._id !== userId)
      : state.deletedUsers
  })),
  
  // Helper to get users by status
  getUsersByStatus: (isDeleted) => {
    return isDeleted ? get().deletedUsers : get().users;
  }
}));
