import { useState } from 'react';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Category } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

export function AdminCategoriesPage() {
  const [editing, setEditing] = useState<Category | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const {
    data: categoriesData,
    isLoading,
    isError,
    refetch,
  } = useApi<Category[]>('/categories');
  const createCategory = useAction<Category>();
  const updateCategory = useAction<Category>();
  const deleteCategory = useAction<{ success: boolean }>();

  const categories = categoriesData?.data || [];

  const handleOpenCreate = () => {
    setEditing(null);
    setName('');
    setSlug('');
    setIsOpen(true);
  };

  const handleOpenEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setSlug(c.slug);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCategory.mutateAsync({
          path: `/admin/categories/${editing.id}`,
          method: 'PATCH',
          body: { name, slug },
        });
        toast.success('Kategori berhasil diubah.');
      } else {
        await createCategory.mutateAsync({
          path: '/admin/categories',
          method: 'POST',
          body: { name, slug },
        });
        toast.success('Kategori baru ditambahkan.');
      }
      setIsOpen(false);
      void refetch();
    } catch {
      toast.error('Gagal menyimpan kategori.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kategori ini? (Hanya bisa jika tidak ada produk terkait)'))
      return;
    try {
      await deleteCategory.mutateAsync({
        path: `/admin/categories/${id}`,
        method: 'DELETE',
      });
      toast.success('Kategori berhasil dihapus.');
      void refetch();
    } catch {
      toast.error('Tidak dapat menghapus kategori yang masih memiliki produk.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#001524]">Kategori Produk</h1>
          <p className="text-xs text-[#6E7E8D]">
            Kelola pengelompokan tas (Tas Selempang, Tas Ransel, Totebag).
          </p>
        </div>
        <Button size="sm" variant="teal" onClick={handleOpenCreate}>
          + Tambah Kategori
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat kategori…" />
      ) : isError ? (
        <ErrorState message="Gagal memuat kategori." onRetry={refetch} />
      ) : categories.length === 0 ? (
        <EmptyState
          title="Belum Ada Kategori"
          description="Buat kategori pertama Anda."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#001524]/10 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#001524]/10 bg-[#FAF9F6] text-[#001524] font-bold">
              <tr>
                <th className="p-3">Nama Kategori</th>
                <th className="p-3">Slug URL</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001524]/5">
              {categories.map(c => (
                <tr key={c.id} className="hover:bg-[#FAF9F6]/50 transition">
                  <td className="p-3 font-bold text-[#001524]">{c.name}</td>
                  <td className="p-3 text-[#6E7E8D] font-mono">{c.slug}</td>
                  <td className="p-3 text-right space-x-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleOpenEdit(c)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                      onClick={() => handleDelete(c.id)}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title={editing ? 'Edit Kategori' : 'Tambah Kategori'}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <form onSubmit={handleSave} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Kategori</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
              placeholder="Contoh: Tas Selempang"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Slug URL</label>
            <input
              type="text"
              required
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className="w-full rounded border border-[#6E7E8D]/30 p-2 font-mono"
              placeholder="tas-selempang"
            />
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
              Simpan
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
