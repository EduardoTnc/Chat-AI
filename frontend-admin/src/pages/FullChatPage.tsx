import { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from '@/context/AuthContext';
import ConversationsSidebar from '@/components/admin/chat/ConversationsSidebar';
import ChatWindow from '@/components/admin/chat/ChatWindow';


const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
  withCredentials: true,
  transports: ['websocket'],
});

const FullChatPage = () => {
  const { token } = useAuth();
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    socket.auth = { token };
    socket.connect();
    return () => {
      socket.disconnect();
    };
  }, [token]);

  return (
    <div className="flex h-full">
      <ConversationsSidebar socket={socket} onSelect={setActiveConversation} />
      <ChatWindow socket={socket} conversationId={activeConversation} />
    </div>
  );
};

export default FullChatPage;
