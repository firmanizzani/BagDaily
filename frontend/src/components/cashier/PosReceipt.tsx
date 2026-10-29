import type { Order } from '@/types/api';
import { formatRupiah } from '@/lib/utils';
import { paymentMethodLabels } from '@/lib/payments';

export interface PosReceiptProps {
  order: Order;
}

export function PosReceipt({ order }: PosReceiptProps) {
  const isCash =
    order.paymentMethod === 'cash' ||
    (!order.paymentMethod && order.cashReceived !== null);
  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  return (
    <article className="pos-receipt print-receipt" aria-label="Struk transaksi BagDaily">
      <header className="pos-receipt-header">
        <h2>BagDaily</h2>
        <p>Struk pembelian</p>
        <span>{order.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM DIBAYAR'}</span>
      </header>
      <dl className="pos-receipt-meta">
        <div>
          <dt>No. transaksi</dt>
          <dd>{order.orderNumber}</dd>
        </div>
        <div>
          <dt>Tanggal</dt>
          <dd>
            {new Date(order.createdAt).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </dd>
        </div>
        <div>
          <dt>Kasir</dt>
          <dd>{order.cashierName || '—'}</dd>
        </div>
      </dl>
      <section className="pos-receipt-items" aria-label="Rincian belanja">
        <div className="pos-receipt-columns">
          <span>Produk</span>
          <span>Jumlah</span>
        </div>
        {order.items?.map(item => (
          <div className="pos-receipt-item" key={item.id}>
            <strong>{item.productNameSnapshot}</strong>
            <span>{formatRupiah(item.subtotal)}</span>
            <small>
              {item.quantity} × {formatRupiah(item.unitPrice)}
            </small>
            <small className="pos-receipt-sku">{item.skuSnapshot}</small>
          </div>
        ))}
      </section>
      <dl className="pos-receipt-totals">
        <div>
          <dt>Subtotal ({itemCount} barang)</dt>
          <dd>{formatRupiah(order.subtotal)}</dd>
        </div>
        {order.shippingCost > 0 && (
          <div>
            <dt>Pengiriman</dt>
            <dd>{formatRupiah(order.shippingCost)}</dd>
          </div>
        )}
        <div className="pos-receipt-grand-total">
          <dt>Total</dt>
          <dd>{formatRupiah(order.total)}</dd>
        </div>
      </dl>
      <dl className="pos-receipt-payment">
        <div>
          <dt>Metode pembayaran</dt>
          <dd>
            {order.paymentMethod
              ? paymentMethodLabels[order.paymentMethod]
              : isCash
                ? 'Tunai'
                : '—'}
          </dd>
        </div>
        {isCash && (
          <>
            <div>
              <dt>Tunai diterima</dt>
              <dd>{formatRupiah(order.cashReceived ?? order.total)}</dd>
            </div>
            <div>
              <dt>Kembalian</dt>
              <dd>{formatRupiah(order.changeAmount ?? 0)}</dd>
            </div>
          </>
        )}
      </dl>
      <footer className="pos-receipt-footer">
        <strong>Terima kasih sudah berbelanja!</strong>
        <p>Simpan struk ini sebagai bukti pembelian.</p>
      </footer>
    </article>
  );
}
