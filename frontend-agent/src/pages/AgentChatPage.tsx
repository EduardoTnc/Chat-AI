import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { useAgentSocket } from '../hooks/useAgentSocket';
import ConversationQueue from '../components/agent-chat/ConversationQueue';
import MessageArea from '../components/agent-chat/MessageArea';
import ConversationDetails from '../components/agent-chat/ConversationDetails';
import { useTheme } from '../context/ThemeContext';

const AgentChatPage = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    useAgentSocket(); // Initialize the socket connection

    return (
        <div className="h-screen w-full flex flex-col max-h-screen">
            <header className="flex items-center justify-between p-4 border-b max-h-[6rem]">
                <h1 className="text-xl font-bold">Chat Agente</h1>
                <span className='font-bold text-lg self-center'>Bienvenido, {user?.name}</span>
                <div className='flex items-center gap-2'>
                    <Button onClick={toggleTheme} variant="outline" size="sm" className="ml-4">Tema {theme === 'dark' ? 'Oscuro' : 'Claro'}</Button>
                    <Button onClick={logout} variant="destructive" size="sm" className="ml-4">Cerrar Sesión</Button>
                </div>
            </header>
            <main className="flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 p-4 max-h-[calc(100vh-6rem)]">
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
