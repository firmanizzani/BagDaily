import { useState } from 'react';
import { useApi } from '@/hooks/api';
import type { RestockRecommendation } from '@/types/api';
import { EmptyState, ErrorState, LoadingState } from '@/components/shared/states';

export function RestockRecommendations({
  onRestock,
}: {
  onRestock: (product: RestockRecommendation) => void;
}) {
  const query = useApi<RestockRecommendation[]>(
    '/admin/dashboard/restock-recommendations',
  );
  const [onlyNeeded, setOnlyNeeded] = useState(true);
  const rows = [...(query.data?.data ?? [])]
    .filter(row => !onlyNeeded || row.recommendedQuantity > 0)
    .sort((a, b) => {
      if (a.recommendedQuantity > 0 !== b.recommendedQuantity > 0)
        return a.recommendedQuantity > 0 ? -1 : 1;
      return (
        (a.daysOfStock ?? Infinity) - (b.daysOfStock ?? Infinity) ||
        a.name.localeCompare(b.name)
      );
    });
  return (
    <section className="admin-panel restock-panel" aria-labelledby="restock-title">
      <header className="admin-panel-heading restock-heading">
        <div>
          <h2 id="restock-title">Rekomendasi restock</h2>
          <p>Penjualan berbayar online dan kasir dalam 7 hari terakhir.</p>
        </div>
        <button
          type="button"
          className="admin-secondary-button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {query.isFetching ? 'Memperbarui…' : 'Perbarui data'}
        </button>
      </header>
      <div className="restock-explanation">
        <p>
          <strong>Dasar saran:</strong> target stok adalah nilai terbesar antara penjualan
          7 hari terakhir dan batas minimum + 1. Jumlah restock = target dikurangi stok
          saat ini, minimal 0.
        </p>
        <p>
          Perkiraan ketahanan stok memakai rata-rata penjualan harian. Ini estimasi
          sederhana, belum memperhitungkan musim, promosi, atau waktu kirim pemasok. Stok
          baru bertambah setelah Anda meninjau dan menyimpan penyesuaian.
        </p>
        <label>
          <input
            type="checkbox"
            checked={onlyNeeded}
            onChange={event => setOnlyNeeded(event.target.checked)}
          />{' '}
          Hanya produk yang disarankan restock
        </label>
      </div>
      {query.isLoading ? (
        <LoadingState label="Menghitung rekomendasi restock…" />
      ) : query.isError ? (
        <ErrorState
          message="Rekomendasi restock belum dapat dimuat."
          onRetry={() => void query.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title={onlyNeeded ? 'Stok mencukupi target saat ini' : 'Belum ada produk aktif'}
          description={
            onlyNeeded
              ? 'Tidak ada tambahan stok yang disarankan berdasarkan perhitungan ini. Nonaktifkan filter untuk meninjau semua produk.'
              : 'Tambahkan atau aktifkan produk untuk melihat rekomendasi.'
          }
        />
      ) : (
        <div
          className="admin-table-scroll"
          role="region"
          aria-label="Tabel rekomendasi restock"
          tabIndex={0}
        >
          <table className="admin-table restock-table">
            <thead>
              <tr>
                <th scope="col">Produk</th>
                <th scope="col" className="numeric">
                  Stok / minimum
                </th>
                <th scope="col" className="numeric">
                  Terjual 7 hari
                </th>
                <th scope="col" className="numeric">
                  Rata-rata / hari
                </th>
                <th scope="col" className="numeric">
                  Cukup untuk
                </th>
                <th scope="col" className="numeric">
                  Saran tambah
                </th>
                <th scope="col">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.productId}>
                  <th scope="row">{row.name}</th>
                  <td className="numeric">
                    {row.stock} / {row.minimumStock}
                  </td>
                  <td className="numeric">{row.soldLast7Days} unit</td>
                  <td className="numeric">
                    {row.averageDailySales.toLocaleString('id-ID', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    unit
                  </td>
                  <td className="numeric">
                    {row.daysOfStock === null ? (
                      <span title="Belum ada transaksi berbayar dalam 7 hari terakhir">
                        Belum ada penjualan
                      </span>
                    ) : (
                      `${row.daysOfStock.toLocaleString('id-ID')} hari`
                    )}
                  </td>
                  <td className="numeric">
                    <strong>{row.recommendedQuantity} unit</strong>
                    <small>Target {row.targetStock} unit</small>
                  </td>
                  <td>
                    {row.recommendedQuantity > 0 ? (
                      <button
                        type="button"
                        className="admin-secondary-button"
                        aria-label={`Tinjau restock ${row.name}`}
                        onClick={() => onRestock(row)}
                      >
                        Tinjau restock
                      </button>
                    ) : (
                      <span>Stok cukup</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
