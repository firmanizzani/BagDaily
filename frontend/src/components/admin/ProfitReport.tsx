import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@/hooks/api';
import type { ProfitRow } from '@/features/profit/types';
import { formatDate, formatRupiah } from '@/lib/utils';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { DataPagination } from '@/components/admin/DataPagination';

export function ProfitReport({filters}:{filters:string}) {
 return <ProfitReportContent key={filters} filters={filters} />;
}
function ProfitReportContent({filters}:{filters:string}) {
 const [page,setPage]=useState(1);
 const query=useApi<ProfitRow[]>(`/admin/reports/profit?${filters}&page=${page}&limit=10`);
 if(query.isLoading)return <LoadingState label="Menghitung keuntungan penjualan…" />;
 if(query.isError)return <ErrorState message="Laporan keuntungan belum dapat dimuat." onRetry={()=>void query.refetch()} />;
 const summary=query.data?.profitSummary;
 if(!summary)return null;
 return <div className="profit-report">
  <section className="admin-panel profit-overview" aria-labelledby="profit-heading">
   <header className="admin-panel-heading"><div><h2 id="profit-heading">Keuntungan Penjualan</h2><p>Transaksi selesai, dikelompokkan berdasarkan tanggal pembayaran.</p></div><span>{summary.transactions.toLocaleString('id-ID')} transaksi selesai</span></header>
   <div className="profit-equation"><div><span>Pembayaran pembeli</span><strong>{formatRupiah(summary.totalPaid)}</strong></div><span aria-hidden="true">−</span><div><span>Ongkos kirim</span><strong>{formatRupiah(summary.shipping)}</strong></div><span aria-hidden="true">−</span><div><span>Modal barang terjual</span><strong>{formatRupiah(summary.cost)}</strong></div><span aria-hidden="true">=</span><div className="profit-result"><span>Keuntungan penjualan</span><strong>{summary.profit===null?'Belum lengkap':formatRupiah(summary.profit)}</strong></div></div>
   <div className="profit-context"><p>Potongan poin <strong>{formatRupiah(summary.pointsDiscount)}</strong> sudah termasuk dalam pembayaran pembeli, sehingga tidak dikurangi lagi.</p><p>Margin <strong>{summary.marginPercent===null?'—':`${summary.marginPercent.toLocaleString('id-ID')}%`}</strong> dari penjualan tanpa ongkir.</p></div>
  </section>
  {(summary.estimatedCostUnits>0 || summary.missingCostUnits>0 || summary.pendingTransactions>0) && <aside className="profit-data-note" aria-label="Keterangan data keuntungan">{summary.estimatedCostUnits>0 && <p><strong>Modal estimasi dummy.</strong> {summary.estimatedCostUnits.toLocaleString('id-ID')} unit memakai modal contoh untuk pengujian. Angka ini bukan biaya pembelian sebenarnya.</p>}{summary.missingCostUnits>0 && <p><strong>Modal belum lengkap:</strong> {summary.missingCostUnits.toLocaleString('id-ID')} unit belum memiliki modal. Total keuntungan tidak ditampilkan sampai datanya dilengkapi.</p>}{summary.pendingTransactions>0 && <p>{summary.pendingTransactions} transaksi berbayar belum selesai dan belum dihitung sebagai keuntungan.</p>}</aside>}
  <section className="admin-panel"><header className="admin-panel-heading"><div><h2>Keuntungan per Transaksi</h2><p>Modal disimpan saat transaksi dan tidak mengikuti perubahan modal produk berikutnya.</p></div></header>
   {!query.data?.data.length?<EmptyState title="Belum ada transaksi selesai" description="Pesanan online dihitung setelah diterima dan selesai; POS setelah transaksi kasir selesai." />:<div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Pesanan / kanal</th><th>Tanggal dibayar</th><th className="numeric">Pembayaran</th><th className="numeric">Ongkir</th><th className="numeric">Modal</th><th className="numeric">Keuntungan</th></tr></thead><tbody>{query.data.data.map(row=><tr key={row.id}><td><Link className="admin-order-number" title={row.orderNumber} to={row.channel==='pos'?`/cashier/receipt/${row.id}`:`/admin/orders/${row.id}`}>{row.orderNumber}</Link><small>{row.channel==='pos'?'Toko / POS':'Online'}{row.estimated>0?' · Modal estimasi':''}</small></td><td className="nowrap">{formatDate(row.paidAt)}</td><td className="numeric">{formatRupiah(row.totalPaid)}{row.pointsDiscount>0 && <small>Sudah dipotong {formatRupiah(row.pointsDiscount)} poin</small>}</td><td className="numeric">{formatRupiah(row.shipping)}</td><td className="numeric">{row.missing>0?'Belum lengkap':formatRupiah(row.cost)}</td><td className="numeric profit-cell">{row.profit===null?'—':formatRupiah(row.profit)}<small>{row.marginPercent===null?'Margin —':`Margin ${row.marginPercent.toLocaleString('id-ID')}%`}</small></td></tr>)}</tbody></table></div>}
   {(query.data?.pagination?.totalPages??0)>1 && <DataPagination pagination={query.data?.pagination} noun="transaksi" disabled={query.isFetching} onPage={setPage} />}
  </section>
 </div>;
}
