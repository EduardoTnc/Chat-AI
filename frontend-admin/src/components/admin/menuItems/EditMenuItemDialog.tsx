import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateMenuItem } from '@/api/menuItemService';
import { getCategories } from '@/api/categoryService';
import { useMenuItemStore } from '@/store/menuItemStore';
import type { MenuItem, Category } from '@/store/menuItemStore';
import { toast } from 'sonner';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';

interface EditMenuItemDialogProps {
  item: MenuItem;
  onUpdated?: () => void;
}

const EditMenuItemDialog = ({ item, onUpdated }: EditMenuItemDialogProps) => {
  const { updateItem } = useMenuItemStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(item.price.toString());
  const [categoryId, setCategoryId] = useState(
    typeof item.category === 'string' ? item.category : item.category?._id || ''
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    item.imageUrl ? `${import.meta.env.VITE_API_URL}/api/v1/images/${item.imageUrl}` : null
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [error, setError] = useState('');

  // Load categories when dialog opens
  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await getCategories();
        setCategories(response);
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        toast.error('Error al cargar las categorías');
      } finally {
        setIsLoadingCategories(false);
      }
    };

    if (open) {
      loadCategories();
      // Reset form with current item data
      setName(item.name);
      setDescription(item.description);
      setPrice(item.price.toString());
      setCategoryId(typeof item.category === 'string' ? item.category : item.category?._id || '');
      setImagePreview(item.imageUrl ? `${import.meta.env.VITE_API_URL}/api/v1/images/${item.imageUrl}` : null);
      setError('');
    }
  }, [open, item]);

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

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', categoryId);
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const updatedItem = await updateMenuItem(item._id, formData);
      updateItem(updatedItem);
      
      toast.success('Ítem actualizado exitosamente');
      setOpen(false);
      onUpdated?.();
    } catch (error: any) {
      console.error('Error al actualizar el ítem:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Error al actualizar el ítem';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mr-2">Editar</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar ítem: {item.name}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-price">Precio (S/.)</Label>
              <Input
                id="edit-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
              required
              disabled={isLoading}
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
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      <div className="flex items-center gap-2">
                        {cat.imageUrl && (
                          <img
                            src={`${import.meta.env.VITE_API_URL}/api/v1/images/${cat.imageUrl}`}
                            alt={cat.name}
                            className="h-5 w-5 object-cover rounded-full"
                          />
                        )}
                        {cat.name}
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
                  <>
                    <img
                      src={imagePreview}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6 mb-1" />
                    <span className="text-xs">Sin imagen</span>
                  </div>
                )}
              </div>
              <div>
                <Input
                  id={`edit-image-${item._id}`}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isLoading}
                />
                <Label
                  htmlFor={`edit-image-${item._id}`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 cursor-pointer"
                >
                  Cambiar imagen
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: JPG, PNG, WEBP. Máx. 2MB
                </p>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMenuItemDialog;
