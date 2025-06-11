import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select } from '@/components/ui/select';
import { useOrderStore } from '@/store/orderStore';
import { updateOrderStatus } from '@/api/orderService';

const statusOptions = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
];

const OrdersTable = () => {
  const { orders, updateOrder } = useOrderStore();

  const handleStatusChange = async (orderId: string, status: string) => {
    const updated = await updateOrderStatus(orderId, status as any);
    updateOrder(updated);
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Usuario</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Creado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o._id}>
            <TableCell>{o._id}</TableCell>
            <TableCell>{o.user?.name || 'N/A'}</TableCell>
            <TableCell>${o.total.toFixed(2)}</TableCell>
            <TableCell>
              <Select value={o.status} onValueChange={(value: string) => handleStatusChange(o._id, value)}>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </TableCell>
            <TableCell>{new Date(o.createdAt || '').toLocaleString()}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default OrdersTable;
