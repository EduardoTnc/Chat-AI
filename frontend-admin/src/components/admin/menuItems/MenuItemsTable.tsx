import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useMenuItemStore } from '@/store/menuItemStore';
import EditMenuItemDialog from './EditMenuItemDialog';
import DeleteMenuItemDialog from './DeleteMenuItemDialog';
import { restoreMenuItem } from '@/api/menuItemService';
import { toast } from 'sonner';

interface MenuItemsTableProps {
  showDeleted?: boolean;
  onRestore?: () => void;
}

const MenuItemsTable = ({ showDeleted = false, onRestore }: MenuItemsTableProps) => {
  const { items } = useMenuItemStore();
  
  const filteredItems = items.filter(item => 
    showDeleted ? item.isDeleted : !item.isDeleted
  );

  const handleRestore = async (id: string) => {
    try {
      const response = await restoreMenuItem(id);
      toast.success(response.message || 'Ítem restaurado correctamente');
      onRestore?.();
    } catch (error: any) {
      console.error('Error al restaurar el ítem:', error);
      toast.error(error.message || 'Error al restaurar el ítem');
    }
  };

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {showDeleted 
          ? 'No hay ítems eliminados' 
          : 'No hay ítems disponibles'}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filteredItems.map((item) => (
          <TableRow 
            key={item._id}
            className={item.isDeleted ? 'bg-red-50 dark:bg-red-900/20' : ''}
          >
            <TableCell>
              <img
                src={item.imageUrl ? `${import.meta.env.VITE_API_URL}/api/v1/images/${item.imageUrl}` : '/placeholder-image.jpg'}
                alt={item.name}
                className="h-12 w-12 object-cover rounded"
              />
            </TableCell>
            <TableCell className="font-medium">{item.name}</TableCell>
            <TableCell>S/.{item.price.toFixed(2)}</TableCell>
            <TableCell className="flex items-center gap-2">
              {typeof item.category === 'object' && item.category?.imageUrl && (
                <img
                  src={`${import.meta.env.VITE_API_URL}/api/v1/images/${item.category.imageUrl}`}
                  alt={item.category.name}
                  className="h-6 w-6 object-cover rounded-full"
                />
              )}
              <span>{typeof item.category === 'object' ? item.category.name : item.category || 'Sin categoría'}</span>
            </TableCell>
            <TableCell>
              {item.isDeleted ? (
                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                  Eliminado
                </span>
              ) : (
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  Activo
                </span>
              )}
            </TableCell>
            <TableCell className="space-x-2">
              {item.isDeleted ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRestore(item._id)}
                >
                  Restaurar
                </Button>
              ) : (
                <>
                  <EditMenuItemDialog item={item} />
                  <DeleteMenuItemDialog id={item._id} name={item.name} onDeleted={onRestore} />
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export { MenuItemsTable };
