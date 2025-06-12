import { useEffect } from 'react';
import { useOrderStore } from '@/store/orderStore';
import OrdersTable from '@/components/admin/orders/OrdersTable';
import { PageHeader } from '@/components/admin/layout/PageHeader';

const OrdersPage = () => {
  const { fetchOrders } = useOrderStore();

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow p-4">
        <PageHeader 
          title="Órdenes" 
          description="Administra las órdenes de los clientes"
        >
        </PageHeader>
        <OrdersTable />
      </main>
    </div>
  );
};

export default OrdersPage;
