import { axios } from '@/context/AuthContext';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// Define the User type to be used in the service
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'agent' | 'admin' | 'user';
  isDeleted?: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Define the payload for creating a new user
export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'agent' | 'admin' | 'user';
}

// Define the payload for updating a user
export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: 'agent' | 'admin' | 'user';
  password?: string;
}

// Fetch all active users
export const getUsers = async (): Promise<User[]> => {
  const response = await axios.get(`${API_URL}/api/v1/admin-api/users`, {
    withCredentials: true,
  });
  console.log('Active users:', response.data.users);
  return response.data.users;
};

// Fetch all deleted users
export const getDeletedUsers = async (): Promise<User[]> => {
  const response = await axios.get(`${API_URL}/api/v1/admin-api/users/deleted`, {
    withCredentials: true,
  });
  console.log('Deleted users:', response.data.users);
  return response.data.users;
};

// Create a new user
export const createUser = async (userData: CreateUserPayload): Promise<User> => {
  const response = await axios.post(
    `${API_URL}/api/v1/admin-api/users`,
    userData,
    { withCredentials: true }
  );
  return response.data.user;
};

// Update an existing user
export const updateUser = async (
  userId: string,
  userData: UpdateUserPayload
): Promise<User> => {
  const response = await axios.put(
    `${API_URL}/api/v1/admin-api/users/${userId}`,
    userData,
    { withCredentials: true }
  );
  return response.data.user;
};

// Soft delete a user
export const deleteUser = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const response = await axios.delete(
    `${API_URL}/api/v1/admin-api/users/${userId}`,
    { withCredentials: true }
  );
  return response.data;
};

// Restore a soft-deleted user
export const restoreUser = async (userId: string): Promise<User> => {
  const response = await axios.put(
    `${API_URL}/api/v1/admin-api/users/restore/${userId}`,
    {},
    { withCredentials: true }
  );
  return response.data.user;
};
