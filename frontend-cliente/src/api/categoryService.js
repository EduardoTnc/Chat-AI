import axios from 'axios';

// Using the same API URL as the chat API to match the existing configuration
const API_URL = 'http://localhost:5001/api/v1';

export const getCategories = async () => {
  try {
    const response = await axios.get(`${API_URL}/categories`);
    console.log('response.data categories', response.data);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};
