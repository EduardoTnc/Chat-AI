import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAgentStore } from '@/store/agentStore';

const MessageArea = () => {
    // Placeholder data
    const { currentConversationId } = useAgentStore();
    const messages = [
        { id: '1', sender: 'customer', text: 'Hola, necesito ayuda con mi orden.' },
        { id: '2', sender: 'agent', text: 'Hola, ¿con qué orden necesitas ayuda?' },
    ];

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle>Chat con {currentConversationId}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <div className="space-y-4">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'agent' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-lg max-w-xs ${msg.sender === 'agent' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                        <p>{msg.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="pt-4 mt-auto">
                        <div className="relative w-full flex items-end space-x-2">
                            <Textarea
                                placeholder="Escribe tu mensaje..."
                                className="flex-grow min-h-[40px] max-h-96 overflow-y-auto resize-none"
                                rows={1}
                                style={{
                                    height: 'auto',
                                    maxHeight: '384px',
                                    scrollbarWidth: 'thin',
                                    scrollbarGutter: 'stable',
                                    resize: 'none',
                                    overflowY: 'auto',
                                    overflowX: 'hidden',
                                    scrollbarColor: 'transparent',
                                }}
                                onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${Math.min(target.scrollHeight, 384)}px`;
                                }}
                            />
                            <Button className="h-10">Enviar</Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default MessageArea;
