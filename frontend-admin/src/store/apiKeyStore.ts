import { create } from 'zustand';
import type { ApiKey } from '@/api/apiKeyService';

interface State {
  keys: ApiKey[];
  setKeys: (k: ApiKey[]) => void;
  addKey: (k: ApiKey) => void;
  removeKey: (provider: string) => void;
  updateKey: (k: ApiKey) => void;
}

export const useApiKeyStore = create<State>((set) => ({
  keys: [],
  setKeys: (keys: ApiKey[]) => set({ keys }),
  addKey: (key: ApiKey) => set((state) => ({ keys: [...state.keys, key] })),
  removeKey: (provider: string) =>
    set((state) => ({
      keys: state.keys.filter((k) => k.provider !== provider),
    })),
  updateKey: (updatedKey: ApiKey) =>
    set((state) => ({
      keys: state.keys.map((existingKey) => {
        if (existingKey._id === updatedKey._id) {
          // Merge the existing key with the updated fields
          return {
            ...existingKey,  // Keep all existing fields
            ...updatedKey,   // Apply all updates
            // Ensure we don't accidentally remove any fields
            provider: updatedKey.provider || existingKey.provider,
            description: updatedKey.description ?? existingKey.description,
            maskedKey: updatedKey.maskedKey || existingKey.maskedKey,
            status: updatedKey.status || existingKey.status || 'active',
          };
        }
        return existingKey;
      }),
    })),
}));
