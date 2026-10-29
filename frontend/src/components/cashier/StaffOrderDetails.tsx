import { PosReceipt } from '@/components/cashier/PosReceipt';
import type { Order } from '@/types/api';
import { Button } from '@/components/ui/button';
import { formatDate, formatRupiah } from '@/lib/utils';
import { nextStatus, statusLabels } from '@/lib/orders';

export interface StaffOrderDetailsProps {
  order: Order;
  receipt?: boolean;
  isUpdating?: boolean;
  onUpdateStatus?: (newStatus: string) => void;
}

export function StaffOrderDetails({
  order,
  receipt = false,
  isUpdating = false,
  onUpdateStatus,
}: StaffOrderDetailsProps) {
  const next = nextStatus(order);
  if (receipt) return <PosReceipt order={order} />;

  return (
    <article className="panel">
      <h2>BagDaily</h2>
      <p className="font-bold mt-3 break-all">{order.orderNumber}</p>
      <p className="muted">{formatDate(order.createdAt)}</p>
      <div className="summary-line">
        <span>Status</span>
        <strong>{statusLabels[order.status]}</strong>
      </div>
      <div className="summary-line">
        <span>Pembayaran</span>
        <strong>{order.paymentStatus === 'paid' ? 'Dibayar' : 'Belum dibayar'}</strong>
      </div>
      <div className="table-wrap mt-5">
        <table>
          <thead>
            <tr>
              <th>Produk / SKU</th>
              <th>Jumlah</th>
              <th>Harga</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items?.map(item => (
              <tr key={item.id}>
                <td>
                  {item.productNameSnapshot}
                  <p className="muted">{item.skuSnapshot}</p>
                </td>
                <td>{item.quantity}</td>
                <td>{formatRupiah(item.unitPrice)}</td>
                <td>{formatRupiah(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="summary-line">
        <span>Subtotal</span>
        <strong>{formatRupiah(order.subtotal)}</strong>
      </div>
      <div className="summary-line">
        <span>Pengiriman</span>
        <strong>{formatRupiah(order.shippingCost)}</strong>
      </div>
      <div className="summary-line text-lg">
        <span>Total</span>
        <strong>{formatRupiah(order.total)}</strong>
      </div>

      <>
        <div className="notice mt-6">
          {order.deliveryMethod === 'pickup' ? (
            'Ambil di toko. Pastikan barang diserahkan sebelum menandai selesai.'
          ) : (
            <>
              {order.recipientName} · {order.recipientPhone}
              <br />
              {order.shippingAddress}
              <br />
              {order.courier} · {order.shippingZone}
              <br />
              Resi: {order.trackingNumber || 'Dibuat otomatis saat dikirim'}
            </>
          )}
        </div>
        {next && order.paymentStatus === 'paid' && onUpdateStatus && (
          <Button
            className="mt-5"
            variant="teal"
            disabled={isUpdating}
            onClick={() => onUpdateStatus(next)}
          >
            {isUpdating ? 'Menyimpan…' : `Ubah: ${statusLabels[next]}`}
          </Button>
        )}
      </>
    </article>
  );
}
