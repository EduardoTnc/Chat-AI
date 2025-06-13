import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Key, Plus } from 'lucide-react';
import { toast } from 'sonner'
import { createApiKey } from '@/api/apiKeyService';
import { useApiKeyStore } from '@/store/apiKeyStore';

// Available providers for the dropdown
const PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'google', label: 'Google' },
  { value: 'custom', label: 'Otro' },
];

const CreateApiKeyDialog = () => {
  const { addKey } = useApiKeyStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    provider: '',
    apiKey: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!form.provider) {
      setError('Por favor selecciona un proveedor');
      return;
    }
    
    if (!form.apiKey) {
      setError('Por favor ingresa la clave API');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const created = await createApiKey({
        provider: form.provider,
        apiKey: form.apiKey,
        description: form.description || undefined,
      });
      
      addKey(created);
      
      toast.success(`La clave de ${form.provider} ha sido guardada correctamente.`);
      
      // Reset form and close dialog
      setForm({ provider: '', apiKey: '', description: '' });
      setOpen(false);
    } catch (err: any) {
      console.error('Error creating API key:', err);
      const errorMessage = err.response?.data?.message || 'Error al guardar la clave API';
      setError(errorMessage);
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          <span>Nueva clave API</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <span>Nueva clave API</span>
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Proveedor <span className="text-red-500">*</span></Label>
            <select
              id="provider"
              value={form.provider}
              onChange={(e) => handleChange('provider', e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            >
              <option value="">Selecciona un proveedor</option>
              {PROVIDERS.map((provider) => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="apiKey">Clave API <span className="text-red-500">*</span></Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={form.apiKey}
              onChange={(e) => handleChange('apiKey', e.target.value)}
              disabled={isLoading}
              className="font-mono"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="Ej: Clave de producción"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Una descripción que te ayude a identificar esta clave más adelante.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !form.provider || !form.apiKey}>
              {isLoading ? 'Guardando...' : 'Guardar clave'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateApiKeyDialog;
