import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChartNoAxesCombined,
  ClipboardList,
  PackageSearch,
  ShoppingBag,
} from 'lucide-react';
import { useApi } from '@/hooks/api';
import type { DashboardOverview, Order } from '@/types/api';
import { formatRupiah } from '@/lib/utils';
import { recentDateRange, dateRangeParams } from '@/lib/dateRange';
import { AdminMetric } from '@/components/admin/AdminMetric';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { OrderTable } from '@/components/admin/OrderTable';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

export function AdminDashboardPage() {
  const [range, setRange] = useState(() => recentDateRange());
  const params = dateRangeParams(range);
  const overview = useApi<DashboardOverview>(`/admin/dashboard/overview?${params}`);
  const orders = useApi<Order[]>(`/admin/orders?limit=5&${params}`);
  const metrics = overview.data?.data;
  return (
    <div className="admin-page admin-dashboard">
      <header className="admin-page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Selamat datang kembali. Berikut ringkasan aktivitas toko Anda.</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </header>
      {overview.isLoading ? (
        <LoadingState label="Memuat ringkasan toko…" />
      ) : overview.isError ? (
        <ErrorState
          message="Ringkasan toko belum dapat dimuat."
          onRetry={() => void overview.refetch()}
        />
      ) : (
        <div className="admin-metrics-grid">
          <AdminMetric
            label="Total Penjualan"
            value={formatRupiah(metrics?.totalSales ?? 0)}
            note="Dari transaksi yang sudah dibayar"
            icon={ChartNoAxesCombined}
          />
          <AdminMetric
            label="Total Pesanan"
            value={metrics?.totalTransactions ?? 0}
            note="Pesanan berbayar online & POS"
            icon={ClipboardList}
            tone="blue"
          />
          <AdminMetric
            label="Produk Terjual"
            value={metrics?.totalProductsSold ?? 0}
            note="Unit terjual pada periode ini"
            icon={ShoppingBag}
            tone="orange"
          />
          <AdminMetric
            label="Stok Barang Menipis"
            value={metrics?.lowStockProducts ?? 0}
            note="Lihat stok saat ini"
            icon={PackageSearch}
            tone="amber"
            to="/admin/inventory?tab=lowStock"
          />
        </div>
      )}
      <section className="admin-panel">
        <header className="admin-panel-heading">
          <h2>Pesanan Terbaru</h2>
          <Link to="/admin/orders">
            Lihat semua <ArrowRight size={15} />
          </Link>
        </header>
        {orders.isLoading ? (
          <LoadingState label="Memuat pesanan…" />
        ) : orders.isError ? (
          <ErrorState
            message="Pesanan terbaru belum dapat dimuat."
            onRetry={() => void orders.refetch()}
          />
        ) : !orders.data?.data.length ? (
          <EmptyState
            title="Belum ada pesanan pada periode ini"
            description="Pesanan online yang masuk akan tampil di sini. Anda juga dapat memilih periode lain."
          />
        ) : (
          <OrderTable orders={orders.data.data.slice(0, 5)} showProduct />
        )}
      </section>
    </div>
  );
}
