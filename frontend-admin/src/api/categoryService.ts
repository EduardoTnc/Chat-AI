import { axios } from '@/context/AuthContext';

export interface Category {
  _id: string;
  name: string;
  imageUrl?: string;  // Made optional with ?
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  imageFile: File;
}

export interface UpdateCategoryData {
  name?: string;
  imageFile?: File | null;
}

// Helper function to create form data
export const createFormData = (data: any): FormData => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value as any);
    }
  });
  return formData;
};

export const getCategories = async (): Promise<Category[]> => {
  const response = await axios.get('/categories');
  return response.data.data;
};

export const getCategory = async (id: string): Promise<Category> => {
  const response = await axios.get(`/categories/${id}`);
  return response.data.data;
};

export const createCategory = async (data: CreateCategoryData): Promise<Category> => {
  const formData = createFormData({
    name: data.name,
    image: data.imageFile
  });

  const response = await axios.post('/categories', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const updateCategory = async (id: string, data: UpdateCategoryData): Promise<Category> => {
  const formData = createFormData({
    name: data.name,
    ...(data.imageFile && { image: data.imageFile })
  });

  const response = await axios.put(`/categories/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await axios.delete(`/categories/${id}`);
};
