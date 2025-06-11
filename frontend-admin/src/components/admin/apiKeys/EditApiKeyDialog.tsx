import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateApiKey } from '@/api/apiKeyService';
import { useApiKeyStore } from '@/store/apiKeyStore';

interface Props {
  provider: string;
  currentDescription?: string;
}

const EditApiKeyDialog = ({ provider, currentDescription = '' }: Props) => {
  const { updateKey } = useApiKeyStore();
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [description, setDescription] = useState(currentDescription);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await updateApiKey(provider, { apiKey, description });
      updateKey(updated);
      setOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error');
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
      <DialogContent className="max-w-md">
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
