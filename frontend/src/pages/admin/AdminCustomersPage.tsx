import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, ReceiptText, Search, SlidersHorizontal, X } from 'lucide-react';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { CustomerSummary } from '@/types/api';
import { formatRupiah } from '@/lib/utils';
import { DataPagination } from '@/components/admin/DataPagination';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

export function AdminCustomersPage() {
  const [url] = useSearchParams();
  const [search, setSearch] = useState(() => url.get('search') || '');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [active, setActive] = useState('');
  const [sort, setSort] = useState('name');
  const settledSearch = useDebouncedValue(search);
  const params = new URLSearchParams({
    page: String(page),
    limit: '5',
    sort,
    ...(settledSearch.trim() ? { search: settledSearch.trim() } : {}),
    ...(active ? { isActive: active } : {}),
  });
  const query = useApi<CustomerSummary[]>(`/admin/customers?${params}`);
  const customers = query.data?.data || [];
  const filtered = Boolean(search || active || sort !== 'name');
  const clear = () => {
    setSearch('');
    setActive('');
    setSort('name');
    setPage(1);
  };

  return (
    <section className="customer-page" aria-labelledby="customers-heading">
      <header className="customer-page-heading">
        <h1 id="customers-heading">Pelanggan</h1>
        <p>Lihat data pelanggan dan riwayat transaksi mereka.</p>
      </header>
      <div className="customer-panel">
        <div className="customer-toolbar">
          <div className="customer-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              aria-label="Cari pelanggan"
              placeholder="Cari nama, email, atau nomor telepon…"
              value={search}
              maxLength={100}
              onChange={event => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            type="button"
            className={`customer-filter-toggle ${filtersOpen ? 'is-selected' : ''}`}
            aria-expanded={filtersOpen}
            aria-controls="customer-filters"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <SlidersHorizontal size={16} /> Filter
            {active && <span className="filter-active-dot" aria-label="Filter aktif" />}
          </button>
        </div>
        {filtersOpen && (
          <div className="customer-filters" id="customer-filters">
            <label>
              Status akun
              <select
                value={active}
                onChange={event => {
                  setActive(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">Semua pelanggan</option>
                <option value="true">Aktif</option>
                <option value="false">Nonaktif</option>
              </select>
            </label>
            <label>
              Urutkan
              <select
                value={sort}
                onChange={event => {
                  setSort(event.target.value);
                  setPage(1);
                }}
              >
                <option value="name">Nama A–Z</option>
                <option value="orders_desc">Pesanan terbanyak</option>
                <option value="spend_desc">Belanja terbesar</option>
                <option value="newest">Pelanggan terbaru</option>
              </select>
            </label>
            {filtered && (
              <button type="button" className="customer-reset" onClick={clear}>
                <X size={14} /> Reset filter
              </button>
            )}
          </div>
        )}
        <div className="customer-results" aria-busy={query.isFetching}>
          {query.isLoading ? (
            <LoadingState label="Memuat data pelanggan…" />
          ) : query.isError ? (
            <ErrorState
              message="Data pelanggan belum dapat dimuat."
              onRetry={() => void query.refetch()}
            />
          ) : !customers.length ? (
            <EmptyState
              title={filtered ? 'Pelanggan tidak ditemukan' : 'Belum ada pelanggan'}
              description={
                filtered
                  ? 'Coba nama, email, atau nomor telepon lain, atau reset filter.'
                  : 'Pelanggan yang mendaftar akan tampil di sini beserta riwayat transaksinya.'
              }
            />
          ) : (
            <>
              <div className="customer-table-wrap">
                <table className="customer-table">
                  <caption className="sr-only">
                    Data pelanggan dan total transaksi
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Nama</th>
                      <th scope="col">Email</th>
                      <th scope="col">No. telepon</th>
                      <th scope="col" className="numeric">
                        Total pesanan
                      </th>
                      <th scope="col" className="numeric">
                        Total belanja
                      </th>
                      <th scope="col" className="action-heading">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map(customer => (
                      <tr key={customer.id}>
                        <td>
                          <Link
                            className="customer-name"
                            to={`/admin/customers/${customer.id}`}
                          >
                            {customer.name}
                          </Link>
                          {!customer.isActive && (
                            <span className="customer-inactive">Nonaktif</span>
                          )}
                        </td>
                        <td className="customer-email">{customer.email}</td>
                        <td className="nowrap">{customer.phone || '—'}</td>
                        <td className="numeric">
                          {customer.totalOrders.toLocaleString('id-ID')}
                        </td>
                        <td className="numeric customer-spend">
                          {formatRupiah(customer.totalSpend)}
                        </td>
                        <td className="customer-row-actions">
                          <Link
                            className="customer-history-link"
                            to={`/admin/customers/${customer.id}`}
                            aria-label={`Lihat transaksi ${customer.name}`}
                            title="Lihat transaksi"
                          >
                            <ReceiptText size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="customer-mobile-list">
                {customers.map(customer => (
                  <Link
                    className="customer-mobile-row"
                    key={customer.id}
                    to={`/admin/customers/${customer.id}`}
                  >
                    <div>
                      <strong>{customer.name}</strong>
                      {!customer.isActive && (
                        <span className="customer-inactive">Nonaktif</span>
                      )}
                      <span>{customer.email}</span>
                      <span>{customer.phone || 'Telepon belum diisi'}</span>
                    </div>
                    <div className="customer-mobile-total">
                      <strong>{formatRupiah(customer.totalSpend)}</strong>
                      <span>{customer.totalOrders} pesanan</span>
                      <span className="customer-mobile-action">
                        Lihat transaksi <ChevronRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
        {!query.isError && (
          <DataPagination
            pagination={query.data?.pagination}
            noun="pelanggan"
            disabled={query.isFetching}
            onPage={setPage}
          />
        )}
      </div>
      <p className="customer-data-note">
        Total pesanan mencakup semua status. Total belanja dihitung dari transaksi yang
        sudah dibayar.
      </p>
    </section>
  );
}
