import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, ShoppingBag, Percent, TrendingUp } from 'lucide-react';
import { useApi } from '@/hooks/api';
import type { ProfitRow } from '@/features/profit/types';
import { formatDate, formatRupiah } from '@/lib/utils';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { AdminMetric } from '@/components/admin/AdminMetric';
import { MetricChange } from '@/components/admin/MetricChange';
import { DataPagination } from '@/components/admin/DataPagination';

export function ProfitReport({ filters }: { filters: string }) {
  return <ProfitReportContent key={filters} filters={filters} />;
}
function ProfitReportContent({ filters }: { filters: string }) {
  const [page, setPage] = useState(1);
  const query = useApi<ProfitRow[]>(`/admin/reports/profit?${filters}&page=${page}&limit=10`);
  if (query.isLoading) return <LoadingState label="Menghitung keuntungan penjualan…" />;
  if (query.isError) return <ErrorState message="Laporan keuntungan belum dapat dimuat." onRetry={() => void query.refetch()} />;
  const summary = query.data?.profitSummary;
  if (!summary) return null;

  return <div className="profit-report">
    <div className="admin-metrics-grid profit-metrics">
      <AdminMetric label="Total Penjualan" value={formatRupiah(summary.netSales)} icon={Banknote}
        change={<MetricChange current={summary.netSales} comparison={summary.comparison} metric="completedSales" />} />
      <AdminMetric label="Keuntungan" value={summary.profit === null ? 'Belum lengkap' : formatRupiah(summary.profit)} icon={TrendingUp}
        change={<MetricChange current={summary.profit} comparison={summary.comparison} metric="profit" />} />
      <AdminMetric label="Unit Terjual" value={summary.units} icon={ShoppingBag} tone="orange"
        change={<MetricChange current={summary.units} comparison={summary.comparison} metric="completedUnits" />} />
      <AdminMetric label="Margin Keuntungan" value={summary.marginPercent === null ? '—' : `${summary.marginPercent.toLocaleString('id-ID')}%`} icon={Percent} tone="amber" />
    </div>
    <details className="profit-calculation">
      <summary>Rincian perhitungan keuntungan</summary>
      <div className="profit-calculation-body">
        <dl>
          <div><dt>Pembayaran pembeli</dt><dd>{formatRupiah(summary.totalPaid)}</dd></div>
          <div><dt>Ongkos kirim</dt><dd>−{formatRupiah(summary.shipping)}</dd></div>
          <div><dt>Modal {summary.missingCostUnits > 0 ? 'tercatat' : 'barang terjual'}</dt><dd>−{formatRupiah(summary.cost)}</dd></div>
          <div><dt>Keuntungan penjualan</dt><dd>{summary.profit === null ? 'Belum lengkap' : formatRupiah(summary.profit)}</dd></div>
        </dl>
        <p>Penjualan produk tidak termasuk ongkir. Potongan poin {formatRupiah(summary.pointsDiscount)} sudah tercakup dalam pembayaran dan tidak dikurangi lagi.</p>
        <p>Modal tersimpan pada transaksi; perubahan modal produk berlaku untuk transaksi baru.</p>
        {summary.estimatedCostUnits > 0 && <p><strong>Modal estimasi:</strong> {summary.estimatedCostUnits.toLocaleString('id-ID')} unit menggunakan estimasi harga modal.</p>}
      </div>
    </details>
    {(summary.missingCostUnits > 0 || summary.pendingTransactions > 0) && <aside className="profit-data-note" aria-label="Keterangan data keuntungan">
      {summary.missingCostUnits > 0 && <p><strong>Modal belum lengkap.</strong> {summary.missingCostUnits.toLocaleString('id-ID')} unit belum memiliki modal. Keuntungan akan tampil setelah data dilengkapi.</p>}
      {summary.pendingTransactions > 0 && <p>{summary.pendingTransactions} transaksi berbayar belum selesai dan belum dihitung sebagai keuntungan.</p>}
    </aside>}
    <section className="admin-panel profit-transactions">
      <header className="admin-panel-heading"><h2>Keuntungan per Transaksi</h2><span>Pembayaran − ongkir − modal</span></header>
      {!query.data?.data.length ? <EmptyState title="Belum ada transaksi selesai" description="Pesanan online dihitung setelah diterima dan selesai; POS setelah transaksi kasir selesai." /> :
        <div className="admin-table-scroll"><table className="admin-table">
          <thead><tr><th>Pesanan / kanal</th><th>Tanggal dibayar</th><th className="numeric">Pembayaran</th><th className="numeric">Ongkir</th><th className="numeric">Modal</th><th className="numeric">Keuntungan</th></tr></thead>
          <tbody>{query.data.data.map(row => <tr key={row.id}>
            <td><Link className="admin-order-number" title={row.orderNumber} to={row.channel === 'pos' ? `/cashier/receipt/${row.id}` : `/admin/orders/${row.id}`}>{row.orderNumber}</Link><small>{row.channel === 'pos' ? 'Toko / POS' : 'Online'}{row.estimated > 0 ? ' · Modal estimasi' : ''}</small></td>
            <td className="nowrap">{formatDate(row.paidAt)}</td>
            <td className="numeric">{formatRupiah(row.totalPaid)}{row.pointsDiscount > 0 && <small>Potongan poin {formatRupiah(row.pointsDiscount)}</small>}</td>
            <td className="numeric">{formatRupiah(row.shipping)}</td>
            <td className="numeric">{row.missing > 0 ? 'Belum lengkap' : formatRupiah(row.cost)}</td>
            <td className="numeric profit-cell">{row.profit === null ? '—' : formatRupiah(row.profit)}<small>{row.marginPercent === null ? 'Margin —' : `Margin ${row.marginPercent.toLocaleString('id-ID')}%`}</small></td>
          </tr>)}</tbody>
        </table></div>}
      {(query.data?.pagination?.totalPages ?? 0) > 1 && <DataPagination pagination={query.data?.pagination} noun="transaksi" disabled={query.isFetching} onPage={setPage} />}
    </section>
  </div>;
}
