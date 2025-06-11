import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMenuItemStore } from '@/store/menuItemStore';
import EditMenuItemDialog from './EditMenuItemDialog';
import DeleteMenuItemDialog from './DeleteMenuItemDialog';

const MenuItemsTable = () => {
  const { items } = useMenuItemStore();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Imagen</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item._id}>
            <TableCell>
              <img src={`${import.meta.env.VITE_API_URL}/api/v1/images/${item.imageUrl}`} alt={item.name} className="h-12 w-12 object-cover" />
            </TableCell>
            <TableCell>{item.name}</TableCell>
            <TableCell>${item.price.toFixed(2)}</TableCell>
            <TableCell>{item.category}</TableCell>
            <TableCell>
              <EditMenuItemDialog item={item} />
              <DeleteMenuItemDialog id={item._id} name={item.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default MenuItemsTable;
