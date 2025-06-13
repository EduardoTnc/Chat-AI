import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getUsers } from '@/api/userService';
import { listMenuItems } from '@/api/menuItemService';
import { listOrdersAdmin } from '@/api/orderService';
import { listAIModels } from '@/api/aiModelService';
import { toast } from 'sonner';

interface Stats {
  users: number;
  orders: number;
  menuItems: number;
  aiModels: number;
}

const DashboardPage = () => {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    orders: 0,
    menuItems: 0,
    aiModels: 0,
  });

  useEffect(() => {
    (async () => {
      try {
        const [users, orders, menuItems, aiModels] = await Promise.all([
          getUsers(),
          listOrdersAdmin(),
          listMenuItems(),
          listAIModels(),
        ]);

        setStats({
          users: users.length,
          orders: orders.length,
          menuItems: menuItems.length,
          aiModels: aiModels.length,
        });
      } catch (error) {
        console.error('Error al cargar estadísticas del dashboard:', error);
        toast.error('Error al cargar estadísticas del dashboard');
      }
    })();
  }, []);

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow p-4 space-y-4">
        <PageHeader
          title="Dashboard"
          description="Resumen de la actividad del sistema"
        />

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>Cantidad total de usuarios</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-4xl font-bold">{stats.users}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Órdenes</CardTitle>
              <CardDescription>Órdenes totales</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-4xl font-bold">{stats.orders}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Elementos de Menú</CardTitle>
              <CardDescription>Total items en el menú</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-4xl font-bold">{stats.menuItems}</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Modelos IA</CardTitle>
              <CardDescription>Modelos configurados</CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-4xl font-bold">{stats.aiModels}</span>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
