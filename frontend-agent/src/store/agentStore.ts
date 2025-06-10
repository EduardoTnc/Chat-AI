import { create } from 'zustand';

// Define the types for the store's state
interface Conversation {
  id: string;
  customerName: string;
  lastMessage: string;
  timestamp: string;
}

interface AgentState {
  conversations: Conversation[];
  currentConversationId: string | null;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversationId: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
}

// Create the Zustand store
export const useAgentStore = create<AgentState>((set: any) => ({
  conversations: [],
  currentConversationId: null,
  setConversations: (conversations: Conversation[]) => set({ conversations }),
  setCurrentConversationId: (id: string | null) => set({ currentConversationId: id }),
  addConversation: (conversation: Conversation) => 
    set((state: AgentState) => ({ conversations: [conversation, ...state.conversations] })),
}));
