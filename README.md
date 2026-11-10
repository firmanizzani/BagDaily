# BagDaily

**BagDaily** adalah aplikasi web yang menyatukan toko online dan kasir gerai fisik untuk UMKM tas.

[Buka website live](https://bagdaily.vercel.app/) · [Coba akun demo](https://bagdaily.vercel.app/login)

## Kompetisi dan tim

| Informasi | Keterangan |
| --- | --- |
| Lomba | Garda Tech National Innovation Competition (GTNIC) 2026 |
| Kategori | Web Development |
| Subtema | *Accelerating Digital Transformation for Business and SMEs* |
| Nama tim | SWE Ball Knowledge |
| Institusi | UPN Veteran Jakarta |

| Peran | Nama lengkap |
| --- | --- |
| Ketua | Ibnu Ahmad Fauzan |
| Anggota | Muhammad Firman Izzani |

## Masalah dan solusi

Ketika stok toko online dan kasir dicatat terpisah, pemilik toko harus mencocokkan transaksi secara manual. Barang yang sudah terjual di gerai bisa masih terlihat tersedia secara online, dan data penjualan sulit dipakai untuk menentukan kapan perlu restock.

BagDaily menyatukan katalog, checkout, kasir, inventaris, dan laporan dalam satu sistem. Pembayaran online yang berhasil dan transaksi POS yang tersimpan mengurangi stok yang sama. Admin bisa melihat riwayat mutasi dan memakai penjualan tujuh hari terakhir sebagai dasar rekomendasi restock.

## Pengguna dan fitur utama

| Pengguna | Fitur |
| --- | --- |
| **Pelanggan** | Cari dan filter tas, simpan favorit, checkout untuk dikirim atau diambil, bayar lewat simulasi QRIS atau transfer, lacak pesanan, dan gunakan poin member. |
| **Kasir** | Cari produk, catat transaksi gerai untuk pelanggan umum atau pelanggan terdaftar, pilih metode pembayaran, lihat riwayat, dan cetak ulang struk. |
| **Admin** | Kelola produk, kategori, stok, pesanan online, akun kasir, dan tarif kirim. Pantau penjualan, laba kotor, produk terlaris, dan riwayat pelanggan. |

Laporan admin menggabungkan transaksi toko online dan POS, dengan filter kanal, perbandingan periode, dan unduhan CSV. Laba kotor dihitung untuk transaksi berbayar yang sudah selesai menggunakan harga modal yang tersimpan saat pesanan dibuat. Perhitungan memisahkan ongkos kirim dan memperhitungkan potongan poin.

Pesanan online yang melewati batas pembayaran dibatalkan otomatis jika jadwal database sudah aktif. Pembayaran QRIS dan transfer bank serta nomor resi pada demo bersifat simulasi.

## Teknologi dan arsitektur

| Lapisan | Teknologi dan tanggung jawab |
| --- | --- |
| Antarmuka | React, TypeScript, Vite, Tailwind CSS, dan Recharts untuk toko, POS, serta dashboard admin. |
| API | Node.js, Express, dan Zod untuk validasi, autentikasi, otorisasi, dan aturan bisnis. |
| Data | Supabase PostgreSQL dan Drizzle ORM untuk pesanan, persediaan, poin, dan laporan. |
| Media | Supabase Storage privat untuk foto produk dan profil. Foto disajikan melalui API sesuai aksesnya. |

```text
Browser (toko, kasir, admin)
  └── React → REST API /api → Express → PostgreSQL
                                └── Supabase Storage
```

`frontend/` berisi antarmuka, `backend/` berisi API dan migrasi, `database/` berisi dokumentasi serta data simulasi, dan `docs/` berisi spesifikasi fitur.

## Instalasi dan menjalankan aplikasi

Siapkan **Node.js 22.12 atau lebih baru**, npm, dan proyek Supabase PostgreSQL yang bisa diakses. Jalankan dari root repo di PowerShell.

```powershell
npm ci --prefix frontend
npm ci --prefix backend

Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Jika memakai database baru untuk pengembangan lokal, isi konfigurasi koneksi di `backend/.env` sebelum menjalankan migrasi. Untuk membuat akun demo, tambahkan `DEMO_ADMIN_PASSWORD`, `DEMO_CASHIER_PASSWORD`, dan `DEMO_CUSTOMER_PASSWORD` ke file tersebut sebelum menjalankan seed. Untuk mengisi katalog dan tarif kirim saja, gunakan `npm run db:seed --prefix backend -- --catalog-only` sebagai pengganti perintah seed di bawah.

```powershell
npm run db:migrate --prefix backend
npm run db:seed --prefix backend
npm run dev
```

- Aplikasi lokal tersedia di [localhost:5173](http://localhost:5173/).
- Pemeriksaan API tersedia di [localhost:3000/api/health](http://localhost:3000/api/health).
- Untuk mengaktifkan pembatalan pesanan kedaluwarsa di database, jalankan `npm run db:cron --prefix backend` dengan koneksi yang memiliki izin membuat jadwal `pg_cron`. Periksa jadwal dengan `npm run db:cron:check --prefix backend`.

## Variabel lingkungan

Salin contoh konfigurasi dari [backend/.env.example](backend/.env.example) dan [frontend/.env.example](frontend/.env.example). Simpan nilai rahasia hanya di lingkungan lokal atau pengaturan hosting.

| Lokasi | Variabel | Kegunaan |
| --- | --- | --- |
| Backend | `DATABASE_URL` | Koneksi PostgreSQL untuk API. |
| Backend | `DATABASE_MIGRATION_URL` | Koneksi opsional untuk migrasi dan pengaturan jadwal database. Jika kosong, skrip memakai `DATABASE_URL`. |
| Backend | `JWT_SECRET` | Rahasia sesi minimal 32 karakter. |
| Backend | `FRONTEND_URL` | Daftar alamat frontend yang diizinkan, dipisahkan koma. Default lokal `http://localhost:5173`. |
| Backend | `NODE_ENV`, `PORT` | Mode aplikasi dan port API. Default lokal `development` dan `3000`. |
| Backend | `PAYMENT_TIMEOUT_MINUTES` | Batas pembayaran pesanan online. Default 15 menit. |
| Backend | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Koneksi Storage privat. Dibutuhkan untuk penyimpanan foto di produksi. |
| Backend | `SUPABASE_STORAGE_BUCKET`, `SUPABASE_PROFILE_STORAGE_BUCKET` | Nama bucket foto produk dan foto profil. Default `product-images` dan `profile-images`. |
| Backend | `DEMO_ADMIN_PASSWORD`, `DEMO_CASHIER_PASSWORD`, `DEMO_CUSTOMER_PASSWORD` | Password yang ditentukan saat membuat akun demo lewat seed. |
| Frontend | `VITE_API_URL` | Alamat dasar API. Gunakan `/api` untuk proxy lokal dan deploy Vercel. |

BagDaily berjalan di dua proyek Vercel dengan Root Directory `backend` dan `frontend`. Backend memakai `NODE_ENV=production` dan `FRONTEND_URL=https://bagdaily.vercel.app`. Konfigurasi [frontend/vercel.json](frontend/vercel.json) meneruskan `/api` ke `https://api-bagdaily.vercel.app`. Untuk deploy ke domain lain, sesuaikan `FRONTEND_URL` di proyek backend dan tujuan rewrite di konfigurasi frontend.

## Demo dan dokumentasi

Buka [halaman Login BagDaily](https://bagdaily.vercel.app/login), klik **Demo Akun**, lalu pilih **Pelanggan**, **Admin**, atau **Kasir**. Pelanggan dapat menjelajahi toko dan membuka Pesanan Saya, admin dapat membuka dasbor serta laporan, dan kasir dapat mencoba antarmuka POS.

Untuk mendemonstrasikan alur utama, pilih satu produk yang stoknya tersedia. Catat stok awal di admin, selesaikan pembayaran simulasi sebagai pelanggan, lalu jual produk yang sama lewat POS. Buka kembali inventaris dan laporan untuk melihat pengurangan stok serta catatan penjualan di kedua kanal.

- [Setup backend](backend/README.md) dan [kontrak API](backend/API-CONTRACT.md)
- [Skema database](database/documentation/schema.md) dan [dataset simulasi](database/demo/README.md)
- [Perhitungan keuntungan](docs/profit-calculation.md) dan [aturan poin member](docs/membership-plan.md)

### Tangkapan layar

![Beranda toko online BagDaily](docs/screenshots/storefront.png)

[Lihat dashboard admin](docs/screenshots/admin.png) · [Lihat POS kasir](docs/screenshots/pos.png)

## Pemeriksaan

```powershell
npm run typecheck
npm run test
npm run build
```
