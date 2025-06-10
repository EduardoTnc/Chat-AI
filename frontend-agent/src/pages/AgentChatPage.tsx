import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { useAgentSocket } from '../hooks/useAgentSocket';
import ConversationQueue from '../components/agent-chat/ConversationQueue';
import MessageArea from '../components/agent-chat/MessageArea';
import ConversationDetails from '../components/agent-chat/ConversationDetails';

const AgentChatPage = () => {
    const { user, logout } = useAuth();
    useAgentSocket(); // Initialize the socket connection

    return (
        <div className="h-screen w-full flex flex-col">
            <header className="flex items-center justify-between p-4 border-b">
                <h1 className="text-xl font-bold">Agent Dashboard</h1>
                <div>
                    <span>Welcome, {user?.name}</span>
                    <Button onClick={logout} variant="outline" size="sm" className="ml-4">Logout</Button>
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
                <div className="md:col-span-1">
                    <ConversationQueue />
                </div>
                <div className="md:col-span-2">
                    <MessageArea />
                </div>
                <div className="md:col-span-1">
                    <ConversationDetails />
                </div>
            </main>
        </div>
    );
};

export default AgentChatPage;
