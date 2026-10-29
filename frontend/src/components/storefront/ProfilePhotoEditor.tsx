import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateAvatar } from '@/features/auth/useAuth';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { Button } from '@/components/ui/button';

export function ProfilePhotoEditor({ src }: { src?: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const update = useUpdateAvatar();

  useEffect(() => {
    if (preview) return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const clearSelection = () => {
    setFile(null);
    setPreview(null);
    if (input.current) input.current.value = '';
  };

  const save = async (image: File | null) => {
    try {
      await update.mutateAsync(image);
      clearSelection();
      toast.success(image ? 'Foto profil berhasil disimpan.' : 'Foto profil dihapus.');
    } catch {
      // Keep the selection available for retry; the mutation displays the error.
    }
  };

  return (
    <section className="profile-photo-editor" aria-labelledby="profile-photo-heading">
      <UserAvatar src={preview || src} className="profile-photo-preview" />
      <div className="profile-photo-content">
        <h2 id="profile-photo-heading">Foto profil</h2>
        <p id="profile-photo-help">Pilih foto JPG, PNG, atau WebP. Maksimal 3 MB.</p>
        <input
          ref={input}
          type="file"
          className="sr-only"
          aria-label="Pilih foto profil"
          aria-describedby="profile-photo-help"
          accept="image/jpeg,image/png,image/webp"
          disabled={update.isPending}
          onChange={event => {
            const selected = event.target.files?.[0];
            if (!selected) return;
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
              toast.error('Pilih foto JPG, PNG, atau WebP.');
              event.target.value = '';
              return;
            }
            if (selected.size > 3 * 1024 * 1024) {
              toast.error('Ukuran foto maksimal 3 MB.');
              event.target.value = '';
              return;
            }
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
          }}
        />
        <div className="profile-photo-actions">
          <Button
            type="button"
            variant="outline"
            disabled={update.isPending}
            onClick={() => input.current?.click()}
          >
            <Camera size={16} /> {file || src ? 'Ganti foto' : 'Pilih foto'}
          </Button>
          {file ? (
            <>
              <Button
                type="button"
                variant="teal"
                disabled={update.isPending}
                onClick={() => void save(file)}
              >
                {update.isPending ? 'Menyimpan…' : 'Simpan foto'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={update.isPending}
                onClick={clearSelection}
              >
                Batal
              </Button>
            </>
          ) : src ? (
            <Button
              type="button"
              variant="ghost"
              disabled={update.isPending}
              onClick={() => void save(null)}
            >
              <Trash2 size={15} /> {update.isPending ? 'Menghapus…' : 'Hapus foto'}
            </Button>
          ) : null}
        </div>
        {file && <p className="profile-photo-filename">{file.name} · Belum disimpan</p>}
      </div>
    </section>
  );
}
