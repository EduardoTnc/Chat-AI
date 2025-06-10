import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/agentStore';

const MessageArea = () => {
    // Placeholder data
    const { currentConversationId } = useAgentStore();
    const messages = [
        { id: '1', sender: 'customer', text: 'Hello, I need help with my order.' },
        { id: '2', sender: 'agent', text: 'Hello! I can help with that. What is your order number?' },
    ];

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Chat with {currentConversationId}</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <ScrollArea className="h-[calc(100vh-18rem)]">
                    <div className="space-y-4">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`p-3 rounded-lg max-w-xs ${msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
            <CardFooter>
                <div className="w-full flex items-center space-x-2">
                    <Textarea placeholder="Type your message..." className="flex-grow" />
                    <Button>Send</Button>
                </div>
            </CardFooter>
        </Card>
    );
};

export default MessageArea;
