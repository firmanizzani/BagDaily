import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '@/hooks/api';
import type { Order } from '@/types/api';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate, formatRupiah } from '@/lib/utils';
import { orderStatusLabel, statusLabels } from '@/lib/orders';

export function StaffOrdersPage({ history = false }: { history?: boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    ...(search ? { search } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    page: String(page),
    limit: '12',
  });
  if (!history && status) params.set('status', status);
  const query = useApi<Order[]>(
    `${history ? '/cashier/transactions' : '/admin/orders'}?${params}`,
  );
  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <h1>{history ? 'Riwayat transaksi POS' : 'Pesanan online'}</h1>
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
        <label className="field">
          Dari
          <input
            type="date"
            value={from}
            onChange={e => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field">
          Sampai (eksklusif)
          <input
            type="date"
            value={to}
            onChange={e => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </label>
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
                <th>Status</th>
                <th>Total</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {query.data.data.map(order => (
                <tr key={order.id}>
                  <td className="font-semibold">{order.orderNumber}</td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>
                    <span className="badge">{orderStatusLabel(order)}</span>
                  </td>
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
