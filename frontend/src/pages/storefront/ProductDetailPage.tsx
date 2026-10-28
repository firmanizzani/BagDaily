import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/api';
import type { Product } from '@/types/api';
import { ProductCard } from '@/components/storefront/ProductCard';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';

export function ProductDetailPage() {
  const { id } = useParams();
  const product = useApi<Product>(`/products/${id}`);
  const [quantity, setQuantity] = useState(1);
  const add = useCartStore(state => state.addItem);
  const related = useApi<Product[]>(
    `/products?category=${product.data?.data.categoryId || ''}&limit=5`,
    Boolean(product.data),
  );
  if (product.isLoading) return <LoadingState />;
  if (product.isError || !product.data)
    return (
      <ErrorState
        message="Produk tidak tersedia."
        onRetry={() => void product.refetch()}
      />
    );
  const item = product.data.data;
  return (
    <div className="page-container">
      <Link to="/catalog" className="text-sm text-[#15616D]">
        Katalog / {item.category?.name || 'Tas'} / {item.name}
      </Link>
      <div className="detail-grid mt-7">
        <div className="product-photo">
          <ProductPhoto name={item.name} src={item.imageUrl} />
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-[#15616D] text-sm">
              {item.category?.name} · {item.sku}
            </p>
            <h1 className="mt-2">{item.name}</h1>
            <p className="text-2xl font-bold mt-4">{formatRupiah(item.price)}</p>
          </div>
          <p className="muted leading-relaxed">{item.description}</p>
          <dl className="spec-list">
            <div>
              <dt>Bahan</dt>
              <dd>{item.material}</dd>
            </div>
            <div>
              <dt>Ukuran</dt>
              <dd>All Size</dd>
            </div>
            <div>
              <dt>Ketersediaan</dt>
              <dd>{item.stock > 0 ? `${item.stock} tersedia` : 'Stok habis'}</dd>
            </div>
          </dl>
          <label className="field">
            Jumlah
            <input
              type="number"
              min={1}
              max={item.stock || 1}
              value={quantity}
              onChange={event =>
                setQuantity(
                  Math.max(1, Math.min(item.stock || 1, Number(event.target.value))),
                )
              }
            />
          </label>
          <Button
            variant="teal"
            size="lg"
            className="w-full"
            disabled={!item.stock}
            onClick={() => {
              add(item, quantity);
              toast.success('Produk ditambahkan ke keranjang');
            }}
          >
            <ShoppingBag size={18} /> Tambah ke keranjang
          </Button>
          <p className="notice">
            Keranjang tidak mereservasi stok. Ketersediaan diperiksa kembali saat
            pembayaran.
          </p>
        </div>
      </div>
      <section className="mt-16">
        <h2 className="mb-6">Pilihan dalam kategori ini</h2>
        {related.isError ? (
          <ErrorState onRetry={() => void related.refetch()} />
        ) : (
          <div className="product-grid">
            {related.data?.data
              .filter(value => value.id !== item.id)
              .slice(0, 4)
              .map(value => (
                <ProductCard key={value.id} product={value} />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
