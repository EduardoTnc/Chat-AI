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
    set((state) => ({ keys: state.keys.filter((k) => k.provider !== provider) })),
  updateKey: (key: ApiKey) =>
    set((state) => ({ keys: state.keys.map((k) => (k.provider === key.provider ? key : k)) })),
}));
