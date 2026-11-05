# BagDaily

Aplikasi toko tas, admin, dan kasir. Katalog mengikuti 18 produk pada `prd.md`.

BagDaily membantu UMKM tas mengelola penjualan online dan toko fisik dengan satu sumber stok. Pelanggan berbelanja melalui katalog dan checkout; kasir mencatat transaksi POS; admin mengelola pesanan online, produk, pelanggan, inventaris, dan laporan. Pengurangan stok terjadi saat pembayaran online berhasil atau transaksi POS disimpan, bukan saat keranjang atau checkout dibuat.

Frontend memakai React, TypeScript, Tailwind CSS, dan Recharts. Backend Express memvalidasi input dengan Zod, memeriksa akses berdasarkan role, dan mengakses PostgreSQL melalui Drizzle ORM. Transaksi database dan pengurangan stok bersyarat mencegah stok negatif. Dokumentasi teknis: [API](backend/API-CONTRACT.md), [skema database](database/documentation/schema.md), dan [setup backend](backend/README.md).

Pembayaran online, QRIS, rekening transfer, tarif ongkir, dan resi merupakan simulasi. POS menyediakan **Pelanggan umum** (tanpa akun) atau **Pilih pelanggan** terdaftar. Grafik penjualan berada di menu **Laporan**; dashboard utama menampilkan ringkasan dan pesanan terbaru.

Kasir dapat mencari pelanggan aktif berdasarkan nama, email, atau telepon. Transaksi yang ditautkan ikut dihitung pada riwayat dan total belanja pelanggan admin; transaksi umum hanya masuk laporan serta ringkasan **Transaksi pelanggan umum**, bukan jumlah pelanggan unik. Struk dan riwayat POS menampilkan jenis pelanggan, dan transaksi baru kembali ke pilihan Pelanggan umum. Pemilihan pelanggan tidak mengubah pembatasan akses kasir ke pengelolaan pesanan online.

Harga katalog pada seed memakai nominal bulat Rp110.000–Rp380.000. Untuk menerapkan harga seed ke 18 SKU katalog yang sudah ada, jalankan `npm run catalog:prices` dari `backend/`. Skrip mencadangkan harga lama ke `backend/uploads/catalog-import/`, memperbarui harga dalam satu transaksi database, dan tidak mengubah stok maupun nilai transaksi lama.

## Jalankan

Pastikan dependensi di `frontend/` dan `backend/` sudah terpasang serta `backend/.env` sudah dikonfigurasi. Dari folder utama:

```powershell
npm run dev
```

- Aplikasi: http://localhost:5173/
- Backend: http://localhost:3000/
- Health: http://localhost:3000/api/health

Frontend menggunakan `/api` yang diteruskan ke backend. Satu origin untuk browser; tidak perlu membuka kedua aplikasi secara manual. Ctrl+C menghentikan keduanya. Jika port sudah digunakan, hentikan terminal dev lama terlebih dahulu. Port tidak diganti diam-diam.

Untuk port lain pada PowerShell:

```powershell
$env:PORT='3010'
$env:FRONTEND_PORT='5190'
npm run dev
```

## Pemeriksaan

```powershell
npm run build
npm run typecheck
npm run lint
npm run test
```

Build menghasilkan `frontend/dist` dan `backend/dist`. Perintah test utama menjalankan tes frontend dan tes unit backend; tes yang mengubah database harus dijalankan secara terpisah dengan izin dan akun uji yang sesuai.

Verifikasi API tanpa mengubah data:

```powershell
$env:QA_API_URL='http://localhost:5173/api'
node backend/scripts/verify-public.mjs
```

## Navigasi

### Rekomendasi restock dan kedaluwarsa pesanan

Di **Produk → Inventaris & stok → Rekomendasi Restock**, admin dapat melihat penjualan berbayar online + POS selama 7 hari terakhir, rata-rata harian, perkiraan ketahanan stok, dan saran jumlah restock. Target stok = nilai terbesar antara unit terjual selama 7 hari dan batas minimum + 1. Saran tambah = maksimum 0 atau target dikurangi stok saat ini. Ketahanan stok memakai rata-rata sebelum pembulatan; tanpa penjualan ditampilkan sebagai belum ada penjualan, bukan prediksi tak terbatas.

Tombol **Tinjau restock** mengisi jumlah dan catatan pada form penyesuaian. Stok hanya berubah setelah admin menyimpan. Perhitungan ini tidak memprediksi musim/promosi dan belum mempertimbangkan waktu kirim pemasok.

