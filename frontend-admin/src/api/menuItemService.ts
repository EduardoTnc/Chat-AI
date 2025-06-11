import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PREFIX = '/api/v1/menu-items';

export interface MenuItemPayload {
  name: string;
  description: string;
  price: number;
  category: string;
  imageFile: File | null;
}

export const listMenuItems = async () => {
  const response = await axios.get(`${API_BASE_URL}${PREFIX}/list`);
  return response.data.menuItems;
};

export const addMenuItem = async (data: MenuItemPayload) => {
  const formData = new FormData();
  formData.append('name', data.name);
  formData.append('description', data.description);
  formData.append('price', String(data.price));
  formData.append('category', data.category);
  if (data.imageFile) formData.append('imageUrl', data.imageFile);

  const response = await axios.post(`${API_BASE_URL}${PREFIX}/add`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    withCredentials: true,
  });
  return response.data.data;
};

export const updateMenuItem = async (id: string, data: Partial<MenuItemPayload>) => {
  const formData = new FormData();
  if (data.name) formData.append('name', data.name);
  if (data.description) formData.append('description', data.description);
  if (data.price !== undefined) formData.append('price', String(data.price));
  if (data.category) formData.append('category', data.category);
  if (data.imageFile) formData.append('imageUrl', data.imageFile);

  const response = await axios.put(`${API_BASE_URL}${PREFIX}/update/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    withCredentials: true,
  });
  return response.data.data;
};

export const deleteMenuItem = async (id: string) => {
  const response = await axios.delete(`${API_BASE_URL}${PREFIX}/remove/${id}`, {
    withCredentials: true,
  });
  return response.data.data;
};
