import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Product } from '@/types/api';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { LoadingState, ErrorState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';
export function CashierProductsPage() {
  const [search, setSearch] = useState('');
  const settledSearch = useDebouncedValue(search);
  const products = useApi<Product[]>(
    `/products?limit=100&search=${encodeURIComponent(settledSearch)}`,
  );
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Produk</h1>
          <p className="muted">Cek koleksi dan ketersediaan stok toko.</p>
        </div>
      </div>
      <label className="search-field block mb-6">
        <Search size={18} />
        <input
          placeholder="Cari nama produk…"
          aria-label="Cari produk"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </label>
      {products.isLoading ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState onRetry={() => void products.refetch()} />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok tersedia</th>
              </tr>
            </thead>
            <tbody>
              {products.data?.data.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="table-product">
                      <ProductPhoto name={p.name} src={p.imageUrl} />
                      <div>
                        <strong>{p.name}</strong>
                        <small>{p.sku}</small>
                      </div>
                    </div>
                  </td>
                  <td>{p.category?.name}</td>
                  <td>{formatRupiah(p.price)}</td>
                  <td>{p.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.data?.data.length === 0 && (
            <p className="muted p-4">Tidak ada produk yang cocok.</p>
          )}
        </div>
      )}
    </div>
  );
}
