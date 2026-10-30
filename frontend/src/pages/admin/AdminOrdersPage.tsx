import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Order } from '@/types/api';
import { dateRangeParams, type DateRange } from '@/lib/dateRange';
import { DateRangeFilter } from '@/components/admin/DateRangeFilter';
import { OrderTable } from '@/components/admin/OrderTable';
import { DataPagination } from '@/components/admin/DataPagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

const tabs = [
  { id: 'all', label: 'Semua' },
  { id: 'processing', label: 'Diproses' },
  { id: 'shipped', label: 'Dikirim' },
  { id: 'completed', label: 'Selesai' },
  { id: 'cancelled', label: 'Dibatalkan' },
  { id: 'awaiting_payment', label: 'Belum dibayar' },
];

export function AdminOrdersPage() {
  const [url] = useSearchParams();
  const [search, setSearch] = useState(() => url.get('search') || '');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [range, setRange] = useState<DateRange>({ from: '', to: '' });
  const settled = useDebouncedValue(search);
  const params = dateRangeParams(range);
  params.set('page', String(page));
  params.set('limit', '10');
  params.set('tab', tab);
  if (settled.trim()) params.set('search', settled.trim());
  const query = useApi<Order[]>(`/admin/orders?${params}`);
  const counts = query.data?.statusCounts;
  const total = Object.values(counts || {}).reduce((sum, count) => sum + (count || 0), 0);
  const countFor = (id: string) =>
    id === 'all'
      ? total
      : id === 'processing'
        ? (counts?.awaiting_confirmation || 0) +
          (counts?.confirmed || 0) +
          (counts?.packed || 0)
        : counts?.[id as keyof typeof counts] || 0;
  return (
    <div className="admin-page">
      <header className="admin-page-heading">
        <div>
          <h1>Pesanan</h1>
          <p>Kelola dan pantau semua pesanan pelanggan.</p>
        </div>
        <div className="admin-heading-actions">
          <DateRangeFilter
            value={range}
            onChange={value => {
              setRange(value);
              setPage(1);
            }}
          />
          <button
            className="admin-secondary-button"
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={15} />
            Filter
          </button>
        </div>
      </header>
      <section className="admin-panel admin-list-panel">
        <nav className="admin-status-tabs" aria-label="Filter status pesanan">
          {tabs.map(item => (
            <button
              type="button"
              aria-pressed={tab === item.id}
              className={tab === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setPage(1);
              }}
            >
              {item.label}
              <span>{counts ? countFor(item.id).toLocaleString('id-ID') : '—'}</span>
            </button>
          ))}
        </nav>
        <div className="admin-search-field">
          <Search size={17} />
          <input
            type="search"
            maxLength={100}
            aria-label="Cari pesanan atau pelanggan"
            placeholder="Cari nomor pesanan, nama, atau email pelanggan…"
            value={search}
            onChange={event => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        {filtersOpen && (
          <div className="admin-inline-filters">
            <p>
              {range.from
                ? 'Rentang tanggal aktif. Semua tanggal memakai WIB.'
                : 'Menampilkan semua tanggal pesanan.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setRange({ from: '', to: '' });
                setSearch('');
                setTab('all');
                setPage(1);
              }}
            >
              <X size={14} />
              Reset filter
            </button>
          </div>
        )}
        <div aria-busy={query.isFetching}>
          {query.isLoading ? (
            <LoadingState label="Memuat pesanan…" />
          ) : query.isError ? (
            <ErrorState
              message="Pesanan belum dapat dimuat."
              onRetry={() => void query.refetch()}
            />
          ) : !query.data?.data.length ? (
            <EmptyState
              title="Tidak ada pesanan yang sesuai"
              description="Coba kata pencarian, status, atau periode lain."
            />
          ) : (
            <OrderTable orders={query.data.data} showProduct />
          )}
        </div>
        {!query.isError && (
          <DataPagination
            pagination={query.data?.pagination}
            noun="pesanan"
            disabled={query.isFetching}
            onPage={setPage}
          />
        )}
      </section>
    </div>
  );
}
