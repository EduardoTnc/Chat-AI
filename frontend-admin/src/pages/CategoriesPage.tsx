import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from "sonner"
import { getCategories, deleteCategory, type Category } from '@/api/categoryService';
import { CreateCategoryDialog } from '@/components/admin/categories/CreateCategoryDialog';
import { EditCategoryDialog } from '@/components/admin/categories/EditCategoryDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const CategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Helper function to get full image URL
  const getFullImageUrl = (url: string = ''): string => {
    if (!url) return '';
    // If the URL is already absolute, return as is
    if (url.startsWith('http')) return url;
    // Otherwise, construct the full URL with the API base path
    return `${API_BASE_URL}/api/v1/images/${url.replace(/^\/+/, '')}`;
  };

  // Ensure the editing category has the full image URL
  const handleEditCategory = (category: Category) => {
    setEditingCategory({
      ...category,
      // Ensure the image URL is absolute for the edit form
      imageUrl: category.imageUrl ? getFullImageUrl(category.imageUrl) : ''
    });
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast.success('Categoría eliminada correctamente');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('No se pudo eliminar la categoría');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const columns: ColumnDef<Category>[] = [
    {
      accessorKey: 'imageUrl',
      header: 'Imagen',
      cell: ({ row }) => {
        const imageUrl = row.original.imageUrl ? getFullImageUrl(row.original.imageUrl) : '';
        return (
          <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
            {imageUrl ? (
              <img 
                src={imageUrl}
                alt={row.original.name || 'Category image'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '';
                }}
              />
            ) : (
              <ImageIcon className="w-5 h-5 text-gray-400" />
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'name',
      header: 'Nombre',
    },
    {
      accessorKey: 'createdAt',
      header: 'Creado',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditCategory(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCategoryToDelete(row.original._id)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categorías</h2>
          <p className="text-muted-foreground">
            Administra las categorías del menú del restaurante
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Categoría
        </Button>
      </div>

      <div className="rounded-md border">
        <DataTable
          columns={columns}
          data={categories}
          isLoading={loading}
          emptyMessage="No hay categorías disponibles"
        />
      </div>

      <CreateCategoryDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={loadCategories}
      />

      {editingCategory && (
        <EditCategoryDialog
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          category={editingCategory}
          onSuccess={() => {
            loadCategories();
            setEditingCategory(null);
          }}
        />
      )}

      <ConfirmDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
        title="Eliminar categoría"
        description="¿Estás seguro de que deseas eliminar esta categoría? Los ítems asociados no se eliminarán, pero ya no tendrán una categoría asignada."
        onConfirm={() => categoryToDelete && handleDelete(categoryToDelete)}
      />
    </div>
  );
};

export default CategoriesPage;
