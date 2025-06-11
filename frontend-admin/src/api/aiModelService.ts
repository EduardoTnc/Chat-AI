import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PREFIX = '/api/v1/admin-api/ai-models';

export interface AIModelPayload {
  name: string;
  provider: string;
  modelId: string;
  pricePer1KInputTokens: number;
  pricePer1KOutputTokens: number;
  maxTokens: number;
  enabled: boolean;
}

export interface AIModel extends AIModelPayload {
  _id: string;
  createdAt?: string;
}

export const listAIModels = async (): Promise<AIModel[]> => {
  const res = await axios.get(`${BASE_URL}${PREFIX}`, { withCredentials: true });
  return res.data.data || res.data; // depende del controlador
};

export const createAIModel = async (data: AIModelPayload): Promise<AIModel> => {
  const res = await axios.post(`${BASE_URL}${PREFIX}`, data, { withCredentials: true });
  return res.data.data;
};

export const updateAIModel = async (id: string, data: Partial<AIModelPayload>): Promise<AIModel> => {
  const res = await axios.put(`${BASE_URL}${PREFIX}/${id}`, data, { withCredentials: true });
  return res.data.data;
};

export const deleteAIModel = async (id: string) => {
  await axios.delete(`${BASE_URL}${PREFIX}/${id}`, { withCredentials: true });
};
