import type { Order, OrderStatus } from '@/types/api';

export const statusLabels: Record<OrderStatus, string> = {
  awaiting_payment: 'Menunggu pembayaran',
  awaiting_confirmation: 'Menunggu diproses',
  confirmed: 'Dikonfirmasi',
  packed: 'Siap dikirim / diambil',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function nextStatus(
  order: Pick<Order, 'status' | 'deliveryMethod'>,
): OrderStatus | null {
  switch (order.status) {
    case 'awaiting_confirmation':
    case 'confirmed':
      return 'packed';
    case 'packed':
      return order.deliveryMethod === 'pickup' ? 'completed' : 'shipped';
    case 'shipped':
      return order.deliveryMethod === 'shipping' ? 'completed' : null;
    default:
      return null;
  }
}

export function orderStatusLabel(
  order: Pick<Order, 'status' | 'deliveryMethod'>,
): string {
  if (order.status === 'packed')
    return order.deliveryMethod === 'pickup' ? 'Siap diambil' : 'Siap dikirim';
  return statusLabels[order.status];
}

export function nextStatusAction(
  order: Pick<Order, 'status' | 'deliveryMethod'>,
): string | null {
  switch (nextStatus(order)) {
    case 'packed':
      return order.deliveryMethod === 'pickup' ? 'Siap diambil' : 'Proses pesanan';
    case 'shipped':
      return 'Kirim pesanan';
    case 'completed':
      return order.deliveryMethod === 'pickup' ? 'Sudah diambil' : 'Selesaikan pesanan';
    default:
      return null;
  }
}
export function statusClass(status: OrderStatus): string {
  return `order-status status-${status}`;
}
