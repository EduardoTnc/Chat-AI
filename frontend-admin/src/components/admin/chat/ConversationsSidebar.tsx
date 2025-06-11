import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

interface Props {
  socket: Socket;
  onSelect: (conversationId: string) => void;
}

interface ConversationSummary {
  _id: string;
  participants: string[];
  lastMessage?: string;
  unreadCount: number;
}

const ConversationsSidebar = ({ socket, onSelect }: Props) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    socket.emit('admin:getConversations');
    socket.on('admin:conversations', setConversations);
    return () => {
      socket.off('admin:conversations');
    };
  }, [socket]);

  const filtered = conversations.filter((c) =>
    c.participants.join(', ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-72 border-r flex flex-col">
      <div className="p-2">
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <ScrollArea className="flex-1">
        {filtered.map((c) => (
          <div
            key={c._id}
            className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex justify-between"
            onClick={() => onSelect(c._id)}
          >
            <span>{c.participants.join(', ')}</span>
            {c.unreadCount > 0 && (
              <span className="bg-primary text-white rounded-full text-xs px-2">
                {c.unreadCount}
              </span>
            )}
          </div>
        ))}
      </ScrollArea>
    </aside>
  );
};

export default ConversationsSidebar;
