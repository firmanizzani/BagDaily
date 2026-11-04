# Keuntungan penjualan BagDaily

- `products.cost_price`: modal produk untuk transaksi baru; hanya API admin mengirimkannya.
- `order_items.unit_cost`: snapshot modal saat pesanan dibuat, bukan referensi ke modal produk saat laporan dibuka.
- `cost_is_estimated`: penanda angka dummy pada produk dan item. Mengedit modal melalui admin menandai modal produk sebagai input admin, tanpa mengubah snapshot lama.
- Rumus: total pembayaran pembeli - ongkir - jumlah(unit_cost × quantity). Poin sudah mengurangi total pembayaran sehingga tidak dikurangi kembali. Tidak ada biaya operasional.
- Hanya transaksi berbayar berstatus selesai yang dihitung, menggunakan tanggal pembayaran untuk filter periode, sama dengan laporan lain. Dashboard dan tab Keuntungan memakai endpoint yang sama.
- Modal kosong bukan nol: keuntungan keseluruhan tidak ditampilkan jika ada unit tanpa snapshot modal. Kerugian tetap ditampilkan sebagai nilai negatif. Margin = keuntungan / penjualan tanpa ongkir; tidak ditampilkan jika pembaginya nol atau negatif.
- Modal dummy yang disetujui terdapat pada `database/demo/product-costs.json`, menghasilkan keuntungan dasar Rp30.000–Rp85.000/unit sebelum potongan poin.
- `backend/scripts/backfill-product-costs.ts` memperbarui hanya modal estimasi dalam katalog yang dikenal dan snapshot estimasi/kosong, membuat backup lokal, dan memeriksa harga jual serta stok tidak berubah. Ini adalah alat revisi fixture, bukan job rutin untuk menghitung ulang biaya historis.
- API dan CSV keuntungan hanya untuk admin; API produk publik serta detail pesanan pelanggan/kasir tidak mengirim harga modal.
- Verifikasi: `backend/scripts/verify-profit.ts` memakai akun dan produk QA terisolasi, menguji snapshot, pembayaran, ongkir, poin, status selesai, privasi, dan cleanup.
