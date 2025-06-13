import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateApiKey } from '@/api/apiKeyService';
import { useApiKeyStore } from '@/store/apiKeyStore';
import { toast } from 'sonner';

interface Props {
  provider: string;
  currentDescription?: string;
  keyId?: string; // Added to match usage in parent component, even if not used yet
}

const EditApiKeyDialog = ({ provider, currentDescription = '', keyId = '' }: Props) => {
  const { updateKey } = useApiKeyStore();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState(currentDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If no fields are being updated, show an error
    if (!apiKey && description === currentDescription) {
      setError('Por favor actualiza al menos un campo');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // If updating the API key, we need to include the new key
      const isUpdate = true; // This is an update operation
      const updateData: { 
        apiKey?: string; 
        description: string;
        isUpdate?: boolean;
      } = { 
        description,
        isUpdate // Always set isUpdate to true since this is an edit dialog
      };
      
      // Only include apiKey if it's provided (not empty)
      if (apiKey) {
        updateData.apiKey = apiKey;
      }
      
      const updated = await updateApiKey(provider, updateData);
      
      // Update the store with the complete key data from the server
      updateKey({
        ...updated,
        _id: keyId,
        provider, // Ensure provider is included
        // Include any other fields that might be needed for display
        maskedKey: updated.maskedKey || '••••••••' + (apiKey ? apiKey.slice(-4) : '')
      });
      
      toast.success('API Key actualizada correctamente');
      setOpen(false);
    } catch (err: any) {
      console.error('Error updating API key:', err);
      setError(err.response?.data?.message || 'Error al actualizar la clave API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" onInteractOutside={(e) => {
        // Prevent dialog from closing when clicking outside if there are unsaved changes
        if (apiKey || description !== currentDescription) {
          e.preventDefault();
        }
      }}>
        <DialogHeader>
          <DialogTitle>Editar API Key ({provider})</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            placeholder="Nueva API Key (dejar en blanco si no cambia)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Input
            placeholder="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditApiKeyDialog;
