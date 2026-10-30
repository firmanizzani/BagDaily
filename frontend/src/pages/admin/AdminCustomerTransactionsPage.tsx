import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Mail, Phone, Search } from 'lucide-react';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Order } from '@/types/api';
import { formatDate, formatRupiah } from '@/lib/utils';
import { orderStatusLabel, statusClass } from '@/lib/orders';
import { DataPagination } from '@/components/admin/DataPagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

export function AdminCustomerTransactionsPage() {
  const { id } = useParams();
  return <CustomerTransactions key={id} id={id!} />;
}

function CustomerTransactions({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [payment, setPayment] = useState('');
  const settledSearch = useDebouncedValue(search);
  const params = new URLSearchParams({
    page: String(page),
    limit: '10',
    ...(settledSearch.trim() ? { search: settledSearch.trim() } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
  });
  const query = useApi<Order[]>(`/admin/customers/${id}/orders?${params}`);
  const customer = query.data?.customer;
  if (query.isLoading) return <LoadingState label="Memuat riwayat transaksi…" />;
  if (query.isError || !customer)
    return (
      <ErrorState
        message="Riwayat pelanggan belum dapat dimuat."
        onRetry={() => void query.refetch()}
      />
    );
  const transactions = query.data?.data || [];
  return (
    <section className="customer-page" aria-labelledby="customer-transactions-heading">
      <Link className="customer-back" to="/admin/customers">
        <ArrowLeft size={16} /> Semua pelanggan
      </Link>
      <header className="customer-page-heading customer-detail-heading">
        <div>
          <h1 id="customer-transactions-heading">{customer.name}</h1>
          <p>Riwayat transaksi pelanggan</p>
        </div>
        <div className="customer-contact">
          <span>
            <Mail size={14} />
            {customer.email}
          </span>
          <span>
            <Phone size={14} />
            {customer.phone || 'Telepon belum diisi'}
          </span>
        </div>
      </header>
      <dl className="customer-totals">
        <div>
          <dt>Total pesanan</dt>
          <dd>{customer.totalOrders.toLocaleString('id-ID')}</dd>
        </div>
        <div>
          <dt>Total belanja dibayar</dt>
          <dd>{formatRupiah(customer.totalSpend)}</dd>
        </div>
      </dl>
      <div className="customer-panel">
        <div className="customer-toolbar">
          <div className="customer-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              maxLength={100}
              aria-label="Cari transaksi pelanggan"
              placeholder="Cari nomor pesanan…"
              value={search}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label="Filter pembayaran"
            value={payment}
            onChange={event => {
              setPayment(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Semua pembayaran</option>
            <option value="paid">Sudah dibayar</option>
            <option value="unpaid">Belum dibayar</option>
          </select>
        </div>
        <div aria-busy={query.isFetching}>
          {!transactions.length ? (
            <EmptyState
              title="Belum ada transaksi"
              description={
                search || payment
                  ? 'Tidak ada transaksi yang sesuai pencarian dan filter.'
                  : 'Transaksi yang terhubung ke akun pelanggan ini akan tampil di sini.'
              }
            />
          ) : (
            <>
              <div className="customer-transactions-table-wrap">
                <table className="customer-table customer-transactions-table">
                  <caption className="sr-only">Riwayat transaksi {customer.name}</caption>
                  <thead>
                    <tr>
                      <th scope="col">No. pesanan</th>
                      <th scope="col">Tanggal</th>
                      <th scope="col">Kanal</th>
                      <th scope="col" className="numeric">
                        Total
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col" className="action-heading">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(order => (
                      <tr key={order.id}>
                        <td>
                          <Link
                            className="customer-order-number"
                            title={order.orderNumber}
                            to={
                              order.channel === 'pos'
                                ? `/cashier/receipt/${order.id}`
                                : `/admin/orders/${order.id}`
                            }
                          >
                            {order.orderNumber}
                          </Link>
                          <span className="customer-payment-label">
                            {order.paymentStatus === 'paid'
                              ? 'Sudah dibayar'
                              : 'Belum dibayar'}
                          </span>
                        </td>
                        <td className="nowrap">{formatDate(order.createdAt)}</td>
                        <td>{order.channel === 'pos' ? 'Toko / POS' : 'Online'}</td>
                        <td className="numeric customer-spend">
                          {formatRupiah(order.total)}
                        </td>
                        <td>
                          <span className={statusClass(order.status)}>
                            {orderStatusLabel(order)}
                          </span>
                        </td>
                        <td className="customer-row-actions">
                          <Link
                            className="customer-history-link"
                            aria-label={`Lihat pesanan ${order.orderNumber}`}
                            to={
                              order.channel === 'pos'
                                ? `/cashier/receipt/${order.id}`
                                : `/admin/orders/${order.id}`
                            }
                          >
                            <ArrowUpRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="customer-transaction-mobile-list">
                {transactions.map(order => (
                  <Link
                    key={order.id}
                    className="customer-transaction-mobile-row"
                    to={
                      order.channel === 'pos'
                        ? `/cashier/receipt/${order.id}`
                        : `/admin/orders/${order.id}`
                    }
                  >
                    <div className="transaction-mobile-heading">
                      <strong title={order.orderNumber}>{order.orderNumber}</strong>
                      <ArrowUpRight size={16} />
                    </div>
                    <p>{formatDate(order.createdAt)}</p>
                    <div className="transaction-mobile-facts">
                      <strong>{formatRupiah(order.total)}</strong>
                      <span className={statusClass(order.status)}>
                        {orderStatusLabel(order)}
                      </span>
                    </div>
                    <div className="transaction-mobile-meta">
                      <span>{order.channel === 'pos' ? 'Toko / POS' : 'Online'}</span>
                      <span>
                        {order.paymentStatus === 'paid'
                          ? 'Sudah dibayar'
                          : 'Belum dibayar'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
        <DataPagination
          pagination={query.data?.pagination}
          noun="transaksi"
          disabled={query.isFetching}
          onPage={setPage}
        />
      </div>
      <p className="customer-data-note">
        Waktu ditampilkan dalam WIB. Transaksi POS tanpa akun pelanggan tidak dimasukkan
        ke riwayat ini.
      </p>
    </section>
  );
}
