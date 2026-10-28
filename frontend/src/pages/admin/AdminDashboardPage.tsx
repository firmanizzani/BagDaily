import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowRight, CalendarDays, PackageCheck } from 'lucide-react';
import { useApi } from '@/hooks/api';
import type {
  CategorySalesItem,
  ChannelSalesItem,
  DashboardOverview,
  Order,
  RestockRecommendation,
  SalesTrendItem,
  TopProductItem,
} from '@/types/api';
import { formatRupiah, formatDate } from '@/lib/utils';
import { statusLabels, statusClass } from '@/lib/orders';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { ErrorState, LoadingState } from '@/components/shared/states';
const COLORS = ['#006052', '#38a27e', '#8fd1ae'];
export function AdminDashboardPage() {
  const [interval, setInterval] = useState<'day' | 'week'>('day');
  const overview = useApi<DashboardOverview>('/admin/dashboard/overview');
  const trend = useApi<SalesTrendItem[]>(
    `/admin/dashboard/sales-trend?interval=${interval}`,
  );
  const categories = useApi<CategorySalesItem[]>('/admin/dashboard/categories');
  const top = useApi<TopProductItem[]>('/admin/dashboard/top-products');
  const channels = useApi<ChannelSalesItem[]>('/admin/dashboard/channels');
  const recommendations = useApi<RestockRecommendation[]>(
    '/admin/dashboard/restock-recommendations',
  );
  const orders = useApi<Order[]>('/cashier/orders?limit=5');
  const metrics = overview.data?.data;
  const categoryRows = categories.data?.data || [];
  const topRows = top.data?.data || [];
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Ringkasan performa toko Anda. Semua kanal, satu tempat.</p>
        </div>
        <span className="badge flex items-center gap-2">
          <CalendarDays size={14} />
          30 hari terakhir
        </span>
      </div>
      {overview.isLoading ? (
        <LoadingState />
      ) : overview.isError ? (
        <ErrorState
          message="Ringkasan belum dapat dimuat."
          onRetry={() => void overview.refetch()}
        />
      ) : (
        <div className="metrics-grid">
          {[
            {
              title: 'Total penjualan',
              value: formatRupiah(metrics?.totalSales || 0),
              note: 'Dari seluruh pesanan berbayar',
            },
            {
              title: 'Total pesanan',
              value: metrics?.totalTransactions ?? 0,
              note: 'Transaksi online & kasir',
            },
            {
              title: 'Produk aktif',
              value: metrics?.activeProducts ?? 0,
              note: 'Koleksi yang siap dipasarkan',
            },
            {
              title: 'Stok menipis',
              value: metrics?.lowStockProducts ?? 0,
              note: 'Pantau dan jadwalkan restock',
            },
          ].map((m, i) => (
            <article className={`metric-card ${i === 3 ? 'warning' : ''}`} key={m.title}>
              <span>{m.title}</span>
              <strong>{m.value}</strong>
              <small>{m.note}</small>
            </article>
          ))}
        </div>
      )}
      <div className="dashboard-layout">
        <section className="panel dashboard-trend">
          <div className="panel-title">
            <h2>Grafik penjualan</h2>
            <select
              aria-label="Interval grafik"
              value={interval}
              onChange={e => setInterval(e.target.value as 'day' | 'week')}
            >
              <option value="day">Harian</option>
              <option value="week">Mingguan</option>
            </select>
          </div>
          <p className="muted">Pendapatan dari pesanan yang telah dibayar.</p>
          {trend.isLoading ? (
            <LoadingState />
          ) : trend.isError ? (
            <ErrorState onRetry={() => void trend.refetch()} />
          ) : !trend.data?.data.length ? (
            <div className="chart-empty">
              <BarChartIcon />
              <p>Grafik dimulai dari penjualan pertamamu.</p>
              <Link to="/pos">
                Buka kasir <ArrowRight size={13} />
              </Link>
            </div>
          ) : (
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trend.data.data}
                  margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid vertical={false} stroke="#edf0e8" />
                  <XAxis
                    dataKey="date"
                    interval={Math.max(0, Math.ceil(trend.data.data.length / 5) - 1)}
                    tickFormatter={v =>
                      new Intl.DateTimeFormat('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      }).format(new Date(v))
                    }
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    interval={0}
                    tickFormatter={v => `${Number(v) / 1000}rb`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={v => formatRupiah(Number(v))} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Penjualan"
                    fill="#d4e9d9"
                    stroke="#007465"
                    strokeWidth={2.5}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="panel dashboard-category">
          <div className="panel-title">
            <h2>Penjualan per kategori</h2>
          </div>
          {categories.isLoading ? (
            <LoadingState />
          ) : categories.isError ? (
            <ErrorState onRetry={() => void categories.refetch()} />
          ) : !categoryRows.length ? (
            <div className="chart-empty">
              <PackageCheck size={36} strokeWidth={1} />
              <p>Belum ada penjualan kategori.</p>
            </div>
          ) : (
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryRows}
                    dataKey="quantity"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={85}
                    stroke="none"
                  >
                    {categoryRows.map((row, i) => (
                      <Cell key={row.categoryId} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="panel dashboard-orders">
          <div className="panel-title">
            <h2>Pesanan terbaru</h2>
            <Link to="/cashier/orders">
              Lihat semua <ArrowRight size={12} className="inline" />
            </Link>
          </div>
          {orders.isLoading ? (
            <LoadingState />
          ) : orders.isError ? (
            <ErrorState onRetry={() => void orders.refetch()} />
          ) : !orders.data?.data.length ? (
            <p className="muted py-12 text-center">Pesanan baru akan muncul di sini.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No. pesanan</th>
                    <th>Tanggal</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data.data.slice(0, 5).map(o => (
                    <tr key={o.id}>
                      <td>
                        <Link className="font-semibold" to={`/cashier/orders/${o.id}`}>
                          {o.orderNumber}
                        </Link>
                      </td>
                      <td>{formatDate(o.createdAt)}</td>
                      <td>{formatRupiah(o.total)}</td>
                      <td>
                        <span className={statusClass(o.status)}>
                          {statusLabels[o.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel dashboard-bestsellers">
          <div className="panel-title">
            <h2>Produk terlaris</h2>
            <Link to="/admin/reports">Lihat laporan</Link>
          </div>
          {top.isLoading ? (
            <LoadingState />
          ) : top.isError ? (
            <ErrorState onRetry={() => void top.refetch()} />
          ) : !topRows.length ? (
            <p className="muted py-12 text-center">
              Favorit pelanggan segera terlihat di sini.
            </p>
          ) : (
            topRows.slice(0, 4).map(p => (
              <div className="bestseller-row" key={p.productId}>
                <ProductPhoto name={p.name} />
                <div>
                  <strong>{p.name}</strong>
                  <p>{p.quantity} produk terjual</p>
                </div>
                <span>{formatRupiah(p.revenue)}</span>
              </div>
            ))
          )}
        </section>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="panel">
          <div className="panel-title">
            <h2>Online & toko fisik</h2>
            <Link to="/admin/reports">Detail laporan</Link>
          </div>
          {channels.isError ? (
            <ErrorState onRetry={() => void channels.refetch()} />
          ) : (
            <div className="chart-area">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channels.data?.data || []} margin={{ left: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="channel"
                    interval={0}
                    tickFormatter={v => (v === 'pos' ? 'Kasir' : 'Online')}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    interval={0}
                    tickFormatter={v => `${Number(v) / 1000}rb`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip formatter={v => formatRupiah(Number(v))} />
                  <Bar
                    dataKey="revenue"
                    name="Penjualan"
                    fill="#16866c"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={70}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel-title">
            <h2>Waktunya restock?</h2>
            <Link to="/admin/inventory">
              Kelola stok <ArrowRight size={12} className="inline" />
            </Link>
          </div>
          <p className="muted">Saran berdasarkan penjualan 7 hari terakhir.</p>
          {recommendations.isError ? (
            <ErrorState onRetry={() => void recommendations.refetch()} />
          ) : !recommendations.data?.data.length ? (
            <div className="chart-empty">
              <PackageCheck size={35} strokeWidth={1} />
              <p>Belum ada rekomendasi restock.</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Stok</th>
                    <th>Saran restock</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.data.data.map(p => (
                    <tr key={p.productId}>
                      <td>{p.name}</td>
                      <td>{p.stock}</td>
                      <td className="font-bold">+{p.recommendedQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
function BarChartIcon() {
  return (
    <svg width="40" height="35" viewBox="0 0 40 35" aria-hidden="true">
      <path
        d="M7 30V18M20 30V6M33 30V12"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
