import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAgentStore } from '@/store/agentStore';

const ConversationDetails = () => {
    // Placeholder data
    const { currentConversationId } = useAgentStore();

    const details = {
        customerName: 'John Doe',
        email: 'john.doe@example.com',
        orderId: 'ORD-12345',
        status: 'En Escalada',
        escalationReason: 'El cliente necesita ayuda con un problema técnico',
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Detalles de la Conversación {currentConversationId}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div>
                        <p className="font-semibold">Nombre del Cliente</p>
                        <p className="text-sm text-gray-500">{details.customerName}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-sm text-gray-500">{details.email}</p>
                    </div>
                    <div>
                        <p className="font-semibold">ID de la Orden</p>
                        <p className="text-sm text-gray-500">{details.orderId}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Estado</p>
                        <p className="text-sm text-gray-500">{details.status}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Motivo de la Escalada</p>
                        <p className="text-sm text-gray-500">{details.escalationReason}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ConversationDetails;
