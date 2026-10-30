import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock3,
  Mail,
  MapPin,
  Phone,
  Printer,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Order } from '@/types/api';
import { formatDate, formatRupiah } from '@/lib/utils';
import {
  nextStatus,
  nextStatusAction,
  orderStatusLabel,
  statusClass,
} from '@/lib/orders';
import { paymentMethodLabels } from '@/lib/payments';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { ErrorState, LoadingState } from '@/components/shared/states';

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const query = useApi<Order>(`/admin/orders/${id}`);
  const action = useAction<Order>();
  if (query.isLoading) return <LoadingState label="Memuat detail pesanan…" />;
  if (query.isError || !query.data)
    return (
      <ErrorState
        message="Detail pesanan belum dapat dimuat."
        onRetry={() => void query.refetch()}
      />
    );
  const order = query.data.data;
  const next = nextStatus(order);
  const advance = async () => {
    if (!next || order.paymentStatus !== 'paid') return;
    try {
      await action.mutateAsync({
        path: `/admin/orders/${order.id}/status`,
        method: 'PATCH',
        body: { status: next },
      });
      toast.success('Status pesanan berhasil diperbarui.');
    } catch {
      return;
    }
  };
  return (
    <div className="admin-page admin-order-detail">
      <Link className="admin-back-link no-print" to="/admin/orders">
        <ArrowLeft size={15} />
        Pesanan
      </Link>
      <header className="admin-page-heading">
        <div>
          <div className="admin-detail-title">
            <h1 title={order.orderNumber}>{order.orderNumber}</h1>
            <span className={statusClass(order.status)}>{orderStatusLabel(order)}</span>
          </div>
          <p>Dipesan pada {formatDate(order.createdAt)}</p>
        </div>
        <div className="admin-heading-actions no-print">
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            Cetak
          </button>
          {next && order.paymentStatus === 'paid' && (
            <button
              type="button"
              className="admin-primary-button"
              disabled={action.isPending}
              onClick={() => void advance()}
            >
              {action.isPending ? 'Menyimpan…' : nextStatusAction(order)}
            </button>
          )}
        </div>
      </header>
      {next && (
        <p className="admin-order-guidance no-print">
          {order.status === 'shipped'
            ? 'Selesaikan pesanan setelah barang diterima pelanggan.'
            : order.status === 'packed' && order.deliveryMethod === 'pickup'
              ? 'Tandai sudah diambil setelah barang diserahkan kepada pelanggan.'
              : order.status === 'packed'
                ? 'Tandai dikirim setelah barang diserahkan kepada kurir.'
                : 'Periksa produk dan jumlahnya. Proses pesanan setelah semua barang siap.'}
        </p>
      )}
      <div className="admin-order-detail-grid">
        <div className="admin-detail-column">
          <section className="admin-panel">
            <header className="admin-panel-heading">
              <h2>Informasi Pelanggan</h2>
            </header>
            <div className="admin-contact-block">
              <UserRound size={18} />
              <div>
                <strong>
                  {order.customerName || order.recipientName || 'Pelanggan'}
                </strong>
                {order.customerEmail && (
                  <span>
                    <Mail size={13} />
                    {order.customerEmail}
                  </span>
                )}
                {(order.customerPhone || order.recipientPhone) && (
                  <span>
                    <Phone size={13} />
                    {order.customerPhone || order.recipientPhone}
                  </span>
                )}
                {order.userId && (
                  <Link to={`/admin/customers/${order.userId}`}>
                    Lihat riwayat pelanggan →
                  </Link>
                )}
              </div>
            </div>
            <div className="admin-contact-block">
              <MapPin size={18} />
              <div>
                <h3>
                  {order.deliveryMethod === 'pickup'
                    ? 'Ambil di toko'
                    : 'Alamat Pengiriman'}
                </h3>
                {order.deliveryMethod === 'pickup' ? (
                  <p>Pesanan disiapkan untuk diambil langsung di toko.</p>
                ) : (
                  <>
                    <strong>{order.recipientName}</strong>
                    <p>{order.shippingAddress}</p>
                    <p>
                      {order.courier} · {order.shippingZone}
                    </p>
                    {order.trackingNumber && (
                      <p className="admin-tracking">Resi: {order.trackingNumber}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="admin-panel">
            <header className="admin-panel-heading">
              <h2>Timeline Pesanan</h2>
            </header>
            <ol className="admin-order-timeline">
              {(order.history || []).map(event => (
                <li key={event.id}>
                  <span className="admin-timeline-mark">
                    <Check size={13} />
                  </span>
                  <div>
                    <strong>
                      {event.newStatus === 'awaiting_payment'
                        ? 'Pesanan dibuat'
                        : event.newStatus === 'awaiting_confirmation'
                          ? 'Pembayaran berhasil'
                          : orderStatusLabel({
                              status: event.newStatus,
                              deliveryMethod: order.deliveryMethod,
                            })}
                    </strong>
                    <p>{formatDate(event.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
            {!order.history?.length && (
              <p className="admin-empty-note">
                <Clock3 size={16} />
                Riwayat status belum tersedia.
              </p>
            )}
          </section>
        </div>
        <div className="admin-detail-column">
          <section className="admin-panel">
            <header className="admin-panel-heading">
              <h2>Ringkasan Pembayaran</h2>
              <span className={`admin-payment-state ${order.paymentStatus}`}>
                {order.paymentStatus === 'paid' ? 'Dibayar' : 'Belum dibayar'}
              </span>
            </header>
            <dl className="admin-payment-summary">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatRupiah(order.subtotal)}</dd>
              </div>
              <div>
                <dt>Ongkos kirim</dt>
                <dd>{formatRupiah(order.shippingCost)}</dd>
              </div>
              <div className="payment-total">
                <dt>Total Pembayaran</dt>
                <dd>{formatRupiah(order.total)}</dd>
              </div>
              <div>
                <dt>Metode pembayaran</dt>
                <dd>
                  {order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : '—'}
                </dd>
              </div>
              {order.paidAt && (
                <div>
                  <dt>Dibayar pada</dt>
                  <dd>{formatDate(order.paidAt)}</dd>
                </div>
              )}
            </dl>
          </section>
          <section className="admin-panel">
            <header className="admin-panel-heading">
              <h2>Detail Produk</h2>
              <span>{order.items?.length || 0} produk</span>
            </header>
            <div className="admin-detail-products">
              {order.items?.map(item => (
                <div className="admin-detail-product" key={item.id}>
                  <ProductPhoto name={item.productNameSnapshot} src={item.imageUrl} />
                  <div>
                    <strong>{item.productNameSnapshot}</strong>
                    <p>{item.skuSnapshot}</p>
                    <p>
                      {item.quantity} × {formatRupiah(item.unitPrice)}
                    </p>
                  </div>
                  <strong>{formatRupiah(item.subtotal)}</strong>
                </div>
              ))}
            </div>
            <dl className="admin-payment-summary">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatRupiah(order.subtotal)}</dd>
              </div>
              <div>
                <dt>Ongkos kirim</dt>
                <dd>{formatRupiah(order.shippingCost)}</dd>
              </div>
              <div className="payment-total">
                <dt>Total</dt>
                <dd>{formatRupiah(order.total)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
