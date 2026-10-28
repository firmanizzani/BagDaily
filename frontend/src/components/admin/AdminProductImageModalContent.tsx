import { useState } from 'react';
import type { Product } from '@/types/api';
import { Button } from '@/components/ui/button';

export interface AdminProductImageModalContentProps {
  product: Product;
  isLoading?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function AdminProductImageModalContent({
  product,
  isLoading = false,
  onUpload,
  onDelete,
}: AdminProductImageModalContentProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    await onUpload(file);
  };

  return (
    <div className="space-y-4 text-xs">
      {product.imageUrl ? (
        <div className="space-y-3">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-48 object-cover rounded-lg border border-[#001524]/10"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full"
            disabled={isLoading}
            onClick={onDelete}
          >
            Hapus Gambar Ini
          </Button>
        </div>
      ) : (
        <div className="h-32 rounded-lg border-2 border-dashed border-[#6E7E8D]/30 flex items-center justify-center text-[#6E7E8D]">
          Belum ada gambar diunggah
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 pt-2">
        <label className="block font-semibold">Unggah File Foto Baru</label>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={e => setFile(e.target.files?.[0] || null)}
          className="w-full text-xs"
        />
        <Button
          type="submit"
          variant="teal"
          size="sm"
          className="w-full"
          disabled={!file || isLoading}
        >
          {isLoading ? 'Mengunggah…' : 'Unggah Foto'}
        </Button>
      </form>
    </div>
  );
}
