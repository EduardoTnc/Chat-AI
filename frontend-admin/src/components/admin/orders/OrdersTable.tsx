import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';
import { useOrderStore, type OrderStatus as StoreOrderStatus } from '@/store/orderStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'Procesando Orden', label: 'Procesando Orden' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En preparación' },
  { value: 'completed', label: 'Completado' },
  { value: 'cancelled', label: 'Cancelado' },
] as const;

type OrderStatus = StoreOrderStatus;

type OrdersTableProps = {
  statuses?: OrderStatus[];
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const OrdersTable = ({ statuses }: OrdersTableProps) => {
  const { 
    orders, 
    isLoading, 
    error, 
    fetchOrders, 
    updateOrderStatus 
  } = useOrderStore();
  
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders(statuses);
  }, [fetchOrders, JSON.stringify(statuses)]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (!orderId || !newStatus) {
      toast.error('Datos de orden inválidos');
      return;
    }
    
    try {
      setUpdatingOrderId(orderId);
      
      // Make the API call first
      const result = await updateOrderStatus(orderId, newStatus);
      
      if (!result.success || !result.order) {
        throw new Error(result.error || 'No se pudo actualizar el estado');
      }
      
      // Update the orders list with the new status
      await fetchOrders(statuses);
      
      toast.success(`Orden #${orderId.substring(orderId.length - 6).toUpperCase()}: ${getStatusLabel(newStatus)}`);
      
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast.error(`Error al actualizar orden: ${errorMessage}`);
      
      // Refresh the orders to ensure consistency
      await fetchOrders(statuses);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option?.label || status;
  };

  const getStatusVariant = (status: OrderStatus): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'Procesando Orden':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Cargando órdenes...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md flex items-center text-red-600">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>{error}</span>
      </div>
    );
  }
  
  if (orders.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        No hay órdenes para mostrar
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 mb-4 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Productos</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order._id}>
              <TableCell className="font-medium">
                {order._id.substring(order._id.length - 6).toUpperCase()}
              </TableCell>
              <TableCell>
                {order.deliveryAddress ? 
                  `${order.deliveryAddress.firstName || ''} ${order.deliveryAddress.lastName || ''}`.trim() || 
                  order.deliveryAddress.email || 
                  'Cliente' : 
                  'Cliente'}
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-2">
                  {order.items.map((item, index) => (
                    <div key={`${order._id}-${index}`} className="text-sm flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      {item.price && (
                        <span className="ml-2 text-muted-foreground">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(order.totalAmount || 0)}
              </TableCell>
              <TableCell className="relative">
                <div className="flex items-center gap-2">
                  <Select
                    key={`${order._id}-${order.status}`} // Force re-render on status change
                    value={order.status}
                    onValueChange={(value: OrderStatus) => handleStatusChange(order._id, value)}
                    disabled={isLoading || updatingOrderId === order._id}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem 
                          key={opt.value} 
                          value={opt.value}
                          className={opt.value === order.status ? 'font-semibold bg-accent' : ''}
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingOrderId === order._id && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <div className={cn(
                  "mt-1 text-xs px-2 py-0.5 rounded-full w-fit",
                  getStatusVariant(order.status as OrderStatus)
                )}>
                  {getStatusLabel(order.status as OrderStatus)}
                </div>
              </TableCell>
              <TableCell>
                {formatDate(order.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrdersTable;
