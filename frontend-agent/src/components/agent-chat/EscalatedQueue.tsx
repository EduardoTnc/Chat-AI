import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/agentStore';
import { useAgentSocket } from '@/hooks/useAgentSocket';

const EscalatedQueue = () => {
  const { escalatedConversations, removeEscalatedConversation } = useAgentStore();
  const { pickChat } = useAgentSocket();

  const handlePick = (id: string) => {
    pickChat(id);
    removeEscalatedConversation(id);
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Conversaciones Escaladas</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-4">
            {escalatedConversations.length === 0 && (
              <p className="text-sm text-muted-foreground">No hay conversaciones escaladas pendientes.</p>
            )}
            {escalatedConversations.map((convo) => (
              <div
                key={convo.id}
                className="p-3 rounded-lg border flex items-center justify-between hover:bg-gray-50"
              >
                <div>
                  <p className="font-semibold">{convo.userName || convo.customerName || 'Cliente'}</p>
                  <p className="text-sm text-gray-500 truncate max-w-xs">
                    {convo.lastMessage || 'Sin mensaje'}
                  </p>
                </div>
                <Button size="sm" onClick={() => handlePick(convo.id)}>
                  Tomar chat
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default EscalatedQueue;
