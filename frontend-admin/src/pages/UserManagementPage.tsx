import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserStore } from '@/store/userStore';
import { getUsers, getDeletedUsers } from '@/api/userService';
import CreateUserDialog from '@/components/admin/user/CreateUserDialog';
import UserTable from '@/components/admin/user/UserTable';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { toast } from 'sonner';

const UserManagementPage = () => {
  const [activeTab, setActiveTab] = useState('active');
  const { setUsers } = useUserStore();

  const fetchUsers = async () => {
    try {
      const [activeUsers, deletedUsers] = await Promise.all([
        getUsers(),
        getDeletedUsers(),
      ]);
      // Store active users in the store
      setUsers(activeUsers);
      // Store deleted users in the store
      useUserStore.getState().setDeletedUsers(deletedUsers);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      toast.error('No se pudieron cargar los usuarios');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow p-4">
        <PageHeader 
          title="Gestión de Usuarios" 
          description="Gestiona los usuarios del sistema"
        >
          <CreateUserDialog onSuccess={fetchUsers} />
        </PageHeader>

        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-4 mt-4"
        >
          <TabsList>
            <TabsTrigger value="active">Usuarios Activos</TabsTrigger>
            <TabsTrigger value="deleted">Usuarios Eliminados</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <UserTable onUserUpdated={fetchUsers} />
          </TabsContent>
          
          <TabsContent value="deleted">
            <UserTable isDeleted onUserUpdated={fetchUsers} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default UserManagementPage;
