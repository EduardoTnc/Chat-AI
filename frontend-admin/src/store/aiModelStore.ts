import { create } from 'zustand';
import type { AIModel } from '@/api/aiModelService';

interface State {
  models: AIModel[];
  setModels: (m: AIModel[]) => void;
  addModel: (m: AIModel) => void;
  updateModel: (m: AIModel) => void;
  removeModel: (id: string) => void;
}

export const useAIModelStore = create<State>((set) => ({
  models: [],
  setModels: (models) => set({ models }),
  addModel: (model) => set((s) => ({ models: [...s.models, model] })),
  updateModel: (model) => set((s) => ({ models: s.models.map((m) => (m._id === model._id ? model : m)) })),
  removeModel: (id) => set((s) => ({ models: s.models.filter((m) => m._id !== id) })),
}));
