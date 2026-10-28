import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Category, Product } from '@/types/api';
import { ProductCard } from '@/components/storefront/ProductCard';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const search = useDebouncedValue(params.get('search') || '');
  const query = new URLSearchParams(params);
  if (search) query.set('search', search);
  else query.delete('search');
  query.set('limit', '12');
  const products = useApi<Product[]>(`/products?${query}`);
  const categories = useApi<Category[]>('/categories');
  const change = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== 'page') next.set('page', '1');
    setParams(next);
  };

  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <p className="text-[#15616D] text-sm font-semibold">Koleksi BagDaily</p>
          <h1>Tas untuk setiap rencana.</h1>
          <p className="muted">Cari bentuk, bahan, dan harga yang pas untuk harimu.</p>
        </div>
        <span className="badge">{products.data?.pagination?.total ?? '—'} produk</span>
      </div>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Cari produk"
            placeholder="Cari nama tas…"
            value={params.get('search') || ''}
            onChange={event => change('search', event.target.value)}
          />
        </label>
        <select
          aria-label="Kategori"
          value={params.get('category') || ''}
          onChange={event => change('category', event.target.value)}
        >
          <option value="">Semua kategori</option>
          {categories.data?.data.map(category => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Ketersediaan"
          value={params.get('availability') || 'all'}
          onChange={event => change('availability', event.target.value)}
        >
          <option value="all">Semua stok</option>
          <option value="in_stock">Tersedia</option>
          <option value="out_of_stock">Stok habis</option>
        </select>
        <select
          aria-label="Urutkan produk"
          value={params.get('sort') || 'newest'}
          onChange={event => change('sort', event.target.value)}
        >
          <option value="newest">Terbaru</option>
          <option value="price_asc">Harga terendah</option>
          <option value="price_desc">Harga tertinggi</option>
          <option value="name">Nama A–Z</option>
        </select>
        <Button variant="ghost" onClick={() => setParams({})}>
          Reset
        </Button>
      </div>
      {products.isLoading ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState
          message="Katalog belum dapat dihubungi. Coba lagi nanti."
          onRetry={() => void products.refetch()}
        />
      ) : !products.data?.data.length ? (
        <EmptyState
          title="Produk tidak ditemukan"
          description="Coba kata kunci atau kategori lain."
        />
      ) : (
        <>
          <div className="product-grid">
            {products.data.data.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="pagination">
            <Button
              variant="outline"
              disabled={Number(params.get('page') || 1) <= 1}
              onClick={() => change('page', String(Number(params.get('page') || 1) - 1))}
            >
              Sebelumnya
            </Button>
            <span>
              Halaman {params.get('page') || 1} /{' '}
              {products.data.pagination?.totalPages || 1}
            </span>
            <Button
              variant="outline"
              disabled={
                Number(params.get('page') || 1) >=
                (products.data.pagination?.totalPages || 1)
              }
              onClick={() => change('page', String(Number(params.get('page') || 1) + 1))}
            >
              Berikutnya
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
