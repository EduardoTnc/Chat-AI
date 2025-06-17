import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';
import { addMenuItem } from '@/api/menuItemService';
import { getCategories } from '@/api/categoryService';
import type { Category } from '@/store/menuItemStore';

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
  const [categoryId, setCategoryId] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Cargar categorías al abrir el diálogo
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await getCategories();
        setCategories(response);
      } catch (error) {
        console.error('Error loading categories:', error);
        toast.error('Error loading categories');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    if (open) {
      loadCategories();
    } else {
      // Reset form when dialog closes
      setName('');
      setDescription('');
      setPrice('');
      setCategoryId('');
      setImageFile(null);
      setImagePreview(null);
      setError('');
    }
  }, [open]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryId) {
      toast.error('Por favor selecciona una categoría');
      return;
    }
    
    if (!imageFile) {
      toast.error('Por favor selecciona una imagen');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', categoryId);
      formData.append('imageUrl', imageFile);

      await addMenuItem(formData);

      toast.success('Ítem creado exitosamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error al crear el ítem:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al crear el ítem';
      setError(errorMessage);
      toast.error(errorMessage);
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
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Precio (S/.)</Label>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ingrese la descripción del ítem"
                className="min-h-[100px]"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoría</Label>
              {isLoadingCategories ? (
                <div className="flex items-center justify-center h-10 border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select
                  value={categoryId}
                  onValueChange={setCategoryId}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category._id} value={category._id}>
                        <div className="flex items-center gap-2">
                          {category.imageUrl && (
                            <img
                              src={`${import.meta.env.VITE_API_URL}/api/v1/images/${category.imageUrl}`}
                              alt={category.name}
                              className="h-5 w-5 object-cover rounded-full"
                            />
                          )}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Imagen</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-md overflow-hidden border border-dashed border-muted-foreground/25 flex items-center justify-center">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-6 w-6 mb-1" />
                      <span className="text-xs">Vista previa</span>
                    </div>
                  )}
                </div>
                <div>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={loading}
                  />
                  <Label
                    htmlFor="image"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
                  >
                    Seleccionar imagen
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos: JPG, PNG, WEBP. Máx. 2MB
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear ítem'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { CreateMenuItemDialog };
