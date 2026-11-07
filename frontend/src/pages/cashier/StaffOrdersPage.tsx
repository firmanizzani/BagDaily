import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '@/hooks/api';
import type { Order } from '@/types/api';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate, formatRupiah } from '@/lib/utils';
import { orderStatusLabel, statusLabels } from '@/lib/orders';
import { paymentMethodLabels } from '@/lib/payments';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { dateRangeParams, type DateRange } from '@/lib/dateRange';

export function StaffOrdersPage({ history = false }: { history?: boolean }) {
  const [url] = useSearchParams();
  const [customer, setCustomer] = useState(() =>
    url.get('customer') === 'general' ? 'general' : '',
  );
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const params = dateRangeParams(range);
  params.delete('all');
  params.delete('compare');
  for (const [key, value] of Object.entries({
    ...(search ? { search } : {}),
    ...(history && customer ? { customer } : {}),
    page: String(page),
    limit: '12',
  })) params.set(key, value);
  if (!history && status) params.set('status', status);
  const query = useApi<Order[]>(
    `${history ? '/cashier/transactions' : '/admin/orders'}?${params}`,
  );
  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <h1>{history ? 'Riwayat transaksi POS' : 'Pesanan'}</h1>
          <p className="muted">
            {history
              ? 'Lihat detail transaksi dan cetak ulang struk.'
              : 'Proses pesanan online, pengiriman, dan pengambilan di toko.'}
          </p>
        </div>
      </div>
      <div className="filter-bar">
        <label className="field">
          Nomor transaksi
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari pesanan…"
          />
        </label>
        {!history && (
          <label className="field">
            Status
            <select
              value={status}
              onChange={e => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua status</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {history && (
          <label className="field">
            Pelanggan
            <select
              value={customer}
              onChange={event => {
                setCustomer(event.target.value);
                setPage(1);
              }}
            >
              <option value="">Semua transaksi</option>
              <option value="general">Pelanggan umum</option>
              <option value="registered">Pelanggan terdaftar</option>
            </select>
          </label>
        )}
        <div className="field staff-order-period">
          <span>Periode</span>
          <DateRangeFilter
            label="Pilih periode transaksi"
            value={range}
            onChange={value => {
              setRange(value);
              setPage(1);
            }}
          />
        </div>
      </div>
      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : !query.data?.data.length ? (
        <EmptyState
          title="Belum ada transaksi"
          description="Transaksi yang sesuai filter akan tampil di sini."
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nomor pesanan</th>
                <th>Tanggal</th>
                {history && <th>Pelanggan</th>}
                <th>Status</th>
                {history && <th>Metode pembayaran</th>}
                <th>Total</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map(order => (
                <tr key={order.id}>
                  <td className="font-semibold">{order.orderNumber}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  {history && (
                    <td>
                      {order.userId
                        ? order.customerName || 'Pelanggan terdaftar'
                        : 'Pelanggan umum'}
                    </td>
                  )}
                  <td>
                    <span className="badge">{orderStatusLabel(order)}</span>
                  </td>
                  {history && (
                    <td>{order.paymentMethod ? paymentMethodLabels[order.paymentMethod] : '—'}</td>
                  )}
                  <td>{formatRupiah(order.total)}</td>
                  <td>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={
                          history
                            ? `/cashier/receipt/${order.id}`
                            : `/admin/orders/${order.id}`
                        }
                      >
                        {history ? 'Struk' : 'Proses'}
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="pagination">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Sebelumnya
        </Button>
        <span>
          Halaman {page} / {query.data?.pagination?.totalPages || 1}
        </span>
        <Button
          variant="outline"
          disabled={page >= (query.data?.pagination?.totalPages || 1)}
          onClick={() => setPage(page + 1)}
        >
          Berikutnya
        </Button>
      </div>
    </div>
  );
}
