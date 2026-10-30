import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Order } from '@/types/api';
import { formatDate, formatRupiah } from '@/lib/utils';
import { orderStatusLabel, statusClass } from '@/lib/orders';
import { ProductPhoto } from '@/components/shared/ProductPhoto';

export function OrderTable({
  orders,
  showProduct = false,
}: {
  orders: Order[];
  showProduct?: boolean;
}) {
  return (
    <>
      <div className="admin-order-table-wrap">
        <table className="admin-table admin-order-table">
          <caption className="sr-only">Daftar pesanan</caption>
          <thead>
            <tr>
              <th>No. pesanan</th>
              <th>Tanggal</th>
              <th>Pelanggan</th>
              {showProduct && <th>Produk</th>}
              <th className="numeric">Total</th>
              <th>Status</th>
              <th className="action-cell">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>
                  <Link
                    className="admin-order-number"
                    title={order.orderNumber}
                    to={`/admin/orders/${order.id}`}
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="nowrap">{formatDate(order.createdAt)}</td>
                <td>{order.customerName || order.recipientName || 'Pelanggan'}</td>
                {showProduct && (
                  <td>
                    <div className="admin-order-product">
                      <ProductPhoto
                        name={order.productName || ''}
                        src={order.productImageUrl}
                      />
                      <span>
                        {order.productCount ? `${order.productCount} produk` : '—'}
                      </span>
                    </div>
                  </td>
                )}
                <td className="numeric">{formatRupiah(order.total)}</td>
                <td>
                  <span className={statusClass(order.status)}>
                    <i />
                    {orderStatusLabel(order)}
                  </span>
                </td>
                <td className="action-cell">
                  <Link
                    className="admin-icon-action"
                    to={`/admin/orders/${order.id}`}
                    aria-label={`Lihat pesanan ${order.orderNumber}`}
                  >
                    <ArrowUpRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="admin-order-cards">
        {orders.map(order => (
          <Link
            key={order.id}
            className="admin-order-card"
            to={`/admin/orders/${order.id}`}
          >
            <div>
              <strong title={order.orderNumber}>{order.orderNumber}</strong>
              <ArrowUpRight size={16} />
            </div>
            <p>
              {order.customerName || order.recipientName || 'Pelanggan'} ·{' '}
              {formatDate(order.createdAt)}
            </p>
            <div>
              <strong>{formatRupiah(order.total)}</strong>
              <span className={statusClass(order.status)}>{orderStatusLabel(order)}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
