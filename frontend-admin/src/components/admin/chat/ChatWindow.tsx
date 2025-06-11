import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  socket: Socket;
  conversationId: string | null;
}

interface Message {
  _id: string;
  sender: string;
  content: string;
  createdAt: string;
}

const ChatWindow = ({ socket, conversationId }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) return;
    socket.emit('admin:getMessages', { conversationId });
    socket.on('admin:messages', setMessages);

    socket.on('message:new', (msg: Message) => {
      setMessages((m) => [...m, msg]);
    });

    return () => {
      socket.off('admin:messages');
      socket.off('message:new');
    };
  }, [socket, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!text.trim() || !conversationId) return;
    socket.emit('message:send', { conversationId, content: text });
    setText('');
  };

  return (
    <div className="flex-1 flex flex-col">
      <ScrollArea className="flex-1 p-4 space-y-2">
        {messages.map((m) => (
          <div key={m._id} className="p-2 rounded bg-gray-100 max-w-lg">
            <p className="text-xs text-gray-500">{m.sender}</p>
            <p>{m.content}</p>
            <p className="text-xs text-gray-400 text-right">
              {new Date(m.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </ScrollArea>
      <div className="p-2 border-t flex space-x-2">
        <Textarea
          className="flex-1"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
        <Button onClick={sendMessage}>Enviar</Button>
      </div>
    </div>
  );
};

export default ChatWindow;
