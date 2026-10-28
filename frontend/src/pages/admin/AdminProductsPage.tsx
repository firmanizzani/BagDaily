import { useState } from 'react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { Category, Product } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';

interface ProductFormState {
  categoryId: string;
  sku: string;
  name: string;
  slug: string;
  description: string;
  material: string;
  price: number;
  stock?: number;
  minimumStock: number;
  isActive: boolean;
}

const emptyForm: ProductFormState = {
  categoryId: '',
  sku: '',
  name: '',
  slug: '',
  description: '',
  material: '',
  price: 0,
  stock: 0,
  minimumStock: 5,
  isActive: true,
};

export function AdminProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const settledSearch = useDebouncedValue(search);
  const [category, setCategory] = useState('');
  const [active, setActive] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [imageModal, setImageModal] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormState>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '12',
    ...(settledSearch ? { search: settledSearch } : {}),
    ...(category ? { category } : {}),
    ...(active ? { isActive: active } : {}),
  });

  const {
    data: productsData,
    isLoading,
    isError,
    refetch,
  } = useApi<Product[]>(`/admin/products?${queryParams.toString()}`);

  const { data: categoriesData } = useApi<Category[]>('/categories');

  const createProduct = useAction<Product>();
  const updateProduct = useAction<Product>();
  const uploadImage = useAction<Product>();
  const removeImage = useAction<Product>();

  const products = productsData?.data || [];
  const categories = categoriesData?.data || [];
  const pagination = productsData?.pagination;

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData({
      ...emptyForm,
      categoryId: categories[0]?.id || '',
    });
    setIsOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditing(p);
    setFormData({
      categoryId: p.categoryId,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      description: p.description,
      material: p.material,
      price: p.price,
      minimumStock: p.minimumStock,
      isActive: p.isActive,
    });
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast.error('Pilih kategori produk.');
      return;
    }

    try {
      if (editing) {
        await updateProduct.mutateAsync({
          path: `/admin/products/${editing.id}`,
          method: 'PATCH',
          body: {
            categoryId: formData.categoryId,
            sku: formData.sku,
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            material: formData.material,
            price: Number(formData.price),
            minimumStock: Number(formData.minimumStock),
            isActive: formData.isActive,
          },
        });
        toast.success('Produk berhasil diperbarui.');
      } else {
        await createProduct.mutateAsync({
          path: '/admin/products',
          method: 'POST',
          body: {
            ...formData,
            price: Number(formData.price),
            stock: Number(formData.stock || 0),
            minimumStock: Number(formData.minimumStock),
          },
        });
        toast.success('Produk baru berhasil ditambahkan.');
      }
      setIsOpen(false);
      void refetch();
    } catch {
      toast.error('Gagal menyimpan data produk. Periksa kembali form.');
    }
  };

  const handleToggleStatus = async (product: Product) => {
    if (!window.confirm(`${product.isActive ? 'Nonaktifkan' : 'Aktifkan'} produk ini?`))
      return;
    try {
      await updateProduct.mutateAsync({
        path: `/admin/products/${product.id}`,
        method: 'PATCH',
        body: { isActive: !product.isActive },
      });
      toast.success('Status produk diperbarui.');
      void refetch();
    } catch {
      toast.error('Gagal memperbarui status produk.');
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageModal || !imageFile) return;

    try {
      const data = new FormData();
      data.append('image', imageFile);

      await uploadImage.mutateAsync({
        path: `/admin/products/${imageModal.id}/image`,
        method: 'POST',
        body: data,
      });

      toast.success('Foto produk berhasil diunggah.');
      setImageModal(null);
      setImageFile(null);
      void refetch();
    } catch {
      toast.error('Gagal mengunggah gambar. Pastikan format JPEG/PNG/WebP maks 3MB.');
    }
  };

  const handleDeleteImage = async () => {
    if (!imageModal) return;
    if (!window.confirm('Hapus foto produk ini?')) return;

    try {
      await removeImage.mutateAsync({
        path: `/admin/products/${imageModal.id}/image`,
        method: 'DELETE',
      });
      toast.success('Foto produk telah dihapus.');
      setImageModal(null);
      void refetch();
    } catch {
      toast.error('Gagal menghapus gambar.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#001524]">Produk</h1>
          <p className="text-xs text-[#6E7E8D]">
            Kelola koleksi, harga, foto, dan ketersediaan produk Anda.
          </p>
        </div>
        <Button size="sm" variant="teal" onClick={handleOpenCreate}>
          + Tambah Produk Baru
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Cari produk…"
          aria-label="Cari produk admin"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[#6E7E8D]/30 px-3 py-1.5 text-xs bg-white w-64"
        />
        <select
          aria-label="Filter kategori produk"
          value={category}
          onChange={e => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua kategori</option>
          {categories.map(c => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter status produk"
          value={active}
          onChange={e => {
            setActive(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat produk admin…" />
      ) : isError ? (
        <ErrorState message="Gagal memuat produk." onRetry={refetch} />
      ) : products.length === 0 ? (
        <EmptyState
          title="Tidak ada produk"
          description="Tambahkan produk baru ke dalam katalog."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#001524]/10 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#001524]/10 bg-[#FAF9F6] text-[#001524] font-bold">
              <tr>
                <th className="p-3">Foto</th>
                <th className="p-3">Nama Produk / SKU</th>
                <th className="p-3">Kategori</th>
                <th className="p-3">Harga</th>
                <th className="p-3">Stok Riil</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001524]/5">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-[#FAF9F6]/50 transition">
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => {
                        setImageModal(p);
                        setImageFile(null);
                      }}
                      className="h-10 w-10 rounded border border-[#6E7E8D]/20 overflow-hidden flex items-center justify-center bg-[#FAF9F6] hover:border-[#15616D]"
                    >
                      <ProductPhoto name={p.name} src={p.imageUrl} />
                    </button>
                  </td>
                  <td className="p-3">
                    <p className="font-bold text-[#001524]">{p.name}</p>
                    <p className="text-[10px] text-[#6E7E8D]">{p.sku}</p>
                  </td>
                  <td className="p-3 text-[#15616D] font-medium">
                    {p.category?.name || '-'}
                  </td>
                  <td className="p-3 font-semibold text-[#001524]">
                    {formatRupiah(p.price)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        p.stock <= p.minimumStock
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-[#FFECD1] text-[#001524]'
                      }`}
                    >
                      {p.stock} (Min {p.minimumStock})
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        p.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleOpenEdit(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => handleToggleStatus(p)}
                    >
                      {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between pt-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Sebelumnya
          </Button>
          <span className="text-xs text-[#6E7E8D]">
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Selanjutnya
          </Button>
        </div>
      ) : null}

      <Modal
        title={editing ? 'Edit Data Produk' : 'Tambah Produk Baru'}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nama Produk</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded border border-[#6E7E8D]/30 p-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">SKU</label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                className="w-full rounded border border-[#6E7E8D]/30 p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Kategori</label>
              <select
                required
                value={formData.categoryId}
                onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full rounded border border-[#6E7E8D]/30 p-2 bg-white"
              >
                <option value="">Pilih Kategori</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Slug URL</label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={e => setFormData({ ...formData, slug: e.target.value })}
                className="w-full rounded border border-[#6E7E8D]/30 p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Harga (IDR)</label>
              <input
                type="number"
                min={0}
                required
                value={formData.price}
                onChange={e =>
                  setFormData({ ...formData, price: Number(e.target.value) })
                }
                className="w-full rounded border border-[#6E7E8D]/30 p-2"
              />
            </div>
            {!editing ? (
              <div>
                <label className="block font-semibold mb-1">Stok Awal</label>
                <input
                  type="number"
                  min={0}
                  value={formData.stock || 0}
                  onChange={e =>
                    setFormData({ ...formData, stock: Number(e.target.value) })
                  }
                  className="w-full rounded border border-[#6E7E8D]/30 p-2"
                />
              </div>
            ) : null}
            <div>
              <label className="block font-semibold mb-1">Batas Minimum Stok</label>
              <input
                type="number"
                min={1}
                required
                value={formData.minimumStock}
                onChange={e =>
                  setFormData({ ...formData, minimumStock: Number(e.target.value) })
                }
                className="w-full rounded border border-[#6E7E8D]/30 p-2"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-1">Bahan</label>
            <input
              type="text"
              required
              value={formData.material}
              onChange={e => setFormData({ ...formData, material: e.target.value })}
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Deskripsi Produk</label>
            <textarea
              rows={3}
              required
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
            />
            <label htmlFor="isActive" className="font-semibold cursor-pointer">
              Produk Aktif untuk Dijual
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#001524]/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Batal
            </Button>
            <Button type="submit" variant="teal" size="sm">
              Simpan Produk
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Kelola Foto: ${imageModal?.name || ''}`}
        open={Boolean(imageModal)}
        onOpenChange={open => {
          if (!open) setImageModal(null);
        }}
      >
        <div className="space-y-4 text-xs">
          {imageModal?.imageUrl ? (
            <div className="space-y-2">
              <p className="font-semibold">Foto Saat Ini:</p>
              <div className="aspect-video w-full rounded border border-[#6E7E8D]/20 overflow-hidden bg-[#FAF9F6] flex items-center justify-center">
                <img
                  src={imageModal.imageUrl}
                  alt={imageModal.name}
                  className="max-h-48 object-contain"
                />
              </div>
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleDeleteImage}
              >
                Hapus Foto Ini
              </Button>
            </div>
          ) : (
            <p className="text-[#6E7E8D]">Belum ada foto yang diunggah ke storage.</p>
          )}

          <form
            onSubmit={handleUploadImage}
            className="border-t border-[#001524]/10 pt-3 space-y-3"
          >
            <label className="block font-semibold">
              {imageModal?.imageUrl ? 'Ganti dengan File Baru' : 'Unggah File Foto Baru'}
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              onChange={e => setImageFile(e.target.files?.[0] || null)}
              className="w-full text-xs"
            />
            <p className="text-[10px] text-[#6E7E8D]">
              Format JPEG, PNG, WebP. Maks 3 MB.
            </p>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              className="w-full"
              disabled={!imageFile || uploadImage.isPending}
            >
              {uploadImage.isPending ? 'Mengunggah…' : 'Simpan ke Supabase'}
            </Button>
          </form>
        </div>
      </Modal>
    </div>
  );
}
