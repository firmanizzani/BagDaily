import { useState } from 'react';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Role, User } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatDate } from '@/lib/utils';

export function AdminUsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [cashierName, setCashierName] = useState('');
  const [cashierEmail, setCashierEmail] = useState('');
  const [cashierPassword, setCashierPassword] = useState('');

  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Role>('pelanggan');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editPassword, setEditPassword] = useState('');

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '15',
    ...(search ? { search } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
  });

  const {
    data: usersData,
    isLoading,
    isError,
    refetch,
  } = useApi<User[]>(`/admin/users?${queryParams.toString()}`);

  const createCashier = useAction<User>();
  const updateUser = useAction<User>();

  const users = usersData?.data || [];
  const pagination = usersData?.pagination;

  const handleCreateCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCashier.mutateAsync({
        path: '/admin/users/cashier',
        method: 'POST',
        body: {
          name: cashierName,
          email: cashierEmail,
          password: cashierPassword,
        },
      });

      toast.success('Akun kasir berhasil dibuat.');
      setIsCashierModalOpen(false);
      setCashierName('');
      setCashierEmail('');
      setCashierPassword('');
      void refetch();
    } catch {
      toast.error('Gagal membuat akun kasir. Periksa format email/password.');
    }
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditIsActive(u.isActive);
    setEditPassword('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser.mutateAsync({
        path: `/admin/users/${editingUser.id}`,
        method: 'PATCH',
        body: {
          name: editName,
          role: editRole,
          isActive: editIsActive,
          password: editPassword || undefined,
        },
      });

      toast.success('Pengguna berhasil diperbarui.');
      setEditingUser(null);
      void refetch();
    } catch {
      toast.error(
        'Gagal memperbarui pengguna (tidak bisa ubah role diri sendiri / admin terakhir).',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#001524]">
            Manajemen Pengguna & Staf
          </h1>
          <p className="text-xs text-[#6E7E8D]">
            Kelola akses pelanggan, staf kasir gerai fisik, dan administrator sistem
            BagDaily.
          </p>
        </div>
        <Button size="sm" variant="teal" onClick={() => setIsCashierModalOpen(true)}>
          + Buat Akun Kasir Baru
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Cari nama atau email…"
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[#6E7E8D]/30 px-3 py-1.5 text-xs bg-white w-64"
        />
        <select
          value={roleFilter}
          onChange={e => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-[#6E7E8D]/30 px-3 py-1.5 text-xs bg-white text-[#001524]"
        >
          <option value="">Semua Peran</option>
          <option value="pelanggan">Pelanggan</option>
          <option value="kasir">Kasir</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat pengguna…" />
      ) : isError ? (
        <ErrorState message="Gagal memuat pengguna." onRetry={refetch} />
      ) : users.length === 0 ? (
        <EmptyState
          title="Tidak Ada Pengguna"
          description="Data pengguna tidak ditemukan."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#001524]/10 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#001524]/10 bg-[#FAF9F6] text-[#001524] font-bold">
              <tr>
                <th className="p-3">Nama</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Terdaftar</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001524]/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-[#FAF9F6]/50 transition">
                  <td className="p-3 font-bold text-[#001524]">{u.name}</td>
                  <td className="p-3 text-[#6E7E8D]">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-[#001524] text-white'
                          : u.role === 'kasir'
                            ? 'bg-[#15616D] text-white'
                            : 'bg-[#FFECD1] text-[#001524]'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        u.isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {u.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="p-3 text-[#6E7E8D]">{formatDate(u.createdAt)}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleOpenEdit(u)}
                    >
                      Edit
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
        title="Buat Akun Kasir Baru"
        open={isCashierModalOpen}
        onOpenChange={setIsCashierModalOpen}
      >
        <form onSubmit={handleCreateCashier} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Kasir</label>
            <input
              type="text"
              required
              value={cashierName}
              onChange={e => setCashierName(e.target.value)}
              placeholder="Contoh: Kasir Toko A"
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Email</label>
            <input
              type="email"
              required
              value={cashierEmail}
              onChange={e => setCashierEmail(e.target.value)}
              placeholder="kasir@bagdaily.id"
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={cashierPassword}
              onChange={e => setCashierPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-[#001524]/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCashierModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={createCashier.isPending}
            >
              {createCashier.isPending ? 'Menyimpan…' : 'Buat Kasir'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Edit Pengguna: ${editingUser?.name || ''}`}
        open={Boolean(editingUser)}
        onOpenChange={open => {
          if (!open) setEditingUser(null);
        }}
      >
        <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Nama Lengkap</label>
            <input
              type="text"
              required
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Peran (Role)</label>
            <select
              value={editRole}
              onChange={e => setEditRole(e.target.value as Role)}
              className="w-full rounded border border-[#6E7E8D]/30 p-2 bg-white"
            >
              <option value="pelanggan">Pelanggan</option>
              <option value="kasir">Kasir</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Ganti Password (Opsional)</label>
            <input
              type="password"
              value={editPassword}
              minLength={8}
              onChange={e => setEditPassword(e.target.value)}
              placeholder="Kosongkan jika tidak diubah"
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="userActive"
              checked={editIsActive}
              onChange={e => setEditIsActive(e.target.checked)}
            />
            <label htmlFor="userActive" className="font-semibold cursor-pointer">
              Akun Aktif (Dapat Login)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#001524]/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingUser(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={updateUser.isPending}
            >
              {updateUser.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
