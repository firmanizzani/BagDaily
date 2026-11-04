import { MetricChange } from '@/components/admin/MetricChange';
import { TrendingUp } from 'lucide-react';
import { AdminMetric } from '@/components/admin/AdminMetric';
import { useApi } from '@/hooks/api';
import type { ProfitRow } from '@/features/profit/types';
import { dateRangeParams, type DateRange } from '@/lib/dateRange';
import { formatRupiah } from '@/lib/utils';


export function DashboardProfitMetric({range}:{range:DateRange}) {
 const query=useApi<ProfitRow[]>(`/admin/reports/profit?${dateRangeParams(range)}&limit=1`);
 const summary=query.data?.profitSummary;
 return <AdminMetric label="Keuntungan" icon={TrendingUp}
  change={!query.isLoading && !query.isError && summary ? <MetricChange current={summary.profit} comparison={summary.comparison} metric="profit" /> : undefined}
  value={query.isLoading ? 'Menghitung…' : query.isError || !summary ? '—' : summary.profit===null ? 'Belum lengkap' : formatRupiah(summary.profit)}
  note={query.isError ? 'Keuntungan belum dapat dimuat' : undefined}
 />;
}
