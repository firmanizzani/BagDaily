import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Banknote, Download, ReceiptText, ShoppingBag, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/api';
import type { CategorySalesItem, Order, SalesTrendItem } from '@/types/api';
import { formatDate, formatRupiah, formatShortDate } from '@/lib/utils';
import { recentDateRange, dateRangeParams } from '@/lib/dateRange';
import { paymentMethodLabels } from '@/lib/payments';
import { downloadReport } from '@/services/apiClient';
import { AdminMetric } from '@/components/admin/AdminMetric';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { DataPagination } from '@/components/admin/DataPagination';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

const colors = ['#087362', '#7fbca3', '#d6b57c', '#6c92a1'];
export function AdminReportsPage() {
  const [range, setRange] = useState(() => recentDateRange());
  const [tab, setTab] = useState('Ringkasan');
  const [channel, setChannel] = useState('');
  const [page, setPage] = useState(1);
  const [interval, setInterval] = useState('day');
  const [exporting, setExporting] = useState(false);
  const filters = dateRangeParams(range);
  if (channel) filters.set('channel', channel);
  const query = useApi<Order[]>(`/admin/reports/sales?${filters}&page=${page}&limit=10`);
  const trend = useApi<SalesTrendItem[]>(
    `/admin/dashboard/sales-trend?${filters}&interval=${interval}`,
    tab === 'Ringkasan',
  );
  const categories = useApi<CategorySalesItem[]>(
    `/admin/dashboard/categories?${filters}`,
    tab === 'Ringkasan',
  );
  const summary = query.data?.summary;
  const products = query.data?.products || [];
  const customers = query.data?.customers || [];
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
      await downloadReport(filters);
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
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <h1>Laporan</h1>
          <p>Lihat statistik dan laporan toko secara lengkap.</p>
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
          {['Ringkasan', 'Penjualan', 'Produk', 'Pelanggan'].map(name => (
            <button
              type="button"
              key={name}
              className={name === tab ? 'active' : ''}
              aria-pressed={name === tab}
              onClick={() => setTab(name)}
            >
              {name}
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
      {query.isLoading ? (
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
              value={formatRupiah(summary?.totalSales || 0)}
              note="Transaksi berbayar pada periode ini"
              icon={Banknote}
            />
            <AdminMetric
              label="Total Pesanan"
              value={summary?.totalTransactions || 0}
              note="Transaksi yang sudah dibayar"
              icon={ReceiptText}
              tone="blue"
            />
            <AdminMetric
              label="Produk Terjual"
              value={units}
              note="Jumlah unit produk terjual"
              icon={ShoppingBag}
              tone="orange"
            />
            <AdminMetric
              label="Rata-rata Order"
              value={formatRupiah(
                summary?.totalTransactions
                  ? Math.round(summary.totalSales / summary.totalTransactions)
                  : 0,
              )}
              note="Total penjualan per transaksi"
              icon={TrendingUp}
              tone="amber"
            />
          </div>
          {tab === 'Ringkasan' && (
            <>
              <section className="admin-panel">
                <header className="admin-panel-heading">
                  <h2>Grafik Penjualan</h2>
                  <div className="admin-chart-key">
                    <span>
                      <i />
                      Penjualan
                    </span>
                    <span>
                      <i />
                      Pesanan
                    </span>
                    <select
                      aria-label="Interval laporan"
                      value={interval}
                      onChange={event => setInterval(event.target.value)}
                    >
                      <option value="day">Harian</option>
                      <option value="week">Mingguan</option>
                    </select>
                  </div>
                </header>
                {trend.isLoading ? (
                  <LoadingState label="Memuat grafik…" />
                ) : trend.isError ? (
                  <ErrorState onRetry={() => void trend.refetch()} />
                ) : !trend.data?.data.length ? (
                  <EmptyState
                    title="Belum ada penjualan pada periode ini"
                    description="Grafik akan tampil setelah ada transaksi yang dibayar."
                  />
                ) : (
                  <div className="admin-report-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={trend.data.data}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#e9eee8" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={value => formatShortDate(String(value), false)}
                          axisLine={false}
                          tickLine={false}
                          minTickGap={25}
                        />
                        <YAxis
                          yAxisId="sales"
                          tickFormatter={value => `${Number(value) / 1000}rb`}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                        />
                        <YAxis
                          yAxisId="orders"
                          orientation="right"
                          allowDecimals={false}
                          axisLine={false}
                          tickLine={false}
                          width={24}
                        />
                        <Tooltip
                          labelFormatter={value => formatShortDate(String(value))}
                          formatter={(value, name) =>
                            name === 'Penjualan'
                              ? formatRupiah(Number(value))
                              : `${value} pesanan`
                          }
                        />
                        <Bar
                          yAxisId="sales"
                          dataKey="revenue"
                          name="Penjualan"
                          fill="#138369"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={32}
                        />
                        <Line
                          yAxisId="orders"
                          dataKey="transactions"
                          name="Pesanan"
                          stroke="#82baa2"
                          strokeWidth={2}
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
              <div className="admin-report-bottom">
                <section className="admin-panel">
                  <header className="admin-panel-heading">
                    <h2>Penjualan per Kategori</h2>
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
                            <Tooltip />
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
                            <span>{category.name}</span>
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
                    <h2>Penjualan Produk</h2>
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
                            <p>{product.quantity} unit terjual</p>
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
                <h2>Rincian Penjualan</h2>
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
                                ? 'Pembeli toko'
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
                <h2>Penjualan per Produk</h2>
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
                        <th className="numeric">Nilai penjualan</th>
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
                          <td className="numeric">{formatRupiah(product.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {tab === 'Pelanggan' && (
            <section className="admin-panel">
              <header className="admin-panel-heading">
                <h2>Belanja Pelanggan</h2>
                <span>Transaksi dengan akun pelanggan</span>
              </header>
              {!customers.length ? (
                <EmptyState
                  title="Belum ada transaksi pelanggan"
                  description="Transaksi POS tanpa akun tidak dimasukkan ke daftar ini."
                />
              ) : (
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Pelanggan</th>
                        <th>Email</th>
                        <th className="numeric">Pesanan dibayar</th>
                        <th className="numeric">Total belanja</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map(customer => (
                        <tr key={customer.customerId}>
                          <td>
                            <Link to={`/admin/customers/${customer.customerId}`}>
                              {customer.name}
                            </Link>
                          </td>
                          <td>{customer.email || '—'}</td>
                          <td className="numeric">{customer.transactions}</td>
                          <td className="numeric">{formatRupiah(customer.revenue)}</td>
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
