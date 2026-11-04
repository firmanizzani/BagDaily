import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useApi } from '@/hooks/api';
import type { LoyaltyEntry, LoyaltySummary } from '@/features/loyalty/types';
import { formatDate, formatRupiah } from '@/lib/utils';
import { DataPagination } from '@/components/admin/DataPagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

const labels = { earn: 'Poin diperoleh', reserve: 'Poin ditahan', redeem: 'Poin digunakan', release: 'Penahanan poin dilepas' };
export function LoyaltyPage() {
  const [page, setPage] = useState(1);
  const summary = useApi<LoyaltySummary>('/loyalty/me');
  const history = useApi<LoyaltyEntry[]>(`/loyalty/me/history?page=${page}&limit=10`);
  const wallet = summary.data?.data;
  return <div className="loyalty-page">
    <header className="page-heading"><div><h1>Poin saya</h1><p className="muted">Belanja lagi, lebih hemat dengan poinmu.</p></div></header>
    {summary.isLoading ? <LoadingState label="Memuat poin member…" /> : summary.isError ? <ErrorState onRetry={() => void summary.refetch()} /> : <section className="loyalty-balance-panel">
      <div className="loyalty-wallet"><h2>Poin tersedia</h2><p className="loyalty-amount">{wallet?.available.toLocaleString('id-ID') ?? '0'} <span>poin</span></p><p>Bisa dipakai untuk potongan <strong>{formatRupiah(wallet?.available ?? 0)}</strong></p><Link to="/catalog" className="loyalty-shop-link">Belanja pakai poin <ArrowRight size={17} /></Link><small>Berlaku untuk belanja online dan di toko.</small></div>
      <div className="loyalty-status"><h2>Poin dalam proses</h2><dl><div><dt>Menunggu pesanan selesai</dt><dd>{(wallet?.pendingPoints ?? 0).toLocaleString('id-ID')} <span>poin</span></dd><p>Masuk setelah barang diterima dan pesanan selesai.</p></div><div><dt>Dipakai di pesanan belum dibayar</dt><dd>{(wallet?.reserved ?? 0).toLocaleString('id-ID')} <span>poin</span></dd><p>Kembali tersedia jika pesanan dibatalkan atau kedaluwarsa.</p></div></dl><Link to="/customer/orders">Lihat pesanan saya <ArrowRight size={15} /></Link></div>
    </section>}
    <details className="loyalty-guide"><summary>Cara mendapatkan dan menggunakan poin</summary><div><p>Setiap transaksi mendapat poin sebesar <strong>1% dari total akhir pembayaran</strong>. Setiap 1 poin bernilai Rp1 dan bisa digunakan saat checkout atau melalui kasir.</p><p>Poin online masuk setelah barang diterima dan pesanan selesai. Poin belanja di toko masuk saat transaksi selesai. Jika hasilnya desimal, pecahannya dibulatkan ke bawah.</p></div></details>
    <section className="loyalty-history"><header><h2>Riwayat poin</h2><span>{(history.data?.pagination?.total ?? 0).toLocaleString('id-ID')} aktivitas</span></header>
      {history.isLoading ? <LoadingState /> : history.isError ? <ErrorState onRetry={() => void history.refetch()} /> : !history.data?.data.length ? <EmptyState title="Poin pertamamu menunggu" description="Selesaikan pesanan online atau belanja di toko dengan akunmu. Aktivitas poin akan tampil di sini." /> : <ul>{history.data.data.map(entry => { const change = entry.balanceDelta - entry.reservedDelta; return <li key={entry.id} className={`loyalty-activity-${entry.kind}`}><div><strong>{labels[entry.kind]}</strong><Link to={`/orders/${entry.orderId}`} title={entry.orderNumber}>{entry.orderNumber.length > 24 ? `${entry.orderNumber.slice(0, 15)}…` : entry.orderNumber}<ArrowUpRight size={13} /></Link><small>{formatDate(entry.createdAt)}</small></div><div className="loyalty-entry-value"><strong>{change > 0 ? '+' : change < 0 ? '−' : ''}{Math.abs(change).toLocaleString('id-ID')} <span>poin</span></strong><small>Tersedia {(entry.balanceAfter - entry.reservedAfter).toLocaleString('id-ID')} poin</small></div></li>; })}</ul>}
      {(history.data?.pagination?.totalPages ?? 0) > 1 && <DataPagination pagination={history.data?.pagination} noun="aktivitas" disabled={history.isFetching} onPage={setPage} />}
    </section>
  </div>;
}
