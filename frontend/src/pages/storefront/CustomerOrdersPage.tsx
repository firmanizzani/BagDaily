import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Package, Search } from 'lucide-react';
import { useApi } from '@/hooks/api';
import type { Order } from '@/types/api';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate, formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function CustomerOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const params = new URLSearchParams({
    page: String(page),
    limit: '10',
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
  });

  const {
    data: ordersData,
    isLoading,
    isError,
    refetch,
  } = useApi<Order[]>(`/orders/my?${params.toString()}`);

  const orders = ordersData?.data || [];
  const pagination = ordersData?.pagination;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#001524]">Pesanan Saya</h1>
          <p className="text-xs text-[#6E7E8D]">
            Riwayat seluruh pembelian dan pelacakan status barang Anda di BagDaily.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-2.5 text-[#6E7E8D]" />
          <input
            type="text"
            placeholder="Cari nomor pesanan…"
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-[#6E7E8D]/30 pl-9 pr-3 py-1.5 text-xs bg-white"
          />
        </div>

        <select
          value={status}
          onChange={e => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[#6E7E8D]/30 px-3 py-1.5 text-xs bg-white text-[#001524]"
        >
          <option value="">Semua Status</option>
          <option value="awaiting_payment">Menunggu Pembayaran</option>
          <option value="awaiting_confirmation">Menunggu Konfirmasi</option>
          <option value="confirmed">Dikonfirmasi</option>
          <option value="packed">Dikemas</option>
          <option value="shipped">Dikirim</option>
          <option value="completed">Selesai</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat riwayat pesanan Anda…" />
      ) : isError ? (
        <ErrorState message="Gagal memuat daftar pesanan." onRetry={refetch} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="Belum Ada Pesanan"
          description="Anda belum melakukan pemesanan tas, atau filter status tidak cocok."
          action="Mulai Belanja"
          to="/catalog"
        />
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <Link
              key={order.id}
              to={`/orders/${order.id}`}
              className="block rounded-xl border border-[#001524]/10 bg-white p-4 transition hover:border-[#15616D] hover:shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#001524]/5 pb-3">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-[#15616D]" />
                  <span className="font-bold text-sm text-[#001524]">
                    {order.orderNumber}
                  </span>
                  <span className="text-[11px] text-[#6E7E8D]">
                    • {formatDate(order.createdAt)}
                  </span>
                </div>
                <span
                  className={`self-start sm:self-auto rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    order.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-800'
                      : order.paymentStatus === 'paid'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {order.status.replace('_', ' ')}
                </span>
              </div>

              <div className="pt-3 flex items-center justify-between">
                <div className="text-xs text-[#6E7E8D]">
                  <p>
                    Metode:{' '}
                    {order.deliveryMethod === 'pickup'
                      ? 'Ambil di Toko'
                      : `Kurir (${order.courier || '-'})`}
                  </p>
                  <p className="font-bold text-sm text-[#001524] mt-0.5">
                    {formatRupiah(order.total)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-[#15616D]">
                  <span>Detail & Pembayaran</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </Link>
          ))}

          {pagination && pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between pt-4 border-t border-[#001524]/10">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Sebelumnya
              </Button>
              <span className="text-xs text-[#6E7E8D]">
                Halaman {pagination.page} dari {pagination.totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Selanjutnya
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
