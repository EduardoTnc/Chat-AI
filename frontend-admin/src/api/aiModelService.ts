import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PREFIX = '/api/v1/admin-api/ai-models';

export type AIModelProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';
export type AIModelRole = 'user' | 'agent' | 'admin';

export interface AIModelPayload {
  name: string;
  provider: AIModelProvider;
  modelId: string;
  apiIdentifier: string;
  systemPrompt: string;
  isVisibleToClient: boolean;
  allowedRoles: AIModelRole[];
  supportsTools: boolean;
  isActive: boolean;
  description: string;
  isDefault: boolean;
  apiKeyId?: string | null; // Reference to the API key
  apiKeyRef?: {
    _id: string;
    provider: string;
    description?: string;
    lastUsedAt?: string;
    usageCount?: number;
  } | null; // Populated API key reference
}

export interface AIModel extends AIModelPayload {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export const listAIModels = async (): Promise<AIModel[]> => {
  const res = await axios.get(`${BASE_URL}${PREFIX}`, { withCredentials: true });
  const models = res.data.data || res.data; // depende del controlador
  // Asegurarse de que apiKeyId esté presente para compatibilidad con formularios
  return models.map((model: any) => ({
    ...model,
    apiKeyId: model.apiKeyRef?._id || model.apiKeyId || null
  }));
};

export const createAIModel = async (data: AIModelPayload): Promise<AIModel> => {
  // Extraer solo los campos necesarios para la creación
  const { apiKeyRef, ...modelData } = data;
  const payload = {
    ...modelData,
    apiKeyId: data.apiKeyId || null
  };

  const res = await axios.post(`${BASE_URL}${PREFIX}`, payload, { withCredentials: true });
  return res.data.data;
};

export const updateAIModel = async (id: string, data: Partial<AIModelPayload>): Promise<AIModel> => {
  // Extraer solo los campos necesarios para la actualización
  const {apiKeyRef, ...updateData } = data;
  const payload = {
    ...updateData,
    apiKeyId: data.apiKeyId !== undefined ? data.apiKeyId : null
  };

  const res = await axios.put(`${BASE_URL}${PREFIX}/${id}`, payload, { withCredentials: true });
  return res.data.data;
};

export const deleteAIModel = async (id: string) => {
  await axios.delete(`${BASE_URL}${PREFIX}/${id}`, { withCredentials: true });
};
