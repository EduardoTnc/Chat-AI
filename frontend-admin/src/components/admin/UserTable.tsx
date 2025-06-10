import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAdminStore } from '@/store/adminStore';
import DeleteUserDialog from './DeleteUserDialog';
import EditUserDialog from './EditUserDialog';

const UserTable = () => {
    const { users } = useAdminStore();

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => (
                    <TableRow key={user._id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{user.isDeleted ? 'Deleted' : 'Active'}</TableCell>
                        <TableCell>
                            <EditUserDialog user={user} />
                            <DeleteUserDialog userId={user._id} userName={user.name} isDeleted={user.isDeleted} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export default UserTable;
