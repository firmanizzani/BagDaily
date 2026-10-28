import { useState } from 'react';
import type { Category } from '@/types/api';
import { Button } from '@/components/ui/button';

export interface AdminProductFormValues {
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

export interface AdminProductFormProps {
  initialValues: AdminProductFormValues;
  categories: Category[];
  isEditing: boolean;
  isLoading?: boolean;
  onSubmit: (values: AdminProductFormValues) => Promise<void>;
  onCancel: () => void;
}

export function AdminProductForm({
  initialValues,
  categories,
  isEditing,
  isLoading = false,
  onSubmit,
  onCancel,
}: AdminProductFormProps) {
  const [formData, setFormData] = useState<AdminProductFormValues>(initialValues);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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

      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <label className="block font-semibold mb-1">Kategori</label>
          <select
            value={formData.categoryId}
            onChange={e => setFormData({ ...formData, categoryId: e.target.value })}
            className="w-full rounded border border-[#6E7E8D]/30 p-2 bg-white"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-semibold mb-1">Harga (Rp)</label>
          <input
            type="number"
            required
            min={0}
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full rounded border border-[#6E7E8D]/30 p-2"
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Batas Minimum Stok</label>
          <input
            type="number"
            required
            min={0}
            value={formData.minimumStock}
            onChange={e =>
              setFormData({ ...formData, minimumStock: Number(e.target.value) })
            }
            className="w-full rounded border border-[#6E7E8D]/30 p-2"
          />
        </div>
      </div>

      {!isEditing && (
        <div>
          <label className="block font-semibold mb-1">Stok Awal</label>
          <input
            type="number"
            min={0}
            value={formData.stock || 0}
            onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
            className="w-full rounded border border-[#6E7E8D]/30 p-2"
          />
        </div>
      )}

      <div>
        <label className="block font-semibold mb-1">Material / Bahan</label>
        <input
          type="text"
          value={formData.material}
          onChange={e => setFormData({ ...formData, material: e.target.value })}
          className="w-full rounded border border-[#6E7E8D]/30 p-2"
        />
      </div>

      <div>
        <label className="block font-semibold mb-1">Deskripsi</label>
        <textarea
          rows={3}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full rounded border border-[#6E7E8D]/30 p-2"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="isActiveCheck"
          checked={formData.isActive}
          onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
        />
        <label htmlFor="isActiveCheck" className="font-semibold text-xs cursor-pointer">
          Status Produk Aktif (Tampil di Katalog)
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-[#001524]/10">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" variant="teal" size="sm" disabled={isLoading}>
          {isLoading ? 'Menyimpan…' : isEditing ? 'Simpan Perubahan' : 'Buat Produk'}
        </Button>
      </div>
    </form>
  );
}
