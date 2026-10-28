import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Order } from '@/types/api';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate, formatRupiah } from '@/lib/utils';
import { nextStatus, statusLabels } from '@/lib/orders';

export function StaffOrderDetailPage({ receipt = false }: { receipt?: boolean }) {
  const { id } = useParams();
  const query = useApi<Order>(receipt ? `/cashier/transactions/${id}` : `/orders/${id}`);
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
            to={receipt ? '/cashier/history' : '/cashier/orders'}
            className="text-sm text-[#15616D]"
          >
            Kembali ke daftar
          </Link>
          <h1>{receipt ? 'Struk transaksi' : 'Detail pesanan'}</h1>
        </div>
        {receipt && <Button onClick={() => window.print()}>Cetak struk</Button>}
      </div>
      <article className={receipt ? 'receipt print-receipt' : 'panel'}>
        <h2>BagDaily</h2>
        <p className="font-bold mt-3 break-all">{order.orderNumber}</p>
        <p className="muted">{formatDate(order.createdAt)}</p>
        {receipt && <p>Kasir: {order.cashierName || '—'}</p>}
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
        {receipt ? (
          <>
            <div className="summary-line">
              <span>Tunai</span>
              <strong>{formatRupiah(order.cashReceived ?? 0)}</strong>
            </div>
            <div className="summary-line">
              <span>Kembalian</span>
              <strong>{formatRupiah(order.changeAmount ?? 0)}</strong>
            </div>
            <p className="mt-6 text-center text-sm">
              Terima kasih telah berbelanja di BagDaily.
            </p>
          </>
        ) : (
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
            {next && order.paymentStatus === 'paid' && (
              <Button
                className="mt-5"
                variant="teal"
                disabled={action.isPending}
                onClick={async () => {
                  try {
                    await action.mutateAsync({
                      path: `/cashier/orders/${order.id}/status`,
                      method: 'PATCH',
                      body: { status: next },
                    });
                    toast.success('Status diperbarui');
                  } catch {
                    return;
                  }
                }}
              >
                {action.isPending ? 'Menyimpan…' : `Ubah: ${statusLabels[next]}`}
              </Button>
            )}
          </>
        )}
      </article>
      {!receipt && (
        <section className="panel">
          <h2>Riwayat status</h2>
          <ol className="timeline">
            {order.history?.map(item => (
              <li key={item.id}>
                <strong>{statusLabels[item.newStatus]}</strong>
                <p className="muted">{formatDate(item.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
