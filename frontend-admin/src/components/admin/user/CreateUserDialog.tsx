import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAdminStore } from '@/store/adminStore';
import { createUser } from '@/api/userService';

const CreateUserDialog = () => {
    const { addUser } = useAdminStore();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'agent' | 'admin'>('agent');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const newUser = await createUser({ name, email, password, role });
            addUser(newUser);
            setIsOpen(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create user');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>Create User</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <select value={role} onChange={(e) => setRole(e.target.value as 'agent' | 'admin')} className="w-full p-2 border rounded">
                        <option value="agent">Agent</option>
                        <option value="admin">Admin</option>
                    </select>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full">Create</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateUserDialog;
