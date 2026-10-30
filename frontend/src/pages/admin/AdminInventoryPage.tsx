import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Product, StockMovement } from '@/types/api';
import { generateUUID } from '@/services/apiClient';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate } from '@/lib/utils';

export function AdminInventoryPage() {
  const [url] = useSearchParams();
  const [tab, setTab] = useState<'inventory' | 'lowStock' | 'movements'>(() =>
    url.get('tab') === 'lowStock' ? 'lowStock' : 'inventory',
  );
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [type, setType] = useState<'restock' | 'correction'>('restock');
  const [quantity, setQuantity] = useState<number>(10);
  const [notes, setNotes] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateUUID());

  const inventoryQuery = useApi<Product[]>(
    `/admin/inventory?page=${page}&limit=12`,
    tab === 'inventory',
  );

  const lowStockQuery = useApi<Product[]>(
    `/admin/inventory/low-stock?page=${page}&limit=12`,
    tab === 'lowStock',
  );

  const movementsQuery = useApi<StockMovement[]>(
    `/admin/inventory/movements?page=${page}&limit=15`,
    tab === 'movements',
  );

  const adjustStock = useAction<StockMovement>();

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      await adjustStock.mutateAsync({
        path: '/admin/inventory/adjustments',
        method: 'POST',
        body: {
          productId: selectedProduct.id,
          type,
          quantity: Number(quantity),
          notes,
        },
        key: idempotencyKey,
      });

      toast.success('Penyesuaian stok berhasil disimpan.');
      setSelectedProduct(null);
      setNotes('');
      setIdempotencyKey(generateUUID());
      void inventoryQuery.refetch();
      void lowStockQuery.refetch();
      void movementsQuery.refetch();
    } catch {
      toast.error('Gagal menyesuaikan stok.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#001524]">
            Manajemen Inventaris & Stok
          </h1>
          <p className="text-xs text-[#6E7E8D]">
            Pantau stok riil, peringatan stok menipis, restock, koreksi, dan riwayat
            mutasi stok.
          </p>
        </div>
      </div>

      <div className="flex border-b border-[#001524]/10 text-xs font-bold">
        <button
          type="button"
          onClick={() => {
            setTab('inventory');
            setPage(1);
          }}
          className={`px-4 py-2 border-b-2 transition ${
            tab === 'inventory'
              ? 'border-[#15616D] text-[#15616D]'
              : 'border-transparent text-[#6E7E8D] hover:text-[#001524]'
          }`}
        >
          Semua Stok Produk
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('lowStock');
            setPage(1);
          }}
          className={`px-4 py-2 border-b-2 transition ${
            tab === 'lowStock'
              ? 'border-[#15616D] text-[#15616D]'
              : 'border-transparent text-[#6E7E8D] hover:text-[#001524]'
          }`}
        >
          Peringatan Stok Menipis (≤ Batas Min)
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('movements');
            setPage(1);
          }}
          className={`px-4 py-2 border-b-2 transition ${
            tab === 'movements'
              ? 'border-[#15616D] text-[#15616D]'
              : 'border-transparent text-[#6E7E8D] hover:text-[#001524]'
          }`}
        >
          Riwayat Mutasi Stok
        </button>
      </div>

      {tab === 'inventory' || tab === 'lowStock' ? (
        <div>
          {(tab === 'inventory' ? inventoryQuery : lowStockQuery).isLoading ? (
            <LoadingState label="Memuat inventaris…" />
          ) : (tab === 'inventory' ? inventoryQuery : lowStockQuery).isError ? (
            <ErrorState message="Gagal memuat inventaris." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#001524]/10 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#001524]/10 bg-[#FAF9F6] text-[#001524] font-bold">
                  <tr>
                    <th className="p-3">Produk / SKU</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Stok Saat Ini</th>
                    <th className="p-3">Batas Minimum</th>
                    <th className="p-3">Kondisi</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#001524]/5">
                  {(tab === 'inventory'
                    ? inventoryQuery.data?.data
                    : lowStockQuery.data?.data
                  )?.map(p => (
                    <tr key={p.id} className="hover:bg-[#FAF9F6]/50 transition">
                      <td className="p-3">
                        <p className="font-bold text-[#001524]">{p.name}</p>
                        <p className="text-[10px] text-[#6E7E8D]">{p.sku}</p>
                      </td>
                      <td className="p-3 text-[#15616D]">{p.category?.name || '-'}</td>
                      <td className="p-3 font-extrabold text-sm">{p.stock}</td>
                      <td className="p-3 text-[#6E7E8D]">{p.minimumStock}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.stock <= 0
                              ? 'bg-rose-100 text-rose-800'
                              : p.stock <= p.minimumStock
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock <= 0
                            ? 'Habis'
                            : p.stock <= p.minimumStock
                              ? 'Menipis'
                              : 'Aman'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setSelectedProduct(p);
                            setType('restock');
                            setQuantity(10);
                            setNotes('Restock berkala');
                          }}
                        >
                          Sesuaikan Stok
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div>
          {movementsQuery.isLoading ? (
            <LoadingState label="Memuat riwayat mutasi stok…" />
          ) : movementsQuery.isError ? (
            <ErrorState message="Gagal memuat mutasi." />
          ) : movementsQuery.data?.data.length === 0 ? (
            <EmptyState
              title="Belum Ada Mutasi"
              description="Aktivitas penjualan atau restock akan tercatat di sini."
            />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[#001524]/10 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#001524]/10 bg-[#FAF9F6] text-[#001524] font-bold">
                  <tr>
                    <th className="p-3">Waktu</th>
                    <th className="p-3">Produk</th>
                    <th className="p-3">Jenis</th>
                    <th className="p-3">Perubahan</th>
                    <th className="p-3">Sebelum → Sesudah</th>
                    <th className="p-3">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#001524]/5">
                  {movementsQuery.data?.data.map(m => (
                    <tr key={m.id} className="hover:bg-[#FAF9F6]/50 transition">
                      <td className="p-3 text-[#6E7E8D]">{formatDate(m.createdAt)}</td>
                      <td className="p-3 font-semibold text-[#001524]">
                        {m.productName || m.productId}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            m.type === 'restock'
                              ? 'bg-emerald-100 text-emerald-800'
                              : m.type === 'sale'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="p-3 font-bold">
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                      </td>
                      <td className="p-3 text-[#6E7E8D]">
                        {m.stockBefore} →{' '}
                        <strong className="text-[#001524]">{m.stockAfter}</strong>
                      </td>
                      <td className="p-3 text-[#6E7E8D]">{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal
        title={`Penyesuaian Stok: ${selectedProduct?.name || ''}`}
        open={Boolean(selectedProduct)}
        onOpenChange={open => {
          if (!open) setSelectedProduct(null);
        }}
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-3 text-xs">
          <div className="rounded bg-[#FAF9F6] p-2.5 border border-[#6E7E8D]/20">
            <p>
              Stok saat ini: <strong>{selectedProduct?.stock} unit</strong> (Batas
              minimum: {selectedProduct?.minimumStock})
            </p>
          </div>

          <div>
            <label className="block font-semibold mb-1">Tipe Penyesuaian</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as 'restock' | 'correction')}
              className="w-full rounded border border-[#6E7E8D]/30 p-2 bg-white"
            >
              <option value="restock">Restock (Tambah Stok Positif)</option>
              <option value="correction">Koreksi Stok (Penyesuaian Selisih +/-)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">
              Jumlah Perubahan (
              {type === 'restock' ? 'harus positif' : 'bisa negatif/positif delta'})
            </label>
            <input
              type="number"
              required
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Catatan / Alasan</label>
            <textarea
              rows={2}
              required
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Contoh: Penerimaan supplier / Selisih stock opname"
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#001524]/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedProduct(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={adjustStock.isPending}
            >
              {adjustStock.isPending ? 'Menyimpan…' : 'Simpan Mutasi'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
