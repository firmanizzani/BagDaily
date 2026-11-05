import { MetricChange } from '@/components/admin/MetricChange';
import { ProfitReport } from '@/components/admin/ProfitReport';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Banknote, Download, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/api';
import type { CategorySalesItem, Order } from '@/types/api';
import { formatDate, formatRupiah } from '@/lib/utils';
import { recentDateRange, dateRangeParams } from '@/lib/dateRange';
import { paymentMethodLabels } from '@/lib/payments';
import { downloadReport } from '@/services/apiClient';
import { AdminMetric } from '@/components/admin/AdminMetric';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { DataPagination } from '@/components/admin/DataPagination';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

import { ReportTrendCharts } from '@/components/admin/ReportTrendCharts';

const colors = ['#087362', '#7fbca3', '#d6b57c', '#6c92a1'];
export function AdminReportsPage() {
  const [url] = useSearchParams();
  const [range, setRange] = useState(() => url.has('start') && url.has('end') && [url.get('start'), url.get('end')].every(value => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) ? { from: url.get('start')!, to: url.get('end')! } : recentDateRange());
  const [tab, setTab] = useState(url.get('tab') === 'profit' ? 'Keuntungan' : 'Ringkasan');
  const [channel, setChannel] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const filters = dateRangeParams(range);
  if (channel) filters.set('channel', channel);
  const query = useApi<Order[]>(`/admin/reports/sales?${filters}&page=${page}&limit=10`);
  const categories = useApi<CategorySalesItem[]>(
    `/admin/dashboard/categories?${filters}`,
    tab === 'Ringkasan',
  );
  const summary = query.data?.summary;
  const products = query.data?.products || [];
  const units =
    summary?.totalProductsSold ??
    products.reduce((total, product) => total + product.quantity, 0);
  const categoryUnits = (categories.data?.data || []).reduce(
    (total, category) => total + category.quantity,
    0,
  );
  const exportCsv = async () => {
    setExporting(true);
    try {
      await downloadReport(filters, tab === 'Keuntungan' ? 'profit' : 'sales');
      toast.success('Laporan berhasil diunduh.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Laporan belum dapat diunduh.',
      );
    } finally {
      setExporting(false);
    }
  };
  return (
    <div className="admin-page admin-reports-page">
      <header className="admin-page-heading">
        <div>
          <h1>Laporan</h1>
          <p>Pantau barang yang laku, tren kategori, dan nilai transaksi toko.</p>
        </div>
        <div className="admin-heading-actions">
          <DateRangeFilter
            value={range}
            onChange={value => {
              setRange(value);
              setPage(1);
            }}
          />
          <button
            className="admin-secondary-button"
            type="button"
            disabled={exporting}
            onClick={() => void exportCsv()}
          >
            <Download size={15} />
            {exporting ? 'Mengunduh…' : 'Unduh CSV'}
          </button>
        </div>
      </header>
      <div className="admin-report-navigation">
        <nav className="admin-status-tabs" aria-label="Jenis laporan">
          {['Ringkasan', 'Penjualan', 'Keuntungan', 'Produk'].map(name => (
            <button
              type="button"
              key={name}
              className={name === tab ? 'active' : ''}
              aria-pressed={name === tab}
              onClick={() => { setTab(name); setPage(1); }}
            >
              {name === 'Penjualan' ? 'Transaksi & pembayaran' : name}
            </button>
          ))}
        </nav>
        <select
          aria-label="Kanal laporan"
          value={channel}
          onChange={event => {
            setChannel(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua kanal</option>
          <option value="online">Online</option>
          <option value="pos">Toko / POS</option>
        </select>
      </div>
      {tab === 'Keuntungan' ? <ProfitReport filters={filters.toString()} /> : query.isLoading ? (
        <LoadingState label="Menghitung laporan…" />
      ) : query.isError ? (
        <ErrorState
          message="Laporan belum dapat dimuat."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <div className="admin-metrics-grid">
            <AdminMetric
              label="Total Penjualan"
              value={formatRupiah(summary?.netProductSales || 0)}

              change={<MetricChange current={summary?.netProductSales ?? 0} comparison={summary?.comparison} metric="netProductSales" />}
              icon={Banknote}
            />
            <AdminMetric
              label="Pesanan Dibayar"
              value={summary?.totalTransactions || 0}

              change={<MetricChange current={summary?.totalTransactions ?? 0} comparison={summary?.comparison} metric="totalTransactions" />}
              icon={ReceiptText}
              tone="blue"
            />
            <AdminMetric
              label="Unit Terjual"
              value={units}

              change={<MetricChange current={units} comparison={summary?.comparison} metric="totalProductsSold" />}
              icon={ShoppingBag}
              tone="orange"
            />
            <AdminMetric
              label="Rata-rata Pembayaran"
              value={formatRupiah(
                summary?.totalTransactions
                  ? Math.round(summary.totalSales / summary.totalTransactions)
                  : 0,
              )}

              change={<MetricChange current={summary?.totalTransactions ? Math.round(summary.totalSales / summary.totalTransactions) : 0} comparison={summary?.comparison} metric="averagePayment" />}
              icon={TrendingUp}
              tone="amber"
            />
          </div>
          {summary && tab === 'Penjualan' && <details className="report-payment-breakdown"><summary><span>Rincian perhitungan pembayaran</span><span>Nilai barang, ongkir & poin</span></summary><dl><div><dt>Nilai barang</dt><dd>{formatRupiah(summary.merchandiseTotal ?? 0)}</dd></div><div><dt>Ongkos kirim</dt><dd>{formatRupiah(summary.shippingTotal ?? 0)}</dd></div><div><dt>Potongan poin</dt><dd>{formatRupiah(summary.pointsDiscount ?? 0)}</dd></div><div><dt>Total pembayaran</dt><dd>{formatRupiah(summary.totalSales)}</dd></div></dl><p>Nilai barang + ongkir − potongan poin = total pembayaran. Belum merupakan laba toko.</p></details>}
          {tab === 'Ringkasan' && (
            <>
              <ReportTrendCharts filters={filters.toString()} range={range} />
              <div className="admin-report-bottom">
                <section className="admin-panel report-composition-panel">
                  <header className="admin-panel-heading">
                    <div><h2>Komposisi Produk Terjual</h2><p>Kontribusi kategori berdasarkan jumlah unit.</p></div>
                  </header>
                  {categories.isLoading ? (
                    <LoadingState />
                  ) : categories.isError ? (
                    <ErrorState onRetry={() => void categories.refetch()} />
                  ) : !categoryUnits ? (
                    <EmptyState
                      title="Belum ada penjualan kategori"
                      description="Pilih periode lain untuk melihat kontribusi kategori."
                    />
                  ) : (
                    <div className="admin-category-report">
                      <div className="admin-category-donut">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={categories.data?.data || []}
                              dataKey="quantity"
                              nameKey="name"
                              innerRadius="62%"
                              outerRadius="88%"
                              stroke="none"
                            >
                              {categories.data?.data.map((category, index) => (
                                <Cell
                                  key={category.categoryId}
                                  fill={colors[index % colors.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={value => `${Number(value).toLocaleString('id-ID')} unit`} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div>
                          <strong>{categoryUnits.toLocaleString('id-ID')}</strong>
                          <span>unit terjual</span>
                        </div>
                      </div>
                      <ul>
                        {categories.data?.data.map((category, index) => (
                          <li key={category.categoryId}>
                            <i style={{ background: colors[index % colors.length] }} />
                            <span>{category.name}<small>{category.quantity.toLocaleString('id-ID')} unit terjual</small></span>
                            <strong>
                              {Math.round((category.quantity / categoryUnits) * 100)}%
                            </strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
                <section className="admin-panel">
                  <header className="admin-panel-heading">
                    <div><h2>Produk Terlaris</h2><p>Diurutkan dari unit terjual terbanyak.</p></div>
                    <button type="button" onClick={() => setTab('Produk')}>
                      Lihat semua →
                    </button>
                  </header>
                  {!products.length ? (
                    <EmptyState
                      title="Belum ada produk terjual"
                      description="Produk terjual akan ditampilkan di sini."
                    />
                  ) : (
                    <div className="admin-report-products">
                      {products.slice(0, 5).map(product => (
                        <div key={product.productId}>
                          <ProductPhoto name={product.name} src={product.imageUrl} />
                          <div>
                            <strong>{product.name}</strong>
                            <p>{product.quantity} unit terjual · Stok saat ini {product.stock ?? '—'}</p>
                          </div>
                          <strong>{formatRupiah(product.revenue)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          {tab === 'Penjualan' && (
            <section className="admin-panel">
              <header className="admin-panel-heading">
                <div><h2>Transaksi & Pembayaran</h2><p>Rincian transaksi yang sudah dibayar pada periode ini.</p></div>
              </header>
              {!query.data?.data.length ? (
                <EmptyState
                  title="Belum ada transaksi"
                  description="Tidak ada transaksi berbayar yang sesuai filter."
                />
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>No. pesanan</th>
                        <th>Tanggal dibayar</th>
                        <th>Pelanggan / kanal</th>
                        <th>Pembayaran</th>
                        <th className="numeric">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.data.map(order => (
                        <tr key={order.id}>
                          <td>
                            <Link
                              className="admin-order-number"
                              to={
                                order.channel === 'pos'
                                  ? `/cashier/receipt/${order.id}`
                                  : `/admin/orders/${order.id}`
                              }
                              title={order.orderNumber}
                            >
                              {order.orderNumber}
                            </Link>
                          </td>
                          <td className="nowrap">
                            {formatDate(order.paidAt || order.createdAt)}
                          </td>
                          <td>
                            {order.customerName ||
                              (order.channel === 'pos'
                                ? 'Pelanggan umum'
                                : order.recipientName || 'Pelanggan')}
                            <small>
                              {order.channel === 'pos' ? 'Toko / POS' : 'Online'}
                            </small>
                          </td>
                          <td>
                            {order.paymentMethod
                              ? paymentMethodLabels[order.paymentMethod]
                              : '—'}
                          </td>
                          <td className="numeric">{formatRupiah(order.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <DataPagination
                pagination={query.data?.pagination}
                noun="transaksi"
                disabled={query.isFetching}
                onPage={setPage}
              />
            </section>
          )}
          {tab === 'Produk' && (
            <section className="admin-panel">
              <header className="admin-panel-heading">
                <div><h2>Penjualan per Produk</h2><p>Diurutkan berdasarkan unit terjual. Nilai barang sebelum potongan poin, tanpa ongkir.</p></div>
              </header>
              {!products.length ? (
                <EmptyState
                  title="Belum ada produk terjual"
                  description="Tidak ada penjualan yang sesuai periode dan kanal."
                />
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th className="numeric">Unit terjual</th>
                        <th className="numeric">Nilai barang</th><th className="numeric">Stok saat ini</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map(product => (
                        <tr key={product.productId}>
                          <td>
                            <div className="admin-product-identity">
                              <ProductPhoto name={product.name} src={product.imageUrl} />
                              <strong>{product.name}</strong>
                            </div>
                          </td>
                          <td className="numeric">
                            {product.quantity.toLocaleString('id-ID')}
                          </td>
                          <td className="numeric">{formatRupiah(product.revenue)}</td><td className="numeric">{product.stock ?? '—'}<small>{product.stock !== undefined && product.minimumStock !== undefined && product.stock <= product.minimumStock ? 'Perlu perhatian' : ''}</small></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