Pesanan online belum dibayar dibatalkan setelah deadline oleh jadwal PostgreSQL setiap menit. Jadwal tetap berjalan saat browser atau backend tidak aktif. Status pembatalan dicatat satu kali; stok tidak ditambah karena pesanan belum dibayar tidak pernah memotong stok. Tombol pembayaran menolak pesanan kedaluwarsa dan halaman pembayaran mengambil ulang status otomatis setelah deadline.

Untuk database baru, jalankan dari `backend/` dengan koneksi pemilik database yang mendukung `pg_cron`:

```powershell
npm run db:migrate
npm run db:cron
npm run db:cron:check
```

`db:cron` aman dijalankan ulang dan memakai nama job yang sama. `db:cron:check` hanya memeriksa fungsi, jadwal aktif, serta tiga hasil eksekusi terakhir. Migrasi 0004 memasang fungsi; pemasangan jadwal adalah langkah terpisah. Server lokal juga menjalankan pemeriksaan tiap menit. Deploy serverless tetap memerlukan jadwal database.

Toko: beranda, katalog, detail, favorit, keranjang, checkout, pesanan, profil, alamat pengiriman, dan pengaturan akun. Ikon profil menampilkan menu akun; tombol Login terpisah berada di sebelah kanannya untuk tamu. Setelah login, ikon berubah menjadi avatar bulat dengan gambar default bila foto belum tersedia.

Admin: Dashboard, Produk, Pesanan, Laporan, Pengaturan. Kategori dan inventaris berada di tab Produk. Pengguna/kasir dan tarif pengiriman berada di tab Pengaturan. Tombol Buka kasir tersedia di bagian bawah sidebar.

Pesanan online dikelola khusus admin melalui `/admin/orders`, termasuk persiapan barang, pengiriman, dan pengambilan di toko. Kasir hanya menangani POS, melihat produk, riwayat transaksi offline, dan mencetak struk. Backend menolak akses kasir ke pesanan online, termasuk melalui endpoint lama `/api/cashier/orders`; alias lama tetap tersedia khusus admin. Pelanggan tetap hanya dapat membaca pesanan miliknya sendiri.

Halaman admin `/admin/customers` menampilkan pelanggan, pencarian nama/email/telepon, filter status akun, jumlah pesanan, serta total belanja. Klik pelanggan atau tombol riwayat untuk membuka `/admin/customers/:id`. Jumlah pesanan mencakup semua status; total belanja hanya menghitung transaksi berbayar. Riwayat hanya memuat transaksi yang terhubung ke akun tersebut, sehingga transaksi POS tanpa `user_id` tidak dikaitkan ke pelanggan secara otomatis. Kedua endpoint pelanggan dibatasi khusus admin.

Kasir: pilih/cari/filter produk, jumlah barang, pembayaran Tunai, QRIS, Transfer Bank, Kartu Debit, atau Kartu Kredit. Tunai menyediakan nominal cepat dan kembalian. QRIS menampilkan QR dummy berisi teks demo; transfer menampilkan rekening contoh. Keduanya ditandai simulasi dan tidak dapat digunakan untuk pembayaran asli. Debit/kredit dicatat setelah kasir mengonfirmasi pembayaran berhasil di EDC. Metode pembayaran disimpan pada transaksi dan ditampilkan pada struk yang sama di kasir maupun riwayat, dengan format cetak 80 mm.

Setelah memperbarui aplikasi, jalankan `npm run db:migrate` dari `backend/` untuk mengizinkan metode debit/kredit pada database.

Setelah checkout, aplikasi langsung membuka `/orders/:id/pay`. QRIS dummy atau rekening transfer contoh, total tagihan, batas waktu, dan tombol simulasi bayar berada di halaman yang sama. Pengosongan keranjang menunggu tujuan pembayaran siap agar tidak beralih ke keranjang kosong.

Dashboard dan Laporan memakai kartu ringkasan berikon tanpa persentase perubahan. Jumlah barang terjual dihitung dari item pesanan berbayar; pelanggan baru dihitung dari akun pelanggan yang dibuat selama 30 hari terakhir. Favorit tersedia melalui ikon hati di header, dengan menu duplikat di akun dihapus.

## Akun dan data

### Pembersihan transaksi lama

