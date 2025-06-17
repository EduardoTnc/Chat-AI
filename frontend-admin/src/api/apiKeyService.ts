import { axios } from '@/context/AuthContext';


const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PREFIX = '/api/v1/admin-api/api-keys';

// Extend the ApiKey interface to include usage information
declare module './apiKeyService' {
  interface ApiKey {
    usageCount?: number;
    lastUsedAt?: string;
    usedByModels?: Array<{
      _id: string;
      name: string;
      modelId: string;
    }>;
  }
}

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

/**
 * List all API keys with optional usage statistics
 * @param includeUsage Whether to include usage statistics (default: false)
 */
export const listApiKeys = async (includeUsage = false): Promise<ApiKey[]> => {
  try {
    const res = await axios.get(`${BASE_URL}${PREFIX}`, { 
      params: { includeUsage },
      withCredentials: true 
    });
    
    // Handle different response formats
    if (Array.isArray(res.data)) {
      return res.data;
    } else if (res.data && Array.isArray(res.data.data)) {
      return res.data.data;
    } else if (res.data && Array.isArray(res.data.keys)) {
      return res.data.keys;
    }
    
    console.warn('Unexpected API response format:', res.data);
    return [];
  } catch (error) {
    console.error('Error fetching API keys:', error);
    throw error;
  }
};

export const createApiKey = async (data: ApiKeyPayload): Promise<ApiKey> => {
  const res = await axios.post(`${BASE_URL}${PREFIX}`, data, { withCredentials: true });
  return res.data.data;
};

/**
 * Delete an API key by provider
 * @param provider The provider of the API key to delete
 * @param force If true, will force delete even if in use (default: false)
 */
export const deleteApiKey = async (provider: string, force = false) => {
  await axios.delete(`${BASE_URL}${PREFIX}/${provider}`, { 
    params: { force },
    withCredentials: true 
  });
};

/**
 * Get API keys by provider type
 * @param provider The provider name (e.g., 'openai', 'ollama')
 */
export const getApiKeysByProvider = async (provider: string): Promise<ApiKey[]> => {
  const allKeys = await listApiKeys(true);
  return allKeys.filter(key => key.provider === provider);
};

/**
 * Get API key usage statistics
 * @param provider The provider name (optional, if not provided returns all)
 */
export const getApiKeyUsage = async (provider?: string): Promise<{
  totalKeys: number;
  activeKeys: number;
  usageByProvider: Record<string, { count: number; lastUsed: string | null }>;
}> => {
  const res = await axios.get(`${BASE_URL}${PREFIX}/usage`, { 
    params: { provider },
    withCredentials: true 
  });
  return res.data.data || res.data;
};

// Upsert / update existing API key (same endpoint as create)
/**
 * Create or update an API key
 * @param provider The provider name
 * @param data The API key data
 * @param isUpdate If true, will update existing key instead of creating
 */
export const updateApiKey = async (
  provider: string,
  data: { 
    apiKey?: string; // Made optional to support description-only updates
    description?: string;
    isUpdate?: boolean;
  }
): Promise<ApiKey> => {
  const res = await axios.post(
    `${BASE_URL}${PREFIX}`,
    { 
      provider, 
      ...data,
      // Only include isUpdate if it's true to maintain backward compatibility
      ...(data.isUpdate ? { isUpdate: true } : {})
    },
    { withCredentials: true }
  );
  return res.data.data;
};

/**
 * Get API key usage by model
 * @param modelId The model ID to check usage for
 */
export const getApiKeyUsageByModel = async (modelId: string): Promise<{
  modelId: string;
  modelName: string;
  apiKey?: {
    _id: string;
    provider: string;
    description?: string;
    lastUsedAt?: string;
    usageCount?: number;
  };
}> => {
  const res = await axios.get(`${BASE_URL}${PREFIX}/model-usage/${modelId}`, { 
    withCredentials: true 
  });
  return res.data.data || res.data;
};
