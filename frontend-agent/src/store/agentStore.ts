import { create } from 'zustand';

export interface Conversation {
  id: string;
  customerName?: string;
  userName?: string;
  lastMessage?: string;
  timestamp?: string;
}

interface AgentState {
  conversations: Conversation[];
  escalatedConversations: Conversation[];
  currentConversationId: string | null;
  // bulk setters
  setConversations: (convos: Conversation[]) => void;
  setEscalatedConversations: (convos: Conversation[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  // mutators
  addConversation: (convo: Conversation) => void;
  addEscalatedConversation: (convo: Conversation) => void;
  removeEscalatedConversation: (id: string) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  conversations: [],
  escalatedConversations: [],
  currentConversationId: null,
  setConversations: (convos) => set({ conversations: convos }),
  setEscalatedConversations: (convos) => set({ escalatedConversations: convos }),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  addConversation: (convo) => set((state) => ({ conversations: [convo, ...state.conversations] })),
  addEscalatedConversation: (convo) => set((state) => ({ escalatedConversations: [convo, ...state.escalatedConversations] })),
  removeEscalatedConversation: (id) =>
    set((state) => ({ escalatedConversations: state.escalatedConversations.filter((c) => c.id !== id) })),
}));
