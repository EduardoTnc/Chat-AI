import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteUser } from '@/api/userService';

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
  isDeleted?: boolean;
  onSuccess?: () => void;
}

const DeleteUserDialog = ({ 
  userId, 
  userName, 
  isDeleted = false, 
  onSuccess 
}: DeleteUserDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    if (!userId) {
      setError('ID de usuario no válido');
      return;
    }

    setError('');
    setIsDeleting(true);
    
    try {
      await deleteUser(userId);
      toast.success('Usuario eliminado correctamente');
      setIsOpen(false);
      onSuccess?.();
    } catch (err: any) {
      console.error('Error al eliminar usuario:', err);
      const errorMessage = err.response?.data?.message || 'Error al eliminar el usuario';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={isDeleted}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar usuario</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro de eliminar este usuario?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>Esta acción marcará al usuario <span className="font-medium">{userName}</span> como eliminado.</p>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Consecuencias:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>El usuario no podrá iniciar sesión</li>
                  <li>Sus datos se conservarán en el sistema</li>
                  <li>Puedes restaurar al usuario más adelante si es necesario</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        {error && (
          <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
            {error}
          </div>
        )}
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Sí, eliminar usuario'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteUserDialog;
