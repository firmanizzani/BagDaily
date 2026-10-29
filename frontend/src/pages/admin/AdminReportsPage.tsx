import { SummaryMetric } from '@/components/shared/SummaryMetric';
import { useState } from 'react';
import { Download, Banknote, ReceiptText, ShoppingBag, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/api';
import type { Order } from '@/types/api';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';

export function AdminReportsPage() {
  const [channel, setChannel] = useState<'all' | 'online' | 'pos'>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const queryParams = new URLSearchParams({
    ...(channel !== 'all' ? { channel } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const {
    data: reportData,
    isLoading,
    isError,
    refetch,
  } = useApi<Order[]>(`/admin/reports/sales?${queryParams.toString()}`);

  const handleExportCsv = () => {
    const exportParams = new URLSearchParams({
      ...(channel !== 'all' ? { channel } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });

    const exportUrl = `${import.meta.env['VITE_API_URL'] || '/api'}/admin/reports/sales/export?${exportParams.toString()}`;
    window.open(exportUrl, '_blank');
    toast.info('Mengunduh file laporan CSV…');
  };

  const report =
    reportData?.summary && reportData.products
      ? { summary: reportData.summary, products: reportData.products }
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#001524]">Laporan Penjualan</h1>
          <p className="text-xs text-[#6E7E8D]">
            Rekap transaksi berbayar dan rincian produk terjual lintas kanal online & POS.
          </p>
        </div>
        <Button size="sm" variant="default" onClick={handleExportCsv}>
          <Download size={14} /> Unduh CSV
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={channel}
          onChange={e => setChannel(e.target.value as 'all' | 'online' | 'pos')}
          className="rounded-md border border-[#6E7E8D]/30 px-3 py-1.5 text-xs bg-white text-[#001524]"
        >
          <option value="all">Semua Kanal</option>
          <option value="online">Online Saja</option>
          <option value="pos">POS / Kasir Saja</option>
        </select>

        <div className="flex items-center gap-1.5 text-xs text-[#6E7E8D]">
          <span>Dari:</span>
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="rounded-md border border-[#6E7E8D]/30 px-2.5 py-1 text-xs bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[#6E7E8D]">
          <span>Sampai:</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="rounded-md border border-[#6E7E8D]/30 px-2.5 py-1 text-xs bg-white"
          />
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => void refetch()}
        >
          Filter
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Menghitung laporan penjualan…" />
      ) : isError ? (
        <ErrorState message="Gagal memuat laporan penjualan." onRetry={refetch} />
      ) : !report ? (
        <EmptyState title="Tidak Ada Data" description="Pilih rentang tanggal lain." />
      ) : (
        <div className="space-y-6">
          <div className="metrics-grid summary-metric-grid">
            <SummaryMetric
              title="Total Pendapatan"
              value={formatRupiah(report.summary.totalSales)}
              icon={Banknote}
              note="Seluruh transaksi berbayar"
            />
            <SummaryMetric
              title="Jumlah Transaksi"
              value={report.summary.totalTransactions}
              icon={ReceiptText}
              note="Pesanan sesuai filter"
            />
            <SummaryMetric
              title="Penjualan Online"
              value={formatRupiah(report.summary.onlineSales)}
              icon={ShoppingBag}
              tone="sand"
              note="Dari toko online"
            />
            <SummaryMetric
              title="Penjualan Kasir POS"
              value={formatRupiah(report.summary.posSales)}
              icon={Store}
              tone="sand"
              note="Dari transaksi di toko"
            />
          </div>

          <div className="rounded-xl border border-[#001524]/10 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[#001524]">
              Rincian Penjualan per Produk
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#001524]/10 bg-[#FAF9F6] text-[#001524] font-bold">
                  <tr>
                    <th className="p-3">Nama Produk</th>
                    <th className="p-3">Kuantitas Terjual</th>
                    <th className="p-3 text-right">Total Nilai Penjualan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#001524]/5">
                  {report.products.map(p => (
                    <tr key={p.productId} className="hover:bg-[#FAF9F6]/50 transition">
                      <td className="p-3 font-semibold text-[#001524]">{p.name}</td>
                      <td className="p-3 font-bold text-[#15616D]">{p.quantity} unit</td>
                      <td className="p-3 text-right font-extrabold text-[#001524]">
                        {formatRupiah(p.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
