import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Utensils } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMenuItemStore } from '@/store/menuItemStore';
import { listMenuItems } from '@/api/menuItemService';
import { MenuItemsTable } from '@/components/admin/menuItems/MenuItemsTable';
import { CreateMenuItemDialog } from '@/components/admin/menuItems/CreateMenuItemDialog';
import { PageHeader } from '@/components/admin/layout/PageHeader';

export function MenuItemsPage() {
  const { setItems, items } = useMenuItemStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const items = await listMenuItems();
      setItems(items);
    } catch (error) {
      console.error('Error al cargar los ítems:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const activeItemsCount = items?.filter(item => !item.isDeleted).length || 0;
  const deletedItemsCount = items?.filter(item => item.isDeleted).length || 0;

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title="Menú"
        description="Administra los ítems del menú del restaurante"
      >
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar ítem
        </Button>
        <CreateMenuItemDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen}
          onSuccess={fetchItems}
        />
      </PageHeader>
      
      <Tabs 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            Activos
            {activeItemsCount > 0 && (
              <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                {activeItemsCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="deleted" className="flex items-center gap-2">
            <Trash2 className="h-4 w-4" />
            Eliminados
            {deletedItemsCount > 0 && (
              <span className="ml-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                {deletedItemsCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="rounded-md border">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Cargando ítems activos...</div>
            ) : (
              <MenuItemsTable 
                showDeleted={false} 
                onRestore={fetchItems}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="deleted">
          <div className="rounded-md border">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">Cargando ítems eliminados...</div>
            ) : (
              <MenuItemsTable 
                showDeleted={true}
                onRestore={fetchItems}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MenuItemsPage;
