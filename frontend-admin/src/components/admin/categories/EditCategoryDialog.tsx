import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner"
import { updateCategory } from '@/api/categoryService';
import type { Category } from '@/api/categoryService';
import { Loader2, Image as ImageIcon, X } from 'lucide-react';

const categorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  imageFile: z.instanceof(File).optional(),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category;
  onSuccess?: () => void;
}

export const EditCategoryDialog = ({
  open,
  onOpenChange,
  category,
  onSuccess,
}: EditCategoryDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(category.imageUrl || null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category.name,
      imageFile: undefined,
    },
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = form;

  // Esta variable se utiliza en la plantilla para renderizado condicional
  const imageFile = watch('imageFile');

  useEffect(() => {
    if (category?.imageUrl) {
      setPreviewUrl(category.imageUrl);
    }
  }, [category]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue('imageFile', file, { shouldValidate: true });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      setIsLoading(true);
      await updateCategory(category._id, {
        name: data.name,
        imageFile: data.imageFile,
      });

      toast.success('La categoría ha sido actualizada correctamente');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('No se pudo actualizar la categoría');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Categoría</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Ej. Entradas, Platos Fuertes, etc."
              defaultValue={category.name}
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">
                {errors.name.message?.toString()}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Imagen</Label>
            <div className="flex flex-col items-center justify-center w-full">
              {previewUrl ? (
                <div className="relative w-full">
                  <img
                    src={previewUrl}
                    alt={category.name}
                    className="w-full h-48 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewUrl(null);
                      setValue('imageFile', undefined, { shouldValidate: true });
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-8 h-8 mb-2 text-gray-500" />
                    <p className="text-sm text-gray-500">
                      <span className="font-semibold">Haz clic para cambiar la imagen</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      PNG, JPG, JPEG (MAX. 5MB)
                    </p>
                  </div>
                  <input
                    id="image"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
              {errors.imageFile && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.imageFile.message}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
