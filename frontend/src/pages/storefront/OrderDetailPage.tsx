import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, Package, ShieldAlert, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useAction, useApi, useUser } from '@/hooks/api';
import type { Order } from '@/types/api';
import { generateUUID } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/shared/states';
import {
  OnlinePaymentPanel,
  type OnlinePaymentMethod,
} from '@/components/storefront/OnlinePaymentPanel';
import { formatDate, formatRupiah } from '@/lib/utils';
import { paymentMethodLabels } from '@/lib/payments';
import { orderStatusLabel } from '@/lib/orders';

export function OrderDetailPage({ paymentOnly = false }: { paymentOnly?: boolean }) {
  const { id } = useParams<{ id: string }>();
  return <OrderDetails key={id} id={id} paymentOnly={paymentOnly} />;
}

function OrderDetails({
  id,
  paymentOnly,
}: {
  id: string | undefined;
  paymentOnly: boolean;
}) {
  const query = useApi<Order>(`/orders/${id}`);
  const { refetch: refetchOrder } = query;
  const client = useQueryClient();
  const pay = useAction<Order>();
  const cancel = useAction<Order>();
  const receive = useAction<Order>();
  const { data: customerUser } = useUser();
  const [method, setMethod] = useState<OnlinePaymentMethod>('qris');
  const [key] = useState(() => generateUUID());
  const [now, setNow] = useState(() => Date.now());
  const order = query.data?.data;
  const awaitingPayment =
    order?.status === 'awaiting_payment' && order.paymentStatus === 'unpaid';
  const expired = Boolean(
    order?.paymentDeadline && new Date(order.paymentDeadline).getTime() <= now,
  );

  useEffect(() => {
    if (!awaitingPayment || !expired) return;
    void refetchOrder();
    const timer = window.setInterval(() => void refetchOrder(), 5000);
    return () => window.clearInterval(timer);
  }, [awaitingPayment, expired, refetchOrder]);

  useEffect(() => {
    if (!awaitingPayment) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [awaitingPayment]);

  if (query.isLoading) return <LoadingState label="Menyiapkan pembayaran…" />;
  if (query.isError || !order)
    return (
      <div className="order-payment-page">
        <ErrorState
          message="Pesanan tidak ditemukan atau Anda tidak memiliki akses."
          onRetry={() => void query.refetch()}
        />
      </div>
    );

  const paid = order.paymentStatus === 'paid';
  const cancelled = order.status === 'cancelled';
  const busy = pay.isPending || cancel.isPending || receive.isPending;

  const updateOrder = async (response: { data: Order }) => {
    await client.cancelQueries({ queryKey: [`/orders/${id}`] });
    client.setQueryData([`/orders/${id}`], response);
  };

  const handlePay = async () => {
    if (!awaitingPayment || expired || busy) return;
    try {
      const response = await pay.mutateAsync({
        path: `/orders/${order.id}/simulate-payment`,
        method: 'POST',
        body: { method: order.total === 0 ? 'points' : method },
        key,
      });
      await updateOrder(response);
      toast.success('Pembayaran berhasil. Pesananmu akan segera diproses.');
    } catch {
      void query.refetch();
    }
  };

  const handleCancel = async () => {
    if (busy || !window.confirm('Batalkan pesanan yang belum dibayar ini?')) return;
    try {
      const response = await cancel.mutateAsync({
        path: `/orders/${order.id}/cancel`,
        method: 'POST',
      });
      await updateOrder(response);
      toast.info('Pesanan dibatalkan.');
    } catch {
      void query.refetch();
    }
  };

  const handleReceive = async () => {
    if (busy || !window.confirm('Barang sudah Anda terima? Pesanan akan ditandai selesai dan poin dikreditkan.')) return;
    try {
      const response = await receive.mutateAsync({ path: `/orders/${order.id}/receive`, method: 'POST' });
      await updateOrder(response);
      toast.success(`Pesanan selesai. ${(response.data.pointsEarned ?? 0).toLocaleString('id-ID')} poin masuk ke akun Anda.`);
    } catch { void query.refetch(); }
  };

  return (
    <div className="order-payment-page">
      <Link to="/customer/orders" className="payment-back">
        <ArrowLeft size={15} /> Pesanan saya
      </Link>
      <header className="order-payment-heading">
        <div>
          <h1>
            {awaitingPayment
              ? 'Selesaikan pembayaran'
              : paid && paymentOnly
                ? 'Pembayaran berhasil'
                : 'Detail pesanan'}
          </h1>
          <p>
            {awaitingPayment
              ? 'Pesananmu sudah dibuat. Langsung bayar di halaman ini.'
              : 'Lihat ringkasan dan perkembangan pesananmu.'}
          </p>
        </div>
        <span
          className={
            cancelled ? 'order-payment-status cancelled' : 'order-payment-status'
          }
        >
          {orderStatusLabel(order)}
        </span>
      </header>
      <div className="order-payment-layout">
        <div className="order-payment-main">
          {awaitingPayment && order.total === 0 && (
            <section className="online-payment"><h2>Bayar dengan poin member</h2><p>Seluruh tagihan ditutup dengan {(order.pointsRedeemed ?? 0).toLocaleString('id-ID')} poin. Tidak perlu transfer atau scan QRIS.</p><Button variant="teal" disabled={busy || expired} onClick={() => void handlePay()}>{expired ? 'Batas pembayaran berakhir' : busy ? 'Memproses…' : 'Konfirmasi pembayaran poin'}</Button></section>
          )}
          {awaitingPayment && order.total > 0 && (
            <OnlinePaymentPanel
              total={order.total}
              deadline={order.paymentDeadline}
              method={method}
              isProcessing={busy}
              isExpired={expired}
              onMethodChange={setMethod}
              onPay={() => void handlePay()}
            />
          )}
          {paid && (
            <section className="online-payment payment-success" role="status">
              <CheckCircle2 size={42} strokeWidth={1.5} aria-hidden="true" />
              <h2>Pembayaran diterima</h2>
              <p>{order.status === 'completed' ? 'Pesanan telah selesai. Terima kasih sudah berbelanja di BagDaily.' : order.status === 'shipped' ? 'Pesanan sudah dikirim. Konfirmasikan setelah barang diterima.' : 'Terima kasih! Pesananmu sedang disiapkan untuk langkah berikutnya.'}</p>
              <strong className="online-pay-amount">{formatRupiah(order.total)}</strong>
              <dl>
                <div>
                  <dt>Metode pembayaran</dt>
                  <dd>
                    {order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : '—'}
                  </dd>
                </div>
                <div>
                  <dt>Dibayar pada</dt>
                  <dd>{order.paidAt ? formatDate(order.paidAt) : '—'}</dd>
                </div>
              </dl>
              <Button asChild variant="teal">
                <Link to="/customer/orders">Lihat pesanan saya</Link>
              </Button>
            </section>
          )}
          {paid && customerUser?.id === order.userId && (order.status === 'shipped' || (order.status === 'packed' && order.deliveryMethod === 'pickup')) && <section className="online-payment"><h2>{order.deliveryMethod === 'pickup' ? 'Barang sudah diambil?' : 'Barang sudah diterima?'}</h2><p>Konfirmasi untuk menyelesaikan pesanan dan menerima poin member.</p><Button variant="teal" disabled={busy} onClick={() => void handleReceive()}>{receive.isPending ? 'Menyelesaikan…' : order.deliveryMethod === 'pickup' ? 'Konfirmasi sudah diambil' : 'Konfirmasi barang diterima'}</Button></section>}
          {cancelled && (
            <section className="online-payment payment-cancelled">
              <ShieldAlert size={32} aria-hidden="true" />
              <h2>Pesanan dibatalkan</h2>
              <p>
                Pesanan ini sudah dibatalkan dan tidak dapat dibayar. Pilih kembali produk
                yang kamu inginkan.
              </p>
              <Button asChild variant="teal">
                <Link to="/catalog">Kembali belanja</Link>
              </Button>
            </section>
          )}
          <section className="order-delivery-details">
            <h2>
              {order.deliveryMethod === 'pickup' ? (
                <Package size={18} aria-hidden="true" />
              ) : (
                <Truck size={18} aria-hidden="true" />
              )}{' '}
              {order.deliveryMethod === 'pickup'
                ? 'Ambil di toko'
                : 'Informasi pengiriman'}
            </h2>
            {order.deliveryMethod === 'shipping' ? (
              <>
                <strong>
                  {order.recipientName} · {order.recipientPhone}
                </strong>
                <p>{order.shippingAddress}</p>
                <p>
                  {order.courier} · {order.shippingZone}
                </p>
                {order.trackingNumber && (
                  <p>
                    Nomor resi: <strong>{order.trackingNumber}</strong>
                  </p>
                )}
              </>
            ) : (
              <p>Ambil pesanan setelah toko mengonfirmasi pesanan siap diambil.</p>
            )}
          </section>
        </div>
        <aside className="order-payment-summary" aria-labelledby="order-summary-heading">
          <h2 id="order-summary-heading">Ringkasan pesanan</h2>
          <p className="payment-order-number">{order.orderNumber}</p>
          <p className="payment-order-date">{formatDate(order.createdAt)}</p>
          <div className="payment-order-items">
            {order.items?.map(item => (
              <div key={item.id}>
                <div>
                  <strong>{item.productNameSnapshot}</strong>
                  <small>
                    {item.quantity} × {formatRupiah(item.unitPrice)}
                  </small>
                </div>
                <span>{formatRupiah(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <dl className="payment-order-costs">
            <div>
              <dt>Subtotal</dt>
              <dd>{formatRupiah(order.subtotal)}</dd>
            </div>
            <div>
              <dt>Ongkos kirim</dt>
              <dd>
                {order.shippingCost === 0 ? 'Gratis' : formatRupiah(order.shippingCost)}
              </dd>
            </div>
            <div className="payment-summary-total">
              <dt>Total pembayaran</dt>
              <dd>{formatRupiah(order.total)}</dd>
            </div>
            {(order.pointsRedeemed ?? 0) > 0 && <div><dt>Potongan poin{cancelled ? ' (penahanan dilepas)' : ''}</dt><dd>−{formatRupiah(order.pointsRedeemed ?? 0)}</dd></div>}
          </dl>
          {order.userId && <p className="order-loyalty-note">{paid && order.status === 'completed' ? `${(order.pointsEarned ?? 0).toLocaleString('id-ID')} poin telah diperoleh dari pesanan ini.` : cancelled ? 'Pesanan batal tidak memperoleh poin. Poin yang ditahan telah dilepas.' : `${Math.floor(order.total / 100).toLocaleString('id-ID')} poin akan masuk setelah barang diterima dan pesanan selesai.`}</p>}
          {awaitingPayment && (
            <button
              className="payment-cancel-button"
              disabled={busy}
              onClick={() => void handleCancel()}
            >
              {cancel.isPending ? 'Membatalkan…' : 'Batalkan pesanan'}
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
