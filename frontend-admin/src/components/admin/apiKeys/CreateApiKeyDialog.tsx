import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ApiKeyPayload } from '@/api/apiKeyService';
import { createApiKey } from '@/api/apiKeyService';
import { useApiKeyStore } from '@/store/apiKeyStore';

const CreateApiKeyDialog = () => {
  const { addKey } = useApiKeyStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ApiKeyPayload>({ provider: '', apiKey: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof ApiKeyPayload, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createApiKey(form);
      addKey(created);
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
        <Button>Nuevo API Key</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo API Key</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input placeholder="Proveedor" value={form.provider} onChange={(e) => handleChange('provider', e.target.value)} required />
          <Input placeholder="API Key" value={form.apiKey} onChange={(e) => handleChange('apiKey', e.target.value)} required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateApiKeyDialog;
