import { useEffect } from 'react';
import { listOrdersAdmin } from '@/api/orderService';
import { useOrderStore } from '@/store/orderStore';
import OrdersTable from '@/components/admin/orders/OrdersTable';

const OrdersPage = () => {
  const { setOrders } = useOrderStore();

  useEffect(() => {
    (async () => {
      const orders = await listOrdersAdmin();
      setOrders(orders);
    })();
  }, [setOrders]);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Órdenes</h2>
      <OrdersTable />
    </div>
  );
};

export default OrdersPage;
