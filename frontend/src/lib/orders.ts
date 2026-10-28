import type { Order, OrderStatus } from '@/types/api';

export const statusLabels: Record<OrderStatus, string> = {
  awaiting_payment: 'Menunggu pembayaran',
  awaiting_confirmation: 'Menunggu konfirmasi',
  confirmed: 'Dikonfirmasi',
  packed: 'Dikemas / siap diambil',
  shipped: 'Dikirim',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export function nextStatus(
  order: Pick<Order, 'status' | 'deliveryMethod'>,
): OrderStatus | null {
  switch (order.status) {
    case 'awaiting_confirmation':
      return 'confirmed';
    case 'confirmed':
      return 'packed';
    case 'packed':
      return order.deliveryMethod === 'pickup' ? 'completed' : 'shipped';
    case 'shipped':
      return 'completed';
    default:
      return null;
  }
}
export function statusClass(status: OrderStatus): string {
  return `order-status status-${status}`;
}
