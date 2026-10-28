import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { ProductPhoto } from '@/components/shared/ProductPhoto';

export function CartPage() {
  const { items, subtotal, updateQuantity, removeItem } = useCartStore();
  const navigate = useNavigate();
  if (!items.length)
    return (
      <div className="page-container">
        <EmptyState
          title="Keranjang masih kosong"
          description="Pilih tas dari katalog untuk mulai berbelanja."
          action="Buka katalog"
          to="/catalog"
        />
      </div>
    );
  return (
    <div className="page-container">
      <div className="page-heading">
        <div>
          <p className="text-[#15616D] text-sm font-semibold">Belanja Anda</p>
          <h1>Keranjang belanja</h1>
        </div>
      </div>
      <div className="checkout-grid">
        <div className="space-y-3">
          {items.map(({ product, quantity }) => (
            <article key={product.id} className="cart-row">
              <div className="cart-thumb">
                <ProductPhoto name={product.name} src={product.imageUrl} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-[#15616D]">
                  {product.category?.name || 'BagDaily'}
                </p>
                <h3 className="truncate font-bold">{product.name}</h3>
                <p className="text-sm font-semibold">{formatRupiah(product.price)}</p>
                <p className="text-xs text-[#6E7E8D]">Stok diketahui: {product.stock}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Kurangi jumlah"
                  onClick={() => updateQuantity(product.id, quantity - 1)}
                >
                  <Minus size={14} />
                </Button>
                <span className="w-6 text-center text-sm">{quantity}</span>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="Tambah jumlah"
                  disabled={quantity >= product.stock}
                  onClick={() => updateQuantity(product.id, quantity + 1)}
                >
                  <Plus size={14} />
                </Button>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="text-rose-600"
                aria-label="Hapus produk"
                onClick={() => removeItem(product.id)}
              >
                <Trash2 size={16} />
              </Button>
            </article>
          ))}
        </div>
        <aside className="summary-card">
          <h2>Ringkasan</h2>
          <div className="summary-line">
            <span>Subtotal</span>
            <strong>{formatRupiah(subtotal())}</strong>
          </div>
          <p className="notice mt-4">
            Ketersediaan produk akan diperiksa kembali saat pembayaran.
          </p>
          <Button
            className="mt-5 w-full"
            variant="teal"
            size="lg"
            onClick={() => navigate('/checkout')}
          >
            Lanjut ke checkout
          </Button>
          <Link className="block text-center text-sm text-[#15616D] mt-4" to="/catalog">
            Lanjut belanja
          </Link>
        </aside>
      </div>
    </div>
  );
}
