import OrdersTable from '@/components/admin/orders/OrdersTable';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { OrderStatus } from '@/store/orderStore';

const OrdersPage = () => {
  const ACTIVE_STATUSES: OrderStatus[] = ['Procesando Orden', 'pending', 'in_progress'];
  const HISTORY_STATUSES: OrderStatus[] = ['completed', 'cancelled'];

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow p-4 space-y-4">
        <PageHeader
          title="Órdenes"
          description="Administra las órdenes de los clientes"
        />
        
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Activas</TabsTrigger>
            <TabsTrigger value="history">Históricas</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <OrdersTable statuses={ACTIVE_STATUSES} />
          </TabsContent>
          <TabsContent value="history">
            <OrdersTable statuses={HISTORY_STATUSES} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default OrdersPage;
