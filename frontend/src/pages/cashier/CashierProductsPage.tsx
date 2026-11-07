import { useState } from 'react';
import { Search } from 'lucide-react';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Category, Product } from '@/types/api';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { LoadingState, ErrorState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';
export function CashierProductsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const settledSearch = useDebouncedValue(search);
  const categories = useApi<Category[]>('/categories');
  const params = new URLSearchParams({
    limit: '100',
    search: settledSearch,
    ...(category ? { category } : {}),
  });
  const products = useApi<Product[]>(`/products?${params}`);
  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Produk</h1>
          <p className="muted">Cek koleksi dan ketersediaan stok toko.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            placeholder="Cari nama produk…"
            aria-label="Cari produk"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </label>
        <div className="field">
          <select
            aria-label="Filter kategori produk"
            value={category}
            onChange={event => setCategory(event.target.value)}
          >
            <option value="">Semua kategori</option>
            {categories.data?.data.map(item => (
              <option key={item.id} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
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
