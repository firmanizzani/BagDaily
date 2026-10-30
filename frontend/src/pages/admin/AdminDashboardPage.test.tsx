import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboardPage } from './AdminDashboardPage';
const mock = vi.hoisted(() => ({ useApi: vi.fn() }));
vi.mock('@/hooks/api', () => ({ useApi: mock.useApi }));
describe('admin dashboard requirements', () => {
  beforeEach(() => {
    mock.useApi.mockReset();
    mock.useApi.mockImplementation((path: string) =>
      path.includes('/overview')
        ? {
            data: {
              data: {
                totalSales: 450000,
                totalTransactions: 3,
                totalProductsSold: 5,
                lowStockProducts: 7,
              },
            },
          }
        : { data: { data: [] } },
    );
  });
  it('shows four metrics from API data and links low stock to inventory', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );
    expect(html.match(/class="admin-metric metric-/g) || []).toHaveLength(4);
    expect(html).toContain('Stok Barang Menipis');
    expect(html).toContain('<strong>7</strong>');
    expect(html).toContain('/admin/inventory?tab=lowStock');
    for (const label of [
      'Pelanggan Baru',
      'Pesan Masuk',
      'Ringkasan Penjualan',
      'Penjualan per Kategori',
    ])
      expect(html).not.toContain(label);
    expect(
      mock.useApi.mock.calls.every(
        ([path]) => path.includes('/overview') || path.includes('/admin/orders'),
      ),
    ).toBe(true);
  });
  it('does not replace an API failure with made-up metrics', () => {
    mock.useApi.mockReturnValue({ isError: true, refetch: vi.fn() });
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );
    expect(html).toContain('Ringkasan toko belum dapat dimuat');
    expect(html).not.toContain('admin-metric metric-');
  });
});
