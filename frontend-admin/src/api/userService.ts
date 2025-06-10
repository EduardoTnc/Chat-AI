import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/admin/users`;

// Define the User type to be used in the service
interface User {
  _id: string;
  name: string;
  email: string;
  role: 'agent' | 'admin' | 'user';
  isDeleted: boolean;
  createdAt: string;
}

// Define the payload for creating a new user
interface CreateUserPayload {
    name: string;
    email: string;
    password: string;
    role: 'agent' | 'admin';
}

// Fetch all users
export const getUsers = async (): Promise<User[]> => {
    const response = await axios.get(API_URL);
    return response.data.data;
};

// Create a new user
export const createUser = async (userData: CreateUserPayload): Promise<User> => {
    const response = await axios.post(API_URL, userData);
    return response.data.data;
};

// Update an existing user
export const updateUser = async (userId: string, userData: Partial<User>) => {
    const response = await axios.put(`${API_URL}/${userId}`, userData);
    return response.data.data;
};

// Soft delete a user
export const deleteUser = async (userId: string) => {
    const response = await axios.delete(`${API_URL}/${userId}`);
    return response.data.data;
};
