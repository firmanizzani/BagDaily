import { useState } from 'react';
import { toast } from 'sonner';
import { useAction, useApi } from '@/hooks/api';
import type { Courier, ShippingRate, ShippingZone } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';
import { formatRupiah } from '@/lib/utils';

export function AdminShippingPage() {
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [courier, setCourier] = useState<Courier>('JNE');
  const [zone, setZone] = useState<ShippingZone>('Jabodetabek');
  const [rateAmount, setRateAmount] = useState<number>(10000);

  const [editRateAmount, setEditRateAmount] = useState<number>(0);

  const {
    data: ratesData,
    isLoading,
    isError,
    refetch,
  } = useApi<ShippingRate[]>('/admin/shipping/rates');

  const createRate = useAction<ShippingRate>();
  const updateRate = useAction<ShippingRate>();

  const rates = ratesData?.data || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createRate.mutateAsync({
        path: '/admin/shipping/rates',
        method: 'POST',
        body: {
          courier,
          zone,
          rate: Number(rateAmount),
        },
      });

      toast.success('Tarif pengiriman baru berhasil ditambahkan.');
      setIsCreateOpen(false);
      void refetch();
    } catch {
      toast.error('Gagal menambahkan tarif. Kombinasi kurir & zona mungkin sudah ada.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;

    try {
      await updateRate.mutateAsync({
        path: `/admin/shipping/rates/${editingRate.id}`,
        method: 'PATCH',
        body: { rate: Number(editRateAmount) },
      });

      toast.success('Tarif berhasil diperbarui.');
      setEditingRate(null);
      void refetch();
    } catch {
      toast.error('Gagal memperbarui tarif.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#001524]/10 pb-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#001524]">
            Manajemen Tarif Pengiriman
          </h1>
          <p className="text-xs text-[#6E7E8D]">
            Atur ongkos kirim flat per kurir (JNE, J&T, SiCepat) dan zona wilayah
            Indonesia.
          </p>
        </div>
        <Button size="sm" variant="teal" onClick={() => setIsCreateOpen(true)}>
          + Tambah Tarif Baru
        </Button>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat tarif ongkir…" />
      ) : isError ? (
        <ErrorState message="Gagal memuat tarif ongkir." onRetry={refetch} />
      ) : rates.length === 0 ? (
        <EmptyState
          title="Belum Ada Tarif"
          description="Tambahkan tarif untuk kurir dan zona."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#001524]/10 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#001524]/10 bg-[#FAF9F6] text-[#001524] font-bold">
              <tr>
                <th className="p-3">Ekspedisi (Kurir)</th>
                <th className="p-3">Zona Pengiriman</th>
                <th className="p-3">Tarif Flat (IDR)</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#001524]/5">
              {rates.map(r => (
                <tr key={r.id} className="hover:bg-[#FAF9F6]/50 transition">
                  <td className="p-3 font-bold text-[#001524]">{r.courier}</td>
                  <td className="p-3 text-[#15616D] font-medium">{r.zone}</td>
                  <td className="p-3 font-extrabold text-sm">{formatRupiah(r.rate)}</td>
                  <td className="p-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        setEditingRate(r);
                        setEditRateAmount(r.rate);
                      }}
                    >
                      Ubah Tarif
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        title="Tambah Tarif Pengiriman"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      >
        <form onSubmit={handleCreate} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Kurir</label>
            <select
              value={courier}
              onChange={e => setCourier(e.target.value as Courier)}
              className="w-full rounded border border-[#6E7E8D]/30 p-2 bg-white"
            >
              <option value="JNE">JNE</option>
              <option value="J&T">J&T</option>
              <option value="SiCepat">SiCepat</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Zona Tujuan</label>
            <select
              value={zone}
              onChange={e => setZone(e.target.value as ShippingZone)}
              className="w-full rounded border border-[#6E7E8D]/30 p-2 bg-white"
            >
              <option value="Jabodetabek">Jabodetabek</option>
              <option value="Jawa">Jawa</option>
              <option value="Luar Jawa">Luar Jawa</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold mb-1">Tarif (IDR)</label>
            <input
              type="number"
              min={0}
              step={1000}
              required
              value={rateAmount}
              onChange={e => setRateAmount(Number(e.target.value))}
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#001524]/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={createRate.isPending}
            >
              {createRate.isPending ? 'Menyimpan…' : 'Simpan Tarif'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        title={`Ubah Tarif: ${editingRate?.courier || ''} - ${editingRate?.zone || ''}`}
        open={Boolean(editingRate)}
        onOpenChange={open => {
          if (!open) setEditingRate(null);
        }}
      >
        <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold mb-1">Tarif Baru (IDR)</label>
            <input
              type="number"
              min={0}
              step={1000}
              required
              value={editRateAmount}
              onChange={e => setEditRateAmount(Number(e.target.value))}
              className="w-full rounded border border-[#6E7E8D]/30 p-2"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#001524]/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditingRate(null)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="teal"
              size="sm"
              disabled={updateRate.isPending}
            >
              {updateRate.isPending ? 'Menyimpan…' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
