import { MetricChange } from '@/components/admin/MetricChange';
import { DashboardProfitMetric } from '@/components/admin/DashboardProfit';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Banknote,
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
        <div className="admin-metrics-grid dashboard-metrics-five">
          <AdminMetric
            label="Total Penjualan"
            value={formatRupiah(metrics?.netProductSales ?? 0)}

            change={<MetricChange current={metrics?.netProductSales ?? 0} comparison={metrics?.comparison} metric="netProductSales" />}
            icon={Banknote}
          />
          <DashboardProfitMetric range={range} />
          <AdminMetric
            label="Total Pesanan"
            value={metrics?.totalTransactions ?? 0}

            change={<MetricChange current={metrics?.totalTransactions ?? 0} comparison={metrics?.comparison} metric="totalTransactions" />}
            icon={ClipboardList}
            tone="blue"
          />
          <AdminMetric
            label="Unit Terjual"
            value={metrics?.totalProductsSold ?? 0}

            change={<MetricChange current={metrics?.totalProductsSold ?? 0} comparison={metrics?.comparison} metric="totalProductsSold" />}
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
          <h2>Pesanan Online Terbaru</h2>
          <Link to="/admin/orders">
            Lihat pesanan online <ArrowRight size={15} />
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
