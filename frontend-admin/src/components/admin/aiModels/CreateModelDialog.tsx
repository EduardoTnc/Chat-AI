import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AIModelPayload } from '@/api/aiModelService';
import { createAIModel } from '@/api/aiModelService';
import { useAIModelStore } from '@/store/aiModelStore';

const CreateModelDialog = () => {
  const { addModel } = useAIModelStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AIModelPayload>({
    name: '',
    provider: '',
    modelId: '',
    pricePer1KInputTokens: 0,
    pricePer1KOutputTokens: 0,
    maxTokens: 0,
    enabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: keyof AIModelPayload, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createAIModel(form);
      addModel(created);
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
        <Button>Nuevo Modelo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Modelo de IA</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input placeholder="Nombre" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
          <Input placeholder="Proveedor" value={form.provider} onChange={(e) => handleChange('provider', e.target.value)} required />
          <Input placeholder="ID Modelo" value={form.modelId} onChange={(e) => handleChange('modelId', e.target.value)} required />
          <Input type="number" placeholder="Precio 1K Input" value={form.pricePer1KInputTokens} onChange={(e) => handleChange('pricePer1KInputTokens', Number(e.target.value))} required />
          <Input type="number" placeholder="Precio 1K Output" value={form.pricePer1KOutputTokens} onChange={(e) => handleChange('pricePer1KOutputTokens', Number(e.target.value))} required />
          <Input type="number" placeholder="Máx Tokens" value={form.maxTokens} onChange={(e) => handleChange('maxTokens', Number(e.target.value))} required />
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={form.enabled} onChange={(e) => handleChange('enabled', e.target.checked)} />
            <span>Habilitado</span>
          </label>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando...' : 'Crear'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateModelDialog;
