import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  Mail,
  MapPin,
  Phone,
  Printer,
  UserRound,
  X,
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
  const canAdvance = next && order.paymentStatus === 'paid';
  const unitCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const guidance =
    order.status === 'shipped'
      ? 'Selesaikan setelah barang diterima pelanggan.'
      : order.status === 'packed' && order.deliveryMethod === 'pickup'
        ? 'Konfirmasi setelah barang diserahkan kepada pelanggan.'
        : order.status === 'packed'
          ? 'Tandai dikirim setelah diserahkan kepada kurir.'
          : 'Periksa produk dan jumlahnya sebelum memproses pesanan.';
  const advance = async () => {
    if (!canAdvance || action.isPending) return;
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
  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      toast.success('Nomor pesanan disalin.');
    } catch {
      toast.error('Nomor belum dapat disalin. Silakan salin teks nomor pesanan.');
    }
  };
  return (
    <div className="admin-page admin-order-detail">
      <Link className="admin-back-link no-print" to="/admin/orders">
        <ArrowLeft size={15} />
        Pesanan
      </Link>
      <header className="admin-page-heading admin-order-heading">
        <div>
          <div className="admin-detail-title">
            <h1>Detail pesanan</h1>
            <span className={statusClass(order.status)}>{orderStatusLabel(order)}</span>
          </div>
          <div className="admin-order-reference">
            <span>{order.orderNumber}</span>
            <button
              type="button"
              className="no-print"
              aria-label="Salin nomor pesanan"
              onClick={() => void copyNumber()}
            >
              <Copy size={15} />
            </button>
          </div>
          <p>Dipesan pada {formatDate(order.createdAt)}</p>
        </div>
        <div className="admin-detail-actions no-print">
          <div className="admin-heading-actions">
            <button
              type="button"
              className="admin-secondary-button"
              onClick={() => window.print()}
            >
              <Printer size={15} />
              Cetak
            </button>
            {canAdvance && (
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
          {canAdvance && <p>{guidance}</p>}
        </div>
      </header>
      <div className="admin-order-detail-grid">
        <div className="admin-detail-column">
          <section className="admin-panel" aria-labelledby="admin-order-products-heading">
            <header className="admin-panel-heading">
              <h2 id="admin-order-products-heading">Produk pesanan</h2>
              <span>
                {unitCount} barang · {order.items?.length || 0} jenis produk
              </span>
            </header>
            <div className="admin-order-items">
              <div className="admin-order-items-head" aria-hidden="true">
                <span>Produk</span>
                <span>Harga satuan</span>
                <span>Jumlah</span>
                <span>Total produk</span>
              </div>
              {order.items?.map(item => (
                <div className="admin-order-item" key={item.id}>
                  <div className="admin-order-item-name">
                    <ProductPhoto name={item.productNameSnapshot} src={item.imageUrl} />
                    <div>
                      <h3>{item.productNameSnapshot}</h3>
                      <p>{item.skuSnapshot}</p>
                    </div>
                  </div>
                  <div className="admin-order-item-price">
                    <span>Harga satuan</span>
                    {formatRupiah(item.unitPrice)}
                  </div>
                  <div className="admin-order-item-quantity">
                    <span>Jumlah</span>
                    {item.quantity}
                  </div>
                  <div className="admin-order-item-total">
                    <span>Total produk</span>
                    <strong>{formatRupiah(item.subtotal)}</strong>
                  </div>
                </div>
              ))}
              {!order.items?.length && (
                <p className="admin-empty-note">Rincian produk belum tersedia.</p>
              )}
            </div>
          </section>
          <section className="admin-panel" aria-labelledby="admin-order-timeline-heading">
            <header className="admin-panel-heading">
              <h2 id="admin-order-timeline-heading">Timeline pesanan</h2>
            </header>
            <ol className="admin-order-timeline">
              {(order.history || []).map(event => (
                <li key={event.id}>
                  <span
                    className={`admin-timeline-mark${event.newStatus === 'cancelled' ? ' cancelled' : ''}`}
                  >
                    {event.newStatus === 'cancelled' ? (
                      <X size={13} />
                    ) : (
                      <Check size={13} />
                    )}
                  </span>
                  <div>
                    <strong>
                      {event.newStatus === 'awaiting_payment'
                        ? 'Pesanan dibuat'
                        : event.newStatus === 'awaiting_confirmation'
                          ? 'Pembayaran berhasil'
                          : event.newStatus === 'shipped'
                            ? 'Dikirim oleh kurir'
                            : orderStatusLabel({
                                status: event.newStatus,
                                deliveryMethod: order.deliveryMethod,
                              })}
                    </strong>
                    <p>
                      <time dateTime={event.createdAt}>
                        {formatDate(event.createdAt)}
                      </time>
                    </p>
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
          <section className="admin-panel" aria-labelledby="admin-order-customer-heading">
            <header className="admin-panel-heading">
              <h2 id="admin-order-customer-heading">Pelanggan & pengiriman</h2>
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
            <div className="admin-contact-block admin-shipping-block">
              <MapPin size={18} />
              <div>
                <h3>
                  {order.deliveryMethod === 'pickup'
                    ? 'Ambil di toko'
                    : 'Alamat pengiriman'}
                </h3>
                {order.deliveryMethod === 'pickup' ? (
                  <p>Pesanan diambil langsung di toko.</p>
                ) : (
                  <>
                    <strong>{order.recipientName}</strong>
                    <p>{order.shippingAddress || 'Alamat belum tersedia.'}</p>
                    {order.recipientPhone &&
                      order.recipientPhone !== order.customerPhone && (
                        <p>Telepon penerima: {order.recipientPhone}</p>
                      )}
                    <p>
                      {[order.courier, order.shippingZone].filter(Boolean).join(' · ') ||
                        'Kurir belum tersedia.'}
                    </p>
                    {order.trackingNumber && (
                      <p className="admin-tracking">Resi: {order.trackingNumber}</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="admin-panel" aria-labelledby="admin-order-payment-heading">
            <header className="admin-panel-heading">
              <h2 id="admin-order-payment-heading">Pembayaran</h2>
              <span className={`admin-payment-state ${order.paymentStatus}`}>
                {order.paymentStatus === 'paid' ? 'Dibayar' : 'Belum dibayar'}
              </span>
            </header>
            <dl className="admin-payment-summary">
              <div>
                <dt>Subtotal produk</dt>
                <dd>{formatRupiah(order.subtotal)}</dd>
              </div>
              <div>
                <dt>Ongkos kirim</dt>
                <dd>{formatRupiah(order.shippingCost)}</dd>
              </div>
              {(order.pointsRedeemed ?? 0) > 0 && (
                <div>
                  <dt>Potongan poin</dt>
                  <dd>−{formatRupiah(order.pointsRedeemed ?? 0)}</dd>
                </div>
              )}
              <div className="payment-total">
                <dt>Total pembayaran</dt>
                <dd>{formatRupiah(order.total)}</dd>
              </div>
            </dl>
            <dl className="admin-payment-summary admin-payment-metadata">
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
        </div>
      </div>
    </div>
  );
}
