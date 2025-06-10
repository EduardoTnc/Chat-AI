import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAgentStore } from '@/store/agentStore';

const ConversationDetails = () => {
    // Placeholder data
    const { currentConversationId } = useAgentStore();

    const details = {
        customerName: 'John Doe',
        email: 'john.doe@example.com',
        orderId: 'ORD-12345',
        status: 'Active',
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle>Conversation Details {currentConversationId}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div>
                        <p className="font-semibold">Customer</p>
                        <p className="text-sm text-gray-500">{details.customerName}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Email</p>
                        <p className="text-sm text-gray-500">{details.email}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Order ID</p>
                        <p className="text-sm text-gray-500">{details.orderId}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Status</p>
                        <p className="text-sm text-gray-500">{details.status}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ConversationDetails;
