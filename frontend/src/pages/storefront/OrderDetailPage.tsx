import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Order, PaymentMethod } from '@/types/api';
import { generateUUID } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate, formatRupiah } from '@/lib/utils';

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: orderData, isLoading, isError, refetch } = useApi<Order>(`/orders/${id}`);
  const simulatePayment = useAction<Order>();
  const cancelOrder = useAction<Order>();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateUUID());

  if (isLoading) return <LoadingState label="Memuat rincian pesanan…" />;
  if (isError || !orderData) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <ErrorState
          message="Pesanan tidak ditemukan atau Anda tidak memiliki akses."
          onRetry={refetch}
        />
      </div>
    );
  }

  const order = orderData.data;
  const isAwaitingPayment = order.status === 'awaiting_payment';
  const isCancelled = order.status === 'cancelled';
  const isPaid = order.paymentStatus === 'paid';

  const handleSimulatePayment = async () => {
    try {
      await simulatePayment.mutateAsync({
        path: `/orders/${order.id}/simulate-payment`,
        method: 'POST',
        body: { method: paymentMethod },
        key: idempotencyKey,
      });
      toast.success('Pembayaran simulasi berhasil diverifikasi!');
      setIdempotencyKey(generateUUID());
      void refetch();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'ORDER_EXPIRED') {
        toast.error('Batas waktu pembayaran telah habis. Pesanan dibatalkan.');
      } else if (error?.code === 'INSUFFICIENT_STOCK') {
        toast.error('Maaf, stok produk habis mendahului transaksi Anda.');
      } else {
        toast.error(error?.message || 'Gagal memproses simulasi pembayaran.');
      }
      void refetch();
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Yakin ingin membatalkan pesanan belum dibayar ini?')) return;
    try {
      await cancelOrder.mutateAsync({
        path: `/orders/${order.id}/cancel`,
        method: 'POST',
      });
      toast.info('Pesanan berhasil dibatalkan.');
      void refetch();
    } catch {
      toast.error('Gagal membatalkan pesanan.');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          to="/customer/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#15616D] hover:underline"
        >
          <ArrowLeft size={14} /> Kembali ke Daftar Pesanan
        </Link>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            isCancelled
              ? 'bg-rose-100 text-rose-800'
              : isPaid
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
          }`}
        >
          {order.status.replace('_', ' ')}
        </span>
      </div>

      <div className="rounded-xl border border-[#001524]/10 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-5">
          <div>
            <span className="text-xs text-[#6E7E8D]">Nomor Pesanan</span>
            <h1 className="text-xl font-extrabold text-[#001524]">{order.orderNumber}</h1>
            <p className="text-xs text-[#6E7E8D] mt-0.5">
              Dibuat pada {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-xs text-[#6E7E8D]">Total Pembayaran</span>
            <p className="text-xl font-black text-[#15616D]">
              {formatRupiah(order.total)}
            </p>
          </div>
        </div>

        {isAwaitingPayment ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="text-amber-700 shrink-0 mt-0.5" size={20} />
              <div>
                <h2 className="text-sm font-bold text-amber-900">
                  Menunggu Pembayaran Simulasi
                </h2>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Batas waktu pembayaran:{' '}
                  <strong>
                    {order.paymentDeadline
                      ? formatDate(order.paymentDeadline)
                      : '15 Menit'}
                  </strong>
                  . Sistem BagDaily menggunakan prinsip{' '}
                  <em>First Successful Payment Wins</em>: stok hanya berkurang saat
                  pembayaran berhasil.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-200">
              <label className="block text-xs font-semibold text-amber-950 mb-2">
                Pilih Metode Pembayaran Simulasi
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-bold transition ${
                    paymentMethod === 'qris'
                      ? 'border-[#15616D] bg-white text-[#15616D] shadow-xs'
                      : 'border-amber-300 bg-amber-100/40 text-amber-900'
                  }`}
                >
                  <QrCode size={18} /> QRIS Simulasi
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-xs font-bold transition ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-[#15616D] bg-white text-[#15616D] shadow-xs'
                      : 'border-amber-300 bg-amber-100/40 text-amber-900'
                  }`}
                >
                  <CreditCard size={18} /> Transfer Bank
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                variant="teal"
                size="lg"
                onClick={handleSimulatePayment}
                disabled={simulatePayment.isPending}
              >
                {simulatePayment.isPending
                  ? 'Memproses Simulasi…'
                  : 'Konfirmasi Bayar Sekarang'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelOrder}
                disabled={cancelOrder.isPending}
                className="text-rose-700 hover:bg-rose-50 border-rose-300"
              >
                Batalkan Pesanan
              </Button>
            </div>
          </div>
        ) : null}

        {isCancelled ? (
          <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
            <ShieldAlert size={18} className="shrink-0" />
            <span>
              Pesanan ini telah dibatalkan (kadaluarsa atau dibatalkan pengguna). Tidak
              ada stok yang tertahan.
            </span>
          </div>
        ) : null}

        {isPaid ? (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
            <CheckCircle2 size={18} className="shrink-0" />
            <div>
              <p className="font-bold">Pembayaran Diterima</p>
              <p>
                Metode: {order.paymentMethod?.toUpperCase()} • Dibayar pada:{' '}
                {order.paidAt ? formatDate(order.paidAt) : '-'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="rounded-lg border border-[#6E7E8D]/15 p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#15616D]">
              Metode Pengiriman
            </h3>
            <p className="text-sm font-semibold text-[#001524]">
              {order.deliveryMethod === 'pickup'
                ? 'Ambil Sendiri di Gerai'
                : `Kirim Kurir: ${order.courier || '-'}`}
            </p>
            {order.deliveryMethod === 'shipping' ? (
              <div className="text-xs text-[#6E7E8D] space-y-1">
                <p>
                  <strong>Penerima:</strong> {order.recipientName} ({order.recipientPhone}
                  )
                </p>
                <p>
                  <strong>Alamat:</strong> {order.shippingAddress}
                </p>
                {order.trackingNumber ? (
                  <div className="mt-2 rounded bg-[#FAF9F6] p-2 border border-[#6E7E8D]/20">
                    <span className="text-[10px] text-[#6E7E8D] block uppercase">
                      Nomor Resi Pelacakan
                    </span>
                    <span className="font-mono font-bold text-sm text-[#001524]">
                      {order.trackingNumber}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-xs text-[#6E7E8D]">
                Ambil di gerai BagDaily: Jl. UMKM Kreatif No. 24, Jakarta Selatan.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-[#6E7E8D]/15 p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#15616D]">
              Rincian Biaya
            </h3>
            <div className="text-xs space-y-1.5 text-[#6E7E8D]">
              <div className="flex justify-between">
                <span>Subtotal Barang:</span>
                <span className="font-semibold text-[#001524]">
                  {formatRupiah(order.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Pengiriman:</span>
                <span className="font-semibold text-[#001524]">
                  {formatRupiah(order.shippingCost)}
                </span>
              </div>
              <div className="border-t border-[#6E7E8D]/15 pt-2 flex justify-between font-bold text-sm text-[#001524]">
                <span>Total:</span>
                <span className="text-[#15616D]">{formatRupiah(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-[#001524] mb-3">Item Pesanan</h3>
          <div className="divide-y divide-[#6E7E8D]/15 rounded-lg border border-[#6E7E8D]/15 overflow-hidden">
            {order.items?.map(item => (
              <div
                key={item.id}
                className="p-3.5 flex items-center justify-between bg-white text-xs"
              >
                <div>
                  <p className="font-bold text-[#001524] text-sm">
                    {item.productNameSnapshot}
                  </p>
                  <p className="text-[#6E7E8D]">SKU: {item.skuSnapshot}</p>
                  <p className="text-[#6E7E8D]">
                    {item.quantity} unit × {formatRupiah(item.unitPrice)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-bold text-sm text-[#001524]">
                    {formatRupiah(item.subtotal)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
