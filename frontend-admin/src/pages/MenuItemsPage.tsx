import { useEffect } from 'react';
import { useMenuItemStore } from '@/store/menuItemStore';
import { listMenuItems } from '@/api/menuItemService';
import MenuItemsTable from '@/components/admin/menuItems/MenuItemsTable';
import CreateMenuItemDialog from '@/components/admin/menuItems/CreateMenuItemDialog';

const MenuItemsPage = () => {
  const { setItems } = useMenuItemStore();

  useEffect(() => {
    const fetchItems = async () => {
      const items = await listMenuItems();
      setItems(items);
    };
    fetchItems();
  }, [setItems]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Menú</h2>
        <CreateMenuItemDialog />
      </div>
      <MenuItemsTable />
    </div>
  );
};

export default MenuItemsPage;
