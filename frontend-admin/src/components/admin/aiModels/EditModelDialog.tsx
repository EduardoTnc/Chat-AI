import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { updateAIModel } from '@/api/aiModelService';
import type { AIModel, AIModelPayload, AIModelProvider, AIModelRole } from '@/api/aiModelService';
import { useAIModelStore } from '@/store/aiModelStore';
import { listApiKeys } from '@/api/apiKeyService';

const ROLES: AIModelRole[] = ['user', 'agent', 'admin'];
const DEFAULT_PROVIDERS: AIModelProvider[] = ['openai', 'ollama', 'custom'];

// This will be populated with providers that have API keys configured

interface Props {
  model: AIModel;
}

const EditModelDialog = ({ model }: Props) => {
  const { updateModel } = useAIModelStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AIModelProvider[]>(DEFAULT_PROVIDERS);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState<AIModelPayload>({
    name: '',
    provider: 'openai',
    modelId: '',
    apiIdentifier: '',
    systemPrompt: '',
    isVisibleToClient: true,
    allowedRoles: [],
    supportsTools: false,
    isActive: true,
    description: '',
    isDefault: false,
  });

  // Load available providers when dialog opens
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const allApiKeys = await listApiKeys();
        const providers = [...new Set(allApiKeys.map(key => key.provider))] as AIModelProvider[];
        
        // Always include default providers even if no keys exist yet
        const allProviders = [...new Set([...DEFAULT_PROVIDERS, ...providers])];
        setAvailableProviders(allProviders);
      } catch (error) {
        console.error('Error loading providers:', error);
        // Fall back to default providers if there's an error
        setAvailableProviders(DEFAULT_PROVIDERS);
      }
    };

    if (open) {
      loadProviders();
    }
  }, [open]);

  // Initialize form when model changes or dialog opens
  useEffect(() => {
    if (model && open) {
      setForm({
        name: model.name,
        provider: model.provider as AIModelProvider,
        modelId: model.modelId,
        apiIdentifier: model.apiIdentifier,
        systemPrompt: model.systemPrompt || '',
        isVisibleToClient: model.isVisibleToClient,
        allowedRoles: [...model.allowedRoles],
        supportsTools: model.supportsTools,
        isActive: model.isActive,
        description: model.description || '',
        isDefault: model.isDefault || false,
      });
    }
  }, [model, open]);

  const handleChange = <K extends keyof AIModelPayload>(
    field: K,
    value: AIModelPayload[K]
  ) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleRole = (role: AIModelRole) => {
    setForm(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.includes(role)
        ? prev.allowedRoles.filter(r => r !== role)
        : [...prev.allowedRoles, role]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least one role is selected
    if (form.allowedRoles.length === 0) {
      setError('Se debe seleccionar al menos un rol');
      return;
    }

    setLoading(true);
    
    try {
      const updated = await updateAIModel(model._id, form);
      updateModel(updated);
      setOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar el modelo');
      console.error('Error updating AI model:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mr-2">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Modelo: {model.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre del modelo *</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-provider">Proveedor *</Label>
              <Select 
                value={form.provider} 
                onValueChange={(value: AIModelProvider) => handleChange('provider', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(provider => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-modelId">ID del modelo *</Label>
              <Input
                id="edit-modelId"
                value={form.modelId}
                onChange={(e) => handleChange('modelId', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-apiIdentifier">Identificador API *</Label>
              <Input
                id="edit-apiIdentifier"
                value={form.apiIdentifier}
                onChange={(e) => handleChange('apiIdentifier', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Input
              id="edit-description"
              value={form.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Breve descripción del modelo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-systemPrompt">Prompt del sistema</Label>
            <Textarea
              id="edit-systemPrompt"
              value={form.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              className="min-h-[120px]"
              placeholder="Eres un asistente de IA que responde a las preguntas de los usuarios."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => handleChange('isActive', checked)}
              />
              <Label htmlFor="edit-isActive">Activo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isVisibleToClient"
                checked={form.isVisibleToClient}
                onCheckedChange={(checked) => handleChange('isVisibleToClient', checked)}
                disabled={!form.isActive}
              />
              <Label htmlFor="edit-isVisibleToClient">Visible para clientes</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-supportsTools"
                checked={form.supportsTools}
                onCheckedChange={(checked) => handleChange('supportsTools', checked)}
              />
              <Label htmlFor="edit-supportsTools">Soporta herramientas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isDefault"
                checked={form.isDefault}
                onCheckedChange={(checked) => handleChange('isDefault', checked)}
              />
              <Label htmlFor="edit-isDefault">Modelo predeterminado</Label>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Roles permitidos *</Label>
            <div className="flex flex-wrap gap-4">
              {ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-role-${role}`}
                    checked={form.allowedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <Label htmlFor={`edit-role-${role}`} className="capitalize">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditModelDialog;
