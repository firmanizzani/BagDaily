import { useState } from 'react';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export interface PosCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}

export function PosCustomerPicker({
  mode,
  value,
  onModeChange,
  onChange,
  disabled,
}: {
  mode: 'general' | 'registered';
  value: PosCustomer | null;
  onModeChange: (mode: 'general' | 'registered') => void;
  onChange: (customer: PosCustomer | null) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState('');
  const settled = useDebouncedValue(search.trim());
  const enabled = mode === 'registered' && !value && settled.length >= 2;
  const query = useApi<PosCustomer[]>(
    `/cashier/customers?${new URLSearchParams({ search: settled })}`,
    enabled,
  );
  return (
    <fieldset className="pos-customer-picker" disabled={disabled}>
      <legend>Pelanggan</legend>
      <div className="pos-customer-options">
        <label>
          <input
            type="radio"
            name="pos-customer"
            checked={mode === 'general'}
            onChange={() => {
              onModeChange('general');
              onChange(null);
              setSearch('');
            }}
          />{' '}
          Pelanggan umum
        </label>
        <label>
          <input
            type="radio"
            name="pos-customer"
            checked={mode === 'registered'}
            onChange={() => onModeChange('registered')}
          />{' '}
          Pilih pelanggan
        </label>
      </div>
      {mode === 'general' ? (
        <p>Tanpa akun. Transaksi tetap tercatat di laporan toko.</p>
      ) : value ? (
        <div className="pos-customer-selected">
          <div>
            <strong>{value.name}</strong>
            <span>{value.email}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSearch('');
            }}
          >
            Ganti pelanggan
          </button>
        </div>
      ) : (
        <div className="pos-customer-search">
          <label>
            Cari pelanggan terdaftar
            <input
              type="search"
              value={search}
              maxLength={100}
              placeholder="Nama, email, atau nomor telepon"
              onChange={event => setSearch(event.target.value)}
            />
          </label>
          <div role="status" aria-live="polite">
            {settled.length < 2 ? (
              <p>
                Ketik minimal 2 karakter. Hanya akun pelanggan aktif yang dapat dipilih.
              </p>
            ) : search.trim() !== settled || query.isFetching ? (
              <p>Mencari pelanggan…</p>
            ) : query.isError ? (
              <p>
                Pencarian gagal.{' '}
                <button type="button" onClick={() => void query.refetch()}>
                  Coba lagi
                </button>
              </p>
            ) : !query.data?.data.length ? (
              <p>Pelanggan tidak ditemukan. Coba kata lain atau pilih Pelanggan umum.</p>
            ) : null}
          </div>
          {enabled &&
            search.trim() === settled &&
            !query.isFetching &&
            !query.isError && (
              <ul aria-label="Hasil pencarian pelanggan">
                {query.data?.data.map(customer => (
                  <li key={customer.id}>
                    <button type="button" onClick={() => onChange(customer)}>
                      <strong>{customer.name}</strong>
                      <span>
                        {customer.email}
                        {customer.phone ? ` · ${customer.phone}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </div>
      )}
    </fieldset>
  );
}
