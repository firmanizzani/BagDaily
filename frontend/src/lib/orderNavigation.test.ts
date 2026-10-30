import { describe, expect, it } from 'vitest';
import { orderNavigation } from './orderNavigation';

describe('order navigation by role', () => {
  it('sends admins to online order management', () => {
    expect(orderNavigation('admin')).toEqual({
      to: '/admin/orders',
      label: 'Pesanan online',
    });
  });
  it('sends cashiers to offline transaction history', () => {
    expect(orderNavigation('kasir')).toEqual({
      to: '/cashier/history',
      label: 'Riwayat transaksi',
    });
  });
  it('keeps customer navigation scoped to their own orders', () => {
    expect(orderNavigation('pelanggan')).toEqual({
      to: '/customer/orders',
      label: 'Pesanan saya',
    });
  });
});
