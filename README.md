# BagDaily

Aplikasi toko tas, admin, dan kasir. Katalog mengikuti 18 produk pada `prd.md`.

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

Toko: beranda, katalog, detail, favorit, keranjang, checkout, pesanan, profil, alamat pengiriman, dan pengaturan akun. Ikon profil menampilkan menu akun; tombol Login terpisah berada di sebelah kanannya untuk tamu. Setelah login, ikon berubah menjadi avatar bulat dengan gambar default bila foto belum tersedia.

Admin: Dashboard, Produk, Pesanan, Laporan, Pengaturan. Kategori dan inventaris berada di tab Produk. Pengguna/kasir dan tarif pengiriman berada di tab Pengaturan. Tombol Buka kasir tersedia di bagian bawah sidebar.

Pesanan online dikelola khusus admin melalui `/admin/orders`, termasuk persiapan barang, pengiriman, dan pengambilan di toko. Kasir hanya menangani POS, melihat produk, riwayat transaksi offline, dan mencetak struk. Backend menolak akses kasir ke pesanan online, termasuk melalui endpoint lama `/api/cashier/orders`; alias lama tetap tersedia khusus admin. Pelanggan tetap hanya dapat membaca pesanan miliknya sendiri.

Halaman admin `/admin/customers` menampilkan pelanggan, pencarian nama/email/telepon, filter status akun, jumlah pesanan, serta total belanja. Klik pelanggan atau tombol riwayat untuk membuka `/admin/customers/:id`. Jumlah pesanan mencakup semua status; total belanja hanya menghitung transaksi berbayar. Riwayat hanya memuat transaksi yang terhubung ke akun tersebut, sehingga transaksi POS tanpa `user_id` tidak dikaitkan ke pelanggan secara otomatis. Kedua endpoint pelanggan dibatasi khusus admin.

Kasir: pilih/cari/filter produk, jumlah barang, pembayaran Tunai, QRIS, Transfer Bank, Kartu Debit, atau Kartu Kredit. Tunai menyediakan nominal cepat dan kembalian. QRIS menampilkan QR dummy berisi teks demo; transfer menampilkan rekening contoh. Keduanya ditandai simulasi dan tidak dapat digunakan untuk pembayaran asli. Debit/kredit dicatat setelah kasir mengonfirmasi pembayaran berhasil di EDC. Metode pembayaran disimpan pada transaksi dan ditampilkan pada struk yang sama di kasir maupun riwayat, dengan format cetak 80 mm.

Setelah memperbarui aplikasi, jalankan `npm run db:migrate` dari `backend/` untuk mengizinkan metode debit/kredit pada database.

Setelah checkout, aplikasi langsung membuka `/orders/:id/pay`. QRIS dummy atau rekening transfer contoh, total tagihan, batas waktu, dan tombol simulasi bayar berada di halaman yang sama. Pengosongan keranjang menunggu tujuan pembayaran siap agar tidak beralih ke keranjang kosong.

Dashboard dan Laporan memakai kartu ringkasan berikon tanpa persentase perubahan. Jumlah barang terjual dihitung dari item pesanan berbayar; pelanggan baru dihitung dari akun pelanggan yang dibuat selama 30 hari terakhir. Favorit tersedia melalui ikon hati di header, dengan menu duplikat di akun dihapus.

## Akun dan data

Akses admin dan kasir tetap diperiksa oleh backend. Tidak ada login pintas, akun istimewa otomatis, atau data transaksi palsu pada aplikasi utama. Database memiliki 18 produk dan 9 tarif pengiriman. Tiga akun demo sudah dibuat sesuai permintaan.

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
