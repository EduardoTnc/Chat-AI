import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAdminStore } from '@/store/adminStore';
import { updateUser } from '@/api/userService';

interface User {
    _id: string;
    name: string;
    email: string;
    role: 'agent' | 'admin' | 'user';
}

interface EditUserDialogProps {
    user: User;
}

const EditUserDialog = ({ user }: EditUserDialogProps) => {
    const { updateUser: updateUserInStore } = useAdminStore();
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState(user.name);
    const [role, setRole] = useState<'agent' | 'admin' | 'user'>(user.role);
    const [error, setError] = useState('');

    useEffect(() => {
        setName(user.name);
        setRole(user.role);
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const updatedUserData = await updateUser(user._id, { name, role });
            updateUserInStore(updatedUserData);
            setIsOpen(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update user');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mr-2">Edit</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {user.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
                    <select value={role} onChange={(e) => setRole(e.target.value as 'agent' | 'admin' | 'user')} className="w-full p-2 border rounded">
                        <option value="agent">Agent</option>
                        <option value="admin">Admin</option>
                        <option value="user">User</option>
                    </select>
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <Button type="submit" className="w-full">Save Changes</Button>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default EditUserDialog;
