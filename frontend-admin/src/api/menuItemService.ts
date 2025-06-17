import { axios } from '@/context/AuthContext';

export interface MenuItemPayload extends Partial<FormData> {
  name: string;
  description: string;
  price: string | number;
  category: string;
  image?: File;
}

export const listMenuItems = async () => {
  const response = await axios.get('/menu-items/list-all');
  return response.data.menuItems;
};

export const addMenuItem = async (formData: FormData) => {
  const response = await axios.post('/menu-items/add', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.menuItem;
};

export const updateMenuItem = async (id: string, formData: FormData) => {
  const response = await axios.put(`/menu-items/update/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.updatedItem;
};

export const getCategories = async (): Promise<Array<{ _id: string; name: string; imageUrl?: string }>> => {
  const response = await axios.get('/categories');
  return response.data.data || [];
};

export const deleteMenuItem = async (id: string) => {
  const response = await axios.delete(`/menu-items/remove/${id}`);
  return response.data;
};

export const restoreMenuItem = async (id: string) => {
  try {
    const response = await axios.put(`/menu-items/restore/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Error al restaurar el ítem:', error);
    throw new Error(error.response?.data?.message || 'Error al restaurar el ítem');
  }
};
