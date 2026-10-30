import type { Role } from '@/types/api';

export function orderNavigation(role?: Role) {
  if (role === 'admin') return { to: '/admin/orders', label: 'Pesanan' };
  if (role === 'kasir') return { to: '/cashier/history', label: 'Riwayat transaksi' };
  return { to: '/customer/orders', label: 'Pesanan saya' };
}
