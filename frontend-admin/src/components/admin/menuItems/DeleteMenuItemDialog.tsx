import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { deleteMenuItem } from '@/api/menuItemService';
import { toast } from 'sonner';

interface Props {
  id: string;
  name: string;
  onDeleted?: () => void;
}

const DeleteMenuItemDialog = ({ id, name, onDeleted }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    setError('');
    try {
      await deleteMenuItem(id);
      toast.success('Ítem eliminado correctamente');
      onDeleted?.();
      setOpen(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al eliminar el ítem';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Eliminar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. ¿Deseas eliminar el ítem "{name}"?
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <div className="text-destructive text-sm mb-4">{error}</div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteMenuItemDialog;
