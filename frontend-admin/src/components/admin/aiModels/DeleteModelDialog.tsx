import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { deleteAIModel } from '@/api/aiModelService';
import { useAIModelStore } from '@/store/aiModelStore';

interface Props {
  id: string;
  name: string;
  isDefault?: boolean;
}

const DeleteModelDialog = ({ id, name, isDefault = false }: Props) => {
  const { removeModel } = useAIModelStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteAIModel(id);
      removeModel(id);
      setOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar el modelo');
      console.error('Error deleting AI model:', err);
    } finally {
      setLoading(false);
    }
  };

  // Prevent deletion of default model
  if (isDefault) {
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        className="text-muted-foreground hover:text-muted-foreground"
        disabled
        title="No se puede eliminar el modelo predeterminado"
      >
        Eliminar
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>¿Eliminar modelo de IA?</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert variant="destructive" className="text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>¡Atención!</AlertTitle>
            <AlertDescription>
              <p>Esta acción no se puede deshacer. El modelo será eliminado permanentemente.</p>
            </AlertDescription>
          </Alert>
          
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2">Modelo a eliminar:</h4>
            <div className="font-mono text-sm bg-background p-2 rounded">
              {name}
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="text-left">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                <p>{error}</p>
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <div className="flex justify-end gap-3 w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={loading}
            >
              {loading ? 'Eliminando...' : 'Eliminar modelo'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteModelDialog;