Tiga pesanan lama yang ditunjuk pemilik sudah dihapus melalui pemeliharaan sekali pakai. Sebelum perubahan, data dicadangkan di `backend/uploads/maintenance/`. Stok dua pesanan berbayar dipulihkan (Hana Mini Tote +1, Rhea Mini Pack +1); riwayat mutasi lama dipertahankan dan diberi catatan, dengan koreksi penyeimbang. Pesanan belum dibayar tidak menambah stok.

Transaksi Kiro Flap Sling milik `demo@bagdaily.com` sudah disesuaikan dari Rp279.000 menjadi Rp230.000; ongkir tetap Rp15.000 dan total Rp245.000. Batch 40 transaksi tidak berubah. Setelah pembersihan, filter Semua menampilkan 43 transaksi berbayar / 74 tas / Rp15.601.000.

### Data simulasi September–November 2026

Batch `SIM-GTNIC-2026` memuat **40 transaksi / 71 tas**: 20 online dengan ongkir menurut alamat akun dan 20 POS (8 pelanggan terdaftar, 12 umum). Nilai barang Rp14.620.000 + ongkir Rp398.000 = **Rp15.018.000**. Nomor pesanan `BD-SIM-2026-*` menandai data demonstrasi; nama pelanggan tampil sebagai Aulia, Bima, Citra, Dimas, dan Nadia. Transaksi lama selain tiga pesanan yang secara khusus diminta untuk dibersihkan tetap dipertahankan, sehingga ringkasan seluruh toko lebih besar dari batch ini.

Lima akun simulasi memiliki password **`pelanggan`**: `aulia@gmail.com`, `bima@gmail.com`, `citra@gmail.com`, `dimas@gmail.com`, dan `nadia@gmail.com`. Alamat dan telepon fiktif tersimpan pada akun; alamat pengiriman disalin ke pesanan. Jakarta/Bekasi memakai zona Jabodetabek, Bandung/Yogyakarta zona Jawa, dan Makassar zona Luar Jawa. Ongkir memakai tarif kurir dari database.

[Rincian akun, alamat, 40 transaksi dan rekonsiliasi](database/demo/README.md). Klik **Semua** di Dashboard atau Laporan untuk semua transaksi, atau pilih rentang **1 September–4 November 2026** untuk periode dataset. Pilihan cepat Hari ini, Minggu ini (Senin–hari ini), dan Bulan ini langsung diterapkan; tidak ada tombol 30 hari terakhir. Tampilan awal masih memakai 30 hari terakhir. Dari `backend/`: `npm run demo:sales` menampilkan pratinjau, `npm run demo:sales -- --apply` mengimpor tanpa duplikasi, `npm run demo:sales -- --check` memeriksa database, dan `npm run demo:verify` memeriksa API serta login. Gunakan `QA_API_URL` jika port frontend bukan 5173.

Akses admin dan kasir tetap diperiksa oleh backend. Tidak ada login pintas atau akun istimewa otomatis. Database memiliki 18 produk dan 9 tarif pengiriman. Tiga akun demo utama serta lima akun pelanggan simulasi tersedia untuk pengujian.

Pada halaman Login, klik **Demo Akun** di bawah tautan pendaftaran. Popup menampilkan tiga role; bagian layar lainnya menjadi blur. Memilih role langsung masuk ke halaman yang sesuai.

| Role      | Email              | Password demo |
| --------- | ------------------ | ------------- |
| Pelanggan | demo@bagdaily.com  | BagDaily123!  |
| Admin     | admin@bagdaily.com | BagDaily123!  |
| Kasir     | kasir@bagdaily.com | BagDaily123!  |

Password akun biasa minimal 8 karakter. Password demo di atas sengaja ditampilkan untuk demonstrasi; kredensial database dan kunci layanan tetap hanya berada di `.env` yang diabaikan Git.

Seed memerlukan `DEMO_ADMIN_PASSWORD`, `DEMO_CASHIER_PASSWORD`, dan `DEMO_CUSTOMER_PASSWORD`. Jika akun demo sudah ada, seed tidak mengubah passwordnya.

`frontend/scripts/visual-fixtures.mjs` adalah server fixture khusus QA tampilan pada port 3002. Tidak terhubung ke database dan tidak memberikan akses ke sistem asli. Tidak dipakai oleh `npm run dev`, build, atau konfigurasi default. Jangan gunakan preview fixture untuk menguji transaksi sebenarnya.

## Gambar

Gambar dibuat dengan imagegen bawaan dan disimpan di `frontend/public/images/`:

