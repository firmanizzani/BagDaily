import { Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/types/api';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { formatRupiah } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { useWishlist } from '@/stores/wishlistStore';
import { useShopLogin } from '@/hooks/useShopLogin';
export function ProductCard({ product }: { product: Product }) {
  const add = useCartStore(s => s.addItem);
  const { ids, toggle } = useWishlist();
  const requireLogin = useShopLogin();
  const navigate = useNavigate();
  const saved = ids.includes(product.id);

  async function handleAddToCart() {
    if (!(await requireLogin('keranjang'))) return;
    const existing = useCartStore
      .getState()
      .items.find(i => i.product.id === product.id);
    if ((existing?.quantity || 0) >= product.stock) {
      toast.info('Jumlah di keranjang sudah mencapai stok tersedia.');
      return;
    }
    add(product, 1);
    toast.success(`${product.name} ditambahkan ke keranjang`);
  }
  return (
    <article className="shop-product">
      <div className="shop-product-visual">
        <Link to={`/product/${product.slug || product.id}`}>
          <ProductPhoto name={product.name} src={product.imageUrl} />
        </Link>
        <button
          className={`wish-button ${saved ? 'saved' : ''}`}
          aria-label={`${saved ? 'Hapus' : 'Simpan'} ${product.name} ${saved ? 'dari' : 'ke'} favorit`}
          aria-pressed={saved}
          onClick={async () => {
            if (await requireLogin('favorit')) toggle(product.id);
          }}
        >
          <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
        </button>
        {product.stock <= product.minimumStock && (
          <span className="stock-label">
            {product.stock ? 'Stok terbatas' : 'Stok habis'}
          </span>
        )}
      </div>
      <div className="shop-product-info">
        <Link to={`/product/${product.slug || product.id}`}>
          <h3>{product.name}</h3>
        </Link>
        <p>{product.category?.name || product.material}</p>
        <div className="product-stock">
          <span className="stock-dot" />
          {product.stock > 0 ? 'Siap dikirim' : 'Belum tersedia'}
          <span>· {product.stock} tersedia</span>
        </div>
        <strong>{formatRupiah(product.price)}</strong>
        <div className="product-actions">
          <button
            className="buy-now-btn"
            disabled={product.stock <= 0}
            onClick={async () => {
              await handleAddToCart();
              navigate('/cart');
            }}
          >
            Beli Sekarang
          </button>
          <button
            className="add-to-cart-icon"
            disabled={product.stock <= 0}
            onClick={handleAddToCart}
            aria-label="Tambah ke keranjang"
          >
            <ShoppingCart size={16} />
          </button>
        </div>
      </div>
    </article>
  );
}
