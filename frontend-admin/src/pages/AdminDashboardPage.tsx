import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import UserTable from '../components/admin/UserTable';
import { useAdminStore } from '../store/adminStore';
import { getUsers } from '../api/userService';
import CreateUserDialog from '../components/admin/CreateUserDialog';

const AdminDashboardPage = () => {
    const { user, logout } = useAuth();
    const { setUsers } = useAdminStore();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const users = await getUsers();
                setUsers(users);
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        };

        fetchUsers();
    }, [setUsers]);

    return (
        <div className="h-screen w-full flex flex-col">
            <header className="flex items-center justify-between p-4 border-b">
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <div>
                    <span>Welcome, {user?.name}</span>
                    <Button onClick={logout} variant="outline" size="sm" className="ml-4">Logout</Button>
                </div>
            </header>
            <main className="flex-grow p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">User Management</h2>
                    <CreateUserDialog />
                </div>
                <UserTable />
            </main>
        </div>
    );
};

export default AdminDashboardPage;
