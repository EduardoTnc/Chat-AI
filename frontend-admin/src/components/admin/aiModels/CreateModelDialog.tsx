import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { createAIModel } from '@/api/aiModelService';
import { getApiKeysByProvider, listApiKeys } from '@/api/apiKeyService';
import { useAIModelStore } from '@/store/aiModelStore';
import type { AIModelPayload, AIModelProvider, AIModelRole } from '@/api/aiModelService';
import { toast } from 'sonner';

// Type guard to check if a provider is custom
const isCustomProvider = (provider: AIModelProvider): provider is 'custom' => {
  return provider === 'custom';
};

const DEFAULT_SYSTEM_PROMPT = 'Eres un asistente de IA que responde a las preguntas de los usuarios.';
const ROLES: AIModelRole[] = ['user', 'agent', 'admin'];
// This will be populated with providers that have API keys configured
const DEFAULT_PROVIDERS: AIModelProvider[] = ['openai', 'ollama', 'custom'];

const CreateModelDialog = () => {
  const { addModel } = useAIModelStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Type for the API key from the API
  type ApiKey = {
    _id: string;
    provider: string; // This comes as a string from the API
    description?: string;
  };

  // Type for the API key in our local state (with typed provider)
  type LocalApiKey = {
    _id: string;
    provider: AIModelProvider;
    description?: string;
  };

  const [apiKeys, setApiKeys] = useState<LocalApiKey[]>([]);
  const [loadingApiKeys, setLoadingApiKeys] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<AIModelProvider[]>(DEFAULT_PROVIDERS);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState<AIModelPayload>({
    name: '',
    provider: 'openai',
    modelId: '',
    apiIdentifier: '',
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    isVisibleToClient: true,
    allowedRoles: ['user'],
    supportsTools: false,
    isActive: true,
    description: '',
    isDefault: false,
    apiKeyId: null,
  });

  // Load available providers when dialog opens
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const allApiKeys = await listApiKeys();
        
        // Get unique providers that have API keys and are valid AIModelProvider types
        const validProviders: AIModelProvider[] = ['openai', 'anthropic', 'ollama', 'custom'];
        const providerSet = new Set<AIModelProvider>();
        
        // Add all valid providers that have API keys
        for (const key of allApiKeys as ApiKey[]) {
          if (validProviders.includes(key.provider as AIModelProvider)) {
            providerSet.add(key.provider as AIModelProvider);
          }
        }
        
        // Always include 'custom' as an option
        providerSet.add('custom');
        const available = Array.from(providerSet);
        
        setAvailableProviders(available.length > 0 ? available : ['custom']);
        
        // If current provider is not available, reset to the first available provider
        if (available.length > 0 && !available.includes(form.provider)) {
          setForm(prev => ({
            ...prev,
            provider: available[0],
            apiKeyId: null
          }));
        }
      } catch (error) {
        console.error('Error loading providers:', error);
        toast.error('Error al cargar los proveedores');
        setAvailableProviders(['custom']);
      }
    };

    if (open) {
      loadProviders();
    }
  }, [open, form.provider]);

  // Load API keys when provider changes
  useEffect(() => {
    const loadApiKeys = async () => {
      // Only load API keys for non-custom providers
      if (isCustomProvider(form.provider)) {
        setApiKeys([]);
        setForm(prev => ({ ...prev, apiKeyId: null }));
        return;
      }
      
      try {
        setLoadingApiKeys(true);
        const keys = await getApiKeysByProvider(form.provider);
        
        // Convert API keys to our local type, ensuring provider is a valid AIModelProvider
        const typedKeys: LocalApiKey[] = [];
        
        for (const key of keys as ApiKey[]) {
          // Only include keys with valid provider types
          if (['openai', 'anthropic', 'ollama', 'custom'].includes(key.provider)) {
            typedKeys.push({
              _id: key._id,
              provider: key.provider as AIModelProvider,
              description: key.description
            });
          }
        }
        
        setApiKeys(typedKeys);
        
        // If there's only one key, select it by default
        if (typedKeys.length === 1) {
          setForm(prev => ({
            ...prev,
            apiKeyId: typedKeys[0]._id
          }));
        } else if (typedKeys.length > 0) {
          // If there are multiple keys but none selected, select the first one
          setForm(prev => ({
            ...prev,
            apiKeyId: prev.apiKeyId || typedKeys[0]?._id || null
          }));
        } else {
          // No keys available for this provider
          setForm(prev => ({
            ...prev,
            apiKeyId: null
          }));
        }
      } catch (error) {
        console.error('Error loading API keys:', error);
        toast.error('Error al cargar las claves API');
        setApiKeys([]);
        setForm(prev => ({ ...prev, apiKeyId: null }));
      } finally {
        setLoadingApiKeys(false);
      }
    };

    if (open && form.provider) {
      loadApiKeys();
    }
  }, [form.provider, open]);

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
    
    // Validate API key is selected for non-custom providers
    if (form.provider !== 'custom' && !form.apiKeyId) {
      setError('Por favor selecciona una clave API para este proveedor');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Prepare the payload
      const payload = { ...form };
      
      // If provider is custom, ensure apiKeyId is not sent
      if (isCustomProvider(form.provider)) {
        delete payload.apiKeyId;
      }
      
      const created = await createAIModel(payload);
      addModel(created);
      setOpen(false);
      
      // Reset form
      setForm({
        name: '',
        provider: 'openai',
        modelId: '',
        apiIdentifier: '',
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        isVisibleToClient: true,
        allowedRoles: ['user'],
        supportsTools: false,
        isActive: true,
        description: '',
        isDefault: false,
        apiKeyId: null,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al crear el modelo');
      console.error('Error creating AI model:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nuevo Modelo</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Modelo de IA</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del modelo *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Asistente de Restaurante"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Proveedor *</Label>
              <Select
                value={form.provider}
                onValueChange={(value: AIModelProvider) => {
                  // Reset API key when provider changes
                  handleChange('apiKeyId', null);
                  handleChange('provider', value);
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un proveedor" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map((provider) => (
                    <SelectItem key={provider} value={provider}>
                      {provider}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.provider !== 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="apiKeyId">Clave API *</Label>
                {loadingApiKeys ? (
                  <div className="h-10 w-full rounded-md border border-input bg-muted animate-pulse" />
                ) : apiKeys.length > 0 ? (
                  <Select
                    value={form.apiKeyId || ''}
                    onValueChange={(value) => handleChange('apiKeyId', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una clave API" />
                    </SelectTrigger>
                    <SelectContent>
                      {apiKeys.map((key) => (
                        <SelectItem key={key._id} value={key._id}>
                          {key.description || `Clave ${key._id.substring(0, 6)}...`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No hay claves API disponibles para {form.provider}.
                    <Button 
                      variant="link" 
                      className="h-auto p-0 ml-2"
                      type="button"
                      onClick={() => {
                        toast.info(`Por favor, crea una clave API para ${form.provider} primero.`);
                      }}
                    >
                      Crear clave
                    </Button>
                  </div>
                )}
                {!isCustomProvider(form.provider) && !form.apiKeyId && (
                  <p className="text-xs text-red-500 mt-1">
                    Se requiere una clave API para este proveedor
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="modelId">ID del modelo *</Label>
              <Input
                id="modelId"
                value={form.modelId}
                onChange={(e) => handleChange('modelId', e.target.value)}
                placeholder="Ej: gpt-4o"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiIdentifier">Identificador API *</Label>
              <Input
                id="apiIdentifier"
                value={form.apiIdentifier}
                onChange={(e) => handleChange('apiIdentifier', e.target.value)}
                placeholder="Ej: gpt-4o-2024-08-06"
                required
              />
            </div>

          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              value={form.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Breve descripción del modelo"
            />
          </div>

          <div className="space-y-2">
            <Label>Prompt del sistema</Label>
            <Textarea
              value={form.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              className="min-h-[120px]"
              placeholder={DEFAULT_SYSTEM_PROMPT}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => handleChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Activo</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isVisibleToClient"
                checked={form.isVisibleToClient}
                onCheckedChange={(checked) => handleChange('isVisibleToClient', checked)}
                disabled={!form.isActive}
              />
              <Label htmlFor="isVisibleToClient">Visible para clientes</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="supportsTools"
                checked={form.supportsTools}
                onCheckedChange={(checked) => handleChange('supportsTools', checked)}
              />
              <Label htmlFor="supportsTools">Soporta herramientas</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={form.isDefault}
                onCheckedChange={(checked) => handleChange('isDefault', Boolean(checked))}
              />
              <Label htmlFor="isDefault">Establecer como modelo predeterminado</Label>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Roles permitidos *</Label>
            <div className="flex flex-wrap gap-4">
              {ROLES.map((role) => (
                <div key={role} className="flex items-center space-x-2">
                  <Checkbox
                    id={`role-${role}`}
                    checked={form.allowedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <Label htmlFor={`role-${role}`} className="capitalize">
                    {role}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md">
              {error}
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (form.provider !== 'custom' && !form.apiKeyId)}
            >
              {loading ? 'Creando...' : 'Crear Modelo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateModelDialog;
