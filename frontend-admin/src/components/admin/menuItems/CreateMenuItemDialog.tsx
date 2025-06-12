import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Plus, X, Check, ChevronDown, Loader2 } from 'lucide-react';
import { getUniqueCategories } from '@/api/menuItemService';

interface CreateMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CreateMenuItemDialog = ({ open, onOpenChange, onSuccess }: CreateMenuItemDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Cargar categorías al abrir el diálogo
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const fetchedCategories = await getUniqueCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        toast.error('Error al cargar las categorías');
      } finally {
        setIsLoadingCategories(false);
      }
    };
    
    if (open) {
      loadCategories();
    }
  }, [open]);
  
  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('El nombre de la categoría no puede estar vacío');
      return;
    }
    
    const trimmedCategory = newCategory.trim();
    
    if (categories.includes(trimmedCategory)) {
      toast.error('Esta categoría ya existe');
      return;
    }
    
    try {
      // La categoría se guardará cuando se guarde el ítem
      setCategories(prev => [...prev, trimmedCategory]);
      setCategory(trimmedCategory);
      setNewCategory('');
      setIsAddingCategory(false);
      toast.success('Categoría agregada');
    } catch (error) {
      console.error('Error al agregar categoría:', error);
      toast.error('Error al agregar la categoría');
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      toast.error('Por favor selecciona o crea una categoría');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/menu-items/add`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el ítem');
      }

      toast.success('Ítem creado exitosamente');
      onOpenChange(false);
      onSuccess?.();
      
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setCategory('');
      setImageFile(null);
    } catch (error: any) {
      console.error('Error al crear el ítem:', error);
      setError(error.message || 'Error al crear el ítem');
      toast.error(error.message || 'Error al crear el ítem');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Crear nuevo ítem</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Completa los campos para agregar un nuevo ítem al menú.
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-medium">
              Nombre
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
              disabled={loading}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="price" className="block text-sm font-medium">
                Precio (S/.)
              </label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="category" className="block text-sm font-medium">
                  Categoría
                </label>
                {!isAddingCategory && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary"
                    onClick={() => setIsAddingCategory(true)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Nueva categoría
                  </Button>
                )}
              </div>
              
              {isLoadingCategories ? (
                <div className="flex h-10 items-center justify-center rounded-md border bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : isAddingCategory ? (
                <div className="flex gap-2">
                  <Input
                    id="new-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="Nombre de la categoría"
                    className="flex-1"
                    autoFocus
                    disabled={loading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddCategory}
                    disabled={!newCategory.trim() || loading}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setIsAddingCategory(false);
                      setNewCategory('');
                    }}
                    disabled={loading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full appearance-none items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                    disabled={loading}
                  >
                    <option value="">Selecciona una categoría</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 opacity-50" />
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="image" className="block text-sm font-medium">
              Imagen (opcional)
            </label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              disabled={loading}
            />
            {imageFile && (
              <p className="text-xs text-muted-foreground">
                {imageFile.name} ({(imageFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear ítem'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { CreateMenuItemDialog };
