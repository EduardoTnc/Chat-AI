import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUserStore } from '@/store/userStore';
import DeleteUserDialog from './DeleteUserDialog';
import EditUserDialog from './EditUserDialog';
import { Button } from '@/components/ui/button';
import { Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { restoreUser } from '@/api/userService';

interface UserTableProps {
  isDeleted?: boolean;
  onUserUpdated: () => void;
}

const UserTable = ({ isDeleted = false, onUserUpdated }: UserTableProps) => {
  const { moveToDeleted, restoreUser: restoreUserInStore, getUsersByStatus } = useUserStore();
  
  // Get users based on status (active or deleted)
  const users = getUsersByStatus(isDeleted);

  const handleRestore = async (userId: string) => {
    try {
      await restoreUser(userId);
      restoreUserInStore(userId);
      onUserUpdated();
      toast.success('Usuario restaurado correctamente');
    } catch (error) {
      console.error('Error restoring user:', error);
      toast.error('No se pudo restaurar el usuario');
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        {isDeleted ? 'No hay usuarios eliminados' : 'No hay usuarios registrados'}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user._id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell className="capitalize">{user.role}</TableCell>
            <TableCell>
              <span className={`px-2 py-1 rounded-full text-xs ${user.isDeleted ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {user.isDeleted ? 'Eliminado' : 'Activo'}
              </span>
            </TableCell>
            <TableCell className="space-x-2">
              {isDeleted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(user._id)}
                  className="h-8"
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  Restaurar
                </Button>
              ) : (
                <>
                  <EditUserDialog 
                    user={user} 
                    onSuccess={onUserUpdated} 
                  />
                  <DeleteUserDialog 
                    userId={user._id} 
                    userName={user.name} 
                    onSuccess={() => {
                      moveToDeleted(user._id);
                      onUserUpdated();
                    }} 
                  />
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UserTable;
