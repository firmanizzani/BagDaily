import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AdminOrderDetailPage } from './AdminOrderDetailPage';

const mock = vi.hoisted(() => ({ useApi: vi.fn(), useAction: vi.fn() }));
vi.mock('@/hooks/api', () => mock);

describe('admin order detail', () => {
  beforeEach(() => {
    mock.useAction.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });
    mock.useApi.mockReturnValue({
      data: {
        data: {
          id: 'order-1',
          orderNumber: 'BD-ORDER-ONE',
          status: 'packed',
          paymentStatus: 'paid',
          deliveryMethod: 'shipping',
          createdAt: '2026-11-05T00:23:00Z',
          paidAt: '2026-11-05T00:25:00Z',
          subtotal: 200000,
          shippingCost: 15000,
          pointsRedeemed: 1000,
          total: 214000,
          paymentMethod: 'qris',
          customerName: 'Nadia',
          customerEmail: 'nadia@gmail.com',
          recipientName: 'Nadia',
          shippingAddress: 'Jl. Melati No. 1',
          courier: 'JNE',
          shippingZone: 'Jabodetabek',
          items: [
            {
              id: 'item-1',
              productNameSnapshot: 'Rhea Mini Pack',
              skuSnapshot: 'BD-RNS-004',
              quantity: 1,
              unitPrice: 200000,
              subtotal: 200000,
            },
          ],
          history: [
            {
              id: 'event-1',
              newStatus: 'awaiting_payment',
              createdAt: '2026-11-05T00:23:00Z',
            },
            {
              id: 'event-2',
              newStatus: 'awaiting_confirmation',
              createdAt: '2026-11-05T00:25:00Z',
            },
            { id: 'event-3', newStatus: 'packed', createdAt: '2026-11-05T00:38:00Z' },
          ],
        },
      },
    });
  });
  const render = () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <AdminOrderDetailPage />
      </MemoryRouter>,
    );
  it('shows products first, preserves the full timeline and summarizes payment once', () => {
    const html = render();
    expect(html.indexOf('Produk pesanan')).toBeLessThan(html.indexOf('Timeline pesanan'));
    expect(html).toContain('Rhea Mini Pack');
    expect(html).toContain('Pesanan dibuat');
    expect(html).toContain('Pembayaran berhasil');
    expect(html).toContain('00:38:00Z');
    expect(html.match(/class="payment-total"/g)).toHaveLength(1);
    expect(html.match(/Subtotal produk/g)).toHaveLength(1);
    expect(html.match(/Ongkos kirim/g)).toHaveLength(1);
    expect(html).toContain('Potongan poin');
    expect(html).toContain('214.000');
    expect(html).toContain('Salin nomor pesanan');
    expect(html).toContain('Kirim pesanan');
  });
  it('does not allow an unpaid order to advance', () => {
    const result = mock.useApi();
    result.data.data.paymentStatus = 'unpaid';
    expect(render()).not.toContain('Kirim pesanan');
  });
});
