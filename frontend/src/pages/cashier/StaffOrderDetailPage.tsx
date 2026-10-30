import { PosReceipt } from '@/components/cashier/PosReceipt';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Order } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate, formatRupiah } from '@/lib/utils';
import { nextStatus, nextStatusAction, orderStatusLabel } from '@/lib/orders';

export function StaffOrderDetailPage({ receipt = false }: { receipt?: boolean }) {
  const { id } = useParams();
  const query = useApi<Order>(
    receipt ? `/cashier/transactions/${id}` : `/admin/orders/${id}`,
  );
  const action = useAction<Order>();
  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data)
    return <ErrorState onRetry={() => void query.refetch()} />;
  const order = query.data.data;
  const next = nextStatus(order);
  return (
    <div className="space-y-6">
      <div className="page-heading no-print">
        <div>
          <Link
            to={receipt ? '/cashier/history' : '/admin/orders'}
            className="text-sm text-[#15616D]"
          >
            Kembali ke daftar
          </Link>
          <h1>{receipt ? 'Struk transaksi' : 'Detail pesanan'}</h1>
        </div>
        {receipt && <Button onClick={() => window.print()}>Cetak struk</Button>}
      </div>
      {receipt ? (
        <PosReceipt order={order} />
      ) : (
        <article className="panel">
          <h2>BagDaily</h2>
          <p className="font-bold mt-3 break-all">{order.orderNumber}</p>
          <p className="muted">{formatDate(order.createdAt)}</p>
          <div className="summary-line">
            <span>Status</span>
            <strong>{orderStatusLabel(order)}</strong>
          </div>
          <div className="summary-line">
            <span>Pembayaran</span>
            <strong>
              {order.paymentStatus === 'paid' ? 'Dibayar' : 'Belum dibayar'}
            </strong>
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
            {(order.status === 'awaiting_confirmation' ||
              order.status === 'confirmed') && (
              <p className="muted mt-3">
                Periksa produk dan jumlahnya. Lanjutkan setelah semua barang siap{' '}
                {order.deliveryMethod === 'pickup' ? 'diambil' : 'dikirim'}.
              </p>
            )}
            {next && order.paymentStatus === 'paid' && (
              <Button
                className="mt-5"
                variant="teal"
                disabled={action.isPending}
                onClick={async () => {
                  try {
                    await action.mutateAsync({
                      path: `/admin/orders/${order.id}/status`,
                      method: 'PATCH',
                      body: { status: next },
                    });
                    toast.success('Status diperbarui');
                  } catch {
                    return;
                  }
                }}
              >
                {action.isPending ? 'Menyimpan…' : nextStatusAction(order)}
              </Button>
            )}
          </>
        </article>
      )}
      {!receipt && (
        <section className="panel">
          <h2>Riwayat status</h2>
          <ol className="timeline">
            {order.history?.map(item => (
              <li key={item.id}>
                <strong>
                  {orderStatusLabel({
                    status: item.newStatus,
                    deliveryMethod: order.deliveryMethod,
                  })}
                </strong>
                <p className="muted">{formatDate(item.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
