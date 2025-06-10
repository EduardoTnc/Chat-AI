import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAgentStore } from '@/store/agentStore';

const ConversationQueue = () => {
    // Placeholder data
    const { conversations } = useAgentStore();

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Conversation Queue</CardTitle>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-12rem)]">
                    <div className="space-y-4">
                        {conversations.map((convo) => (
                            <div key={convo.id} className="p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
                                <p className="font-semibold">{convo.customerName}</p>
                                <p className="text-sm text-gray-500 truncate">{convo.lastMessage}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default ConversationQueue;
