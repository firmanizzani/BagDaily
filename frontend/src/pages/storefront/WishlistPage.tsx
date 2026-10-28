import { Link } from 'react-router-dom';
import { Heart, ArrowRight } from 'lucide-react';
import { useApi } from '@/hooks/api';
import type { Product } from '@/types/api';
import { useWishlist } from '@/stores/wishlistStore';
import { ProductCard } from '@/components/storefront/ProductCard';
import { LoadingState, ErrorState } from '@/components/shared/states';
export function WishlistPage() {
  const ids = useWishlist(s => s.ids);
  const products = useApi<Product[]>('/products?limit=100');
  const saved = products.data?.data.filter(p => ids.includes(p.id)) || [];
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <h1>Tas favoritmu.</h1>
          <p className="muted">Simpan sekarang, temukan lagi kapan saja.</p>
        </div>
        <span>{saved.length} produk disimpan</span>
      </div>
      {products.isLoading ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState onRetry={() => void products.refetch()} />
      ) : saved.length ? (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {saved.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="wishlist-empty">
          <Heart size={44} strokeWidth={1} />
          <h2>Teman perjalananmu menunggu.</h2>
          <p>Ketuk ikon hati pada produk untuk menyimpannya di sini.</p>
          <Link className="shop-button" to="/catalog">
            Jelajahi koleksi <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
