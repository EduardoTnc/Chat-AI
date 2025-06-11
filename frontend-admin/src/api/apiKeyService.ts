import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PREFIX = '/api/v1/admin-api/api-keys';

export interface ApiKeyPayload {
  provider: string;
  apiKey: string;
  description?: string;
}

export interface ApiKey {
  _id: string;
  provider: string;
  maskedKey: string;
  description?: string;
  status: string;
  createdAt?: string;
}

export const listApiKeys = async (): Promise<ApiKey[]> => {
  const res = await axios.get(`${BASE_URL}${PREFIX}`, { withCredentials: true });
  return res.data.data || res.data;
};

export const createApiKey = async (data: ApiKeyPayload): Promise<ApiKey> => {
  const res = await axios.post(`${BASE_URL}${PREFIX}`, data, { withCredentials: true });
  return res.data.data;
};

export const deleteApiKey = async (provider: string) => {
  await axios.delete(`${BASE_URL}${PREFIX}/${provider}`, { withCredentials: true });
};

// Upsert / update existing API key (same endpoint as create)
export const updateApiKey = async (
  provider: string,
  data: { apiKey: string; description?: string }
): Promise<ApiKey> => {
  const res = await axios.post(
    `${BASE_URL}${PREFIX}`,
    { provider, ...data },
    { withCredentials: true }
  );
  return res.data.data;
};
