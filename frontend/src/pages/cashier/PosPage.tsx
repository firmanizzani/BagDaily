import { useState } from 'react';
import { Minus, Plus, RefreshCw, Search, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import type { Order, Product } from '@/types/api';
import { generateUUID } from '@/services/apiClient';
import { usePosStore } from '@/features/pos/posStore';
import { useCreatePosTransaction } from '@/features/pos/usePos';
import { PosReceipt } from '@/components/cashier/PosReceipt';
import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';

export function PosPage() {
  const [search, setSearch] = useState('');
  const settledSearch = useDebouncedValue(search);
  const [category, setCategory] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  const {
    items,
    cashReceived,
    addItem,
    updateQuantity,
    removeItem,
    setCashReceived,
    resetSale,
    subtotal,
    changeAmount,
  } = usePosStore();

  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateUUID());

  const queryParams = new URLSearchParams({
    limit: '50',
    availability: 'in_stock',
    ...(settledSearch ? { search: settledSearch } : {}),
    ...(category ? { category } : {}),
  });

  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useApi<Product[]>(`/products?${queryParams.toString()}`);

  const createPosTransaction = useCreatePosTransaction();

  const products = productsData?.data || [];
  const currentSubtotal = subtotal();
  const currentChange = changeAmount();
  const isCashSufficient = cashReceived >= currentSubtotal && currentSubtotal > 0;

  const handleCheckout = async () => {
    if (!isCashSufficient) {
      toast.error('Uang tunai yang diterima belum mencukupi total belanja.');
      return;
    }

    try {
      const payload = {
        items: items.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
        cashReceived,
      };

      const res = await createPosTransaction.mutateAsync({
        body: payload,
        key: idempotencyKey,
      });

      toast.success(`Transaksi ${res.data.orderNumber} berhasil dicatat.`);
      setCompletedOrder(res.data);
      resetSale();
      setIdempotencyKey(generateUUID());
      void refetch();
    } catch {
      return;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div className="pos-heading no-print">
        <div>
          <h1>Kasir</h1>
          <p>Pilih produk dan layani pelanggan dengan cepat.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          <RefreshCw size={14} /> Sinkronkan stok
        </Button>
      </div>
      <div className="pos-layout no-print">
        <section className="pos-catalog">
          <div className="flex gap-3">
            <label className="search-field">
              <Search size={17} />
              <input
                aria-label="Cari produk kasir"
                placeholder="Cari nama produk…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </label>
          </div>
          <div className="pos-category-tabs">
            {[
              { value: '', label: 'Semua' },
              { value: 'tas-ransel', label: 'Ransel' },
              { value: 'tas-selempang', label: 'Selempang' },
              { value: 'totebag', label: 'Totebag' },
            ].map(c => (
              <button
                aria-pressed={category === c.value}
                className={category === c.value ? 'active' : ''}
                key={c.value}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </button>
            ))}
          </div>
          {isLoading ? (
            <LoadingState label="Memuat produk…" />
          ) : isError ? (
            <ErrorState message="Produk belum dapat dimuat." onRetry={refetch} />
          ) : products.length === 0 ? (
            <div className="pos-empty">
              <Search size={30} />
              <p>Tidak ada produk yang cocok. Coba nama lain.</p>
            </div>
          ) : (
            <div className="pos-products">
              {products.map(p => (
                <button
                  key={p.id}
                  className="pos-product"
                  aria-label={`Tambah ${p.name} ke transaksi`}
                  disabled={
                    p.stock <= 0 ||
                    (items.find(i => i.product.id === p.id)?.quantity || 0) >= p.stock
                  }
                  onClick={() => addItem(p, 1)}
                >
                  <ProductPhoto name={p.name} src={p.imageUrl} />
                  <h3>{p.name}</h3>
                  <strong>{formatRupiah(p.price)}</strong>
                  <small>Stok: {p.stock}</small>
                  <span className="pos-add">
                    <Plus size={16} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="pos-cart">
          <div className="pos-cart-header">
            <h2>Keranjang transaksi</h2>
            <button className="pos-clear" onClick={resetSale} disabled={!items.length}>
              <Trash2 size={14} /> Hapus semua
            </button>
          </div>
          {!items.length ? (
            <div className="pos-empty">
              <ShoppingCart size={40} strokeWidth={1} />
              <p>
                Siap melayani pelanggan berikutnya.
                <br />
                Pilih produk untuk memulai transaksi.
              </p>
            </div>
          ) : (
            <div className="pos-items">
              {items.map(item => (
                <div className="pos-item" key={item.product.id}>
                  <ProductPhoto name={item.product.name} src={item.product.imageUrl} />
                  <div className="pos-item-info">
                    <strong>{item.product.name}</strong>
                    <p>{formatRupiah(item.product.price)}</p>
                  </div>
                  <div className="pos-quantity">
                    <button
                      aria-label={`Kurangi ${item.product.name}`}
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      <Minus size={12} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label={`Tambah ${item.product.name}`}
                      disabled={item.quantity >= item.product.stock}
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className="pos-item-total">
                    {formatRupiah(item.product.price * item.quantity)}
                  </span>
                  <button
                    className="text-[#637d7c] p-1"
                    aria-label={`Hapus ${item.product.name}`}
                    onClick={() => removeItem(item.product.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="pos-payment">
            <div className="flex justify-between text-xs text-[#667c79]">
              <span>Subtotal ({items.reduce((n, i) => n + i.quantity, 0)} produk)</span>
              <span>{formatRupiah(currentSubtotal)}</span>
            </div>
            <div className="pos-total">
              <span>Total pembayaran</span>
              <strong>{formatRupiah(currentSubtotal)}</strong>
            </div>
            <label className="field">
              Uang tunai diterima (Rp)
              <input
                type="number"
                min={0}
                step={1000}
                value={cashReceived || ''}
                onChange={e => setCashReceived(Number(e.target.value))}
                placeholder="Masukkan nominal pembayaran"
              />
            </label>
            <div className="cash-shortcuts">
              {[
                ...new Set([
                  currentSubtotal,
                  Math.ceil(currentSubtotal / 50000) * 50000,
                  Math.ceil(currentSubtotal / 100000) * 100000,
                ]),
              ]
                .filter(n => n > 0)
                .map(n => (
                  <button key={n} onClick={() => setCashReceived(n)}>
                    {n === currentSubtotal ? 'Uang pas' : formatRupiah(n)}
                  </button>
                ))}
            </div>
            <div className="flex justify-between text-xs py-2">
              <span>Kembalian</span>
              <strong>{formatRupiah(currentChange)}</strong>
            </div>
            <Button
              variant="teal"
              size="lg"
              className="w-full"
              disabled={!isCashSufficient || createPosTransaction.isPending}
              onClick={handleCheckout}
            >
              {createPosTransaction.isPending
                ? 'Memproses pembayaran…'
                : 'Proses pembayaran'}
            </Button>
            <p className="text-center text-[10px] text-[#788a82]">
              Pembayaran tunai · Struk tersedia setelah transaksi
            </p>
          </div>
        </section>
      </div>
      {completedOrder && (
        <section className="panel mt-6">
          <div className="flex justify-between gap-4 no-print">
            <div>
              <h2>Transaksi berhasil</h2>
              <p className="muted">
                {completedOrder.orderNumber} · Stok telah diperbarui.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handlePrint}>Cetak struk</Button>
              <Button variant="outline" onClick={() => setCompletedOrder(null)}>
                Transaksi baru
              </Button>
            </div>
          </div>
          <PosReceipt order={completedOrder} />
        </section>
      )}
    </div>
  );
}
