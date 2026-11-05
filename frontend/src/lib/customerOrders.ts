import type { Order } from '@/types/api';

export const customerOrderFilters = [
  { value: 'all', label: 'Semua status' },
  { value: 'awaiting_payment', label: 'Belum dibayar' },
  { value: 'processing', label: 'Diproses' },
  { value: 'shipped', label: 'Dikirim' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
] as const;

export function customerOrderAction(
  order: Pick<Order, 'status' | 'paymentStatus' | 'deliveryMethod' | 'paymentDeadline'>,
  now = Date.now(),
) {
  if (
    order.status === 'awaiting_payment' &&
    order.paymentStatus === 'unpaid' &&
    (!order.paymentDeadline || new Date(order.paymentDeadline).getTime() > now)
  )
    return 'pay';
  if (
    order.paymentStatus === 'paid' &&
    (order.status === 'shipped' ||
      (order.status === 'packed' && order.deliveryMethod === 'pickup'))
  )
    return 'receive';
  return 'view';
}

export function customerOrderTone(status: Order['status']) {
  if (status === 'cancelled') return 'cancelled';
  if (status === 'completed') return 'completed';
  if (status === 'shipped') return 'shipped';
  return 'waiting';
}