- `bagdaily-hero.png`: foto kampanye meja kayu, latar teal, ransel krem, selempang hitam, tote krem.
- `bagdaily-journey.png`: foto banner penutup yang berbeda, tas di bangku batu pada halaman tropis.
- `product-collection.png`: lembar katalog 6 × 3 berisi 18 tas, urutan sesuai PRD; komponen ProductPhoto memilih area tiap produk. Foto upload admin selalu menggantikan gambar bawaan tersebut.

Foto AI adalah ilustrasi katalog, bukan dokumentasi produk fisik yang telah diverifikasi. Email kontak dan jam layanan di footer merupakan isi contoh yang perlu disesuaikan sebelum peluncuran.

## Penyimpanan foto

Foto produk dan foto profil memakai dua bucket **privat** Supabase Storage: `SUPABASE_STORAGE_BUCKET=product-images` dan `SUPABASE_PROFILE_STORAGE_BUCKET=profile-images`. Foto produk berada langsung di bucket `product-images` dengan nama seperti `arlo-crossbody-a83f21c94b70.png`, tanpa subfolder. Foto profil berada di `profile-images/avatars/<userId>/<nama-unik>`. Atur batas masing-masing bucket 3 MiB dan format `image/jpeg`, `image/png`, serta `image/webp`. `SUPABASE_SERVICE_ROLE_KEY` hanya tersedia di backend.

Backend menyajikan foto melalui `/api/media/products/...`: foto katalog aktif dapat dilihat pengunjung, foto produk nonaktif hanya admin, dan foto profil hanya pemilik akun yang sedang login. Tabel `products` hanya menyimpan `image_path`; properti `imageUrl` dihitung dari path tersebut pada semua respons produk. Migrasi `0003_derive_product_image_urls` menghapus kolom `image_url` yang sebelumnya berulang. Tidak diperlukan bucket publik atau tautan Storage publik. Pada development tanpa Supabase Storage, file disimpan di `backend/uploads/product-images`; folder ini tidak masuk Git. Produksi memerlukan Supabase Storage.

Admin dapat memilih foto di form Tambah/Edit Produk. Setelah data produk tersimpan, foto diunggah otomatis; jika upload gagal, form tetap terbuka untuk mencoba lagi tanpa membuat produk duplikat. Pengguna dapat memilih, melihat pratinjau, menyimpan, mengganti, dan menghapus foto melalui Profil saya. Migrasi `0002_add_user_avatars` menambahkan kolom penyimpan path dan URL foto profil.

Untuk memindahkan 18 foto katalog bawaan ke Storage, jalankan `scripts/export-catalog-images.ps1` dari root proyek, lalu `npx tsx scripts/upload-catalog-images.ts` dari folder backend. Script memisahkan lembar katalog sesuai pemetaan produk, memverifikasi isi setiap upload, dan menghubungkan hasilnya ke database. Produk yang sudah punya foto dilewati. File hasil pemisahan dan catatan import berada di `backend/uploads/catalog-import` yang tidak masuk Git.

Untuk merapikan upload lama dari subfolder menjadi file langsung dalam bucket, jalankan `npx tsx scripts/flatten-product-images.ts` dari folder backend. Setiap file baru diverifikasi sebelum path database diperbarui dan file lama dihapus. Cadangan pemetaan path disimpan di `backend/uploads/catalog-import`.

## Performa dan verifikasi

Driver PostgreSQL tidak lagi menjalankan query penemuan tipe array yang dapat timeout pada koneksi awal; skema aplikasi memakai kolom skalar. Pool dibatasi 4 koneksi (DATABASE_POOL_SIZE), dan katalog menghitung jumlah hasil dalam query yang sama dengan daftar produk. Pencarian memakai debounce 250 ms, request lama dapat dibatalkan, dan daftar sebelumnya tetap terlihat saat filter diperbarui.

Pengukuran lokal setelah koneksi hangat: katalog sekitar 170–185 ms; beberapa permintaan bersamaan sekitar 180 ms. Koneksi pertama dapat lebih lama karena koneksi ke database jarak jauh.

Tes integrasi opsional memakai akun demo dan fixture sementara:

```powershell
$env:QA_API_URL='http://localhost:5173/api'
cd backend
npx tsx scripts/verify-integration.ts
```

Tes mencakup tiga login role, CRUD, upload/hapus foto, aktif/nonaktif produk, checkout/pembayaran, pengiriman/resi, kasir/kembalian, idempotensi, stok/restock, laporan/CSV, pembatasan akses, dan balapan membeli stok terakhir. Produk, kategori, foto, dan transaksi QA dibersihkan setelah pengujian; akun demo dipertahankan.
