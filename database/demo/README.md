# Data simulasi BagDaily September–November 2026

Batch `SIM-GTNIC-2026`: 40 transaksi, 71 tas, 20 online dengan pengiriman dan 20 POS (8 terdaftar, 12 umum). Semua selesai dan lunas. Nomor BD-SIM-2026-* menandai data demonstrasi; nama, email dan alamat tampil sederhana sesuai permintaan pengguna.

Nilai barang Rp14.620.000 + ongkir Rp398.000 = Rp15.018.000.

## Akun pelanggan

Password kelima akun: `pelanggan`. Password disimpan sebagai hash bcrypt di database. Nomor telepon dan alamat di bawah adalah data simulasi.

| Nama | Email | Telepon | Zona | Alamat |
|---|---|---|---|---|
| Aulia | aulia@gmail.com | 080000000001 | Jabodetabek | Jl. Melati No. 10, Tebet, Jakarta Selatan, DKI Jakarta |
| Bima | bima@gmail.com | 080000000002 | Jabodetabek | Jl. Kenanga No. 20, Bekasi Barat, Kota Bekasi, Jawa Barat |
| Citra | citra@gmail.com | 080000000003 | Jawa | Jl. Anggrek No. 30, Coblong, Kota Bandung, Jawa Barat |
| Dimas | dimas@gmail.com | 080000000004 | Jawa | Jl. Mawar No. 40, Gondokusuman, Kota Yogyakarta, DI Yogyakarta |
| Nadia | nadia@gmail.com | 080000000005 | Luar Jawa | Jl. Flamboyan No. 50, Panakkukang, Kota Makassar, Sulawesi Selatan |

## Transaksi terverifikasi

| Nomor | Tanggal WIB | Kanal | Pelanggan | Produk | Qty | Barang | Kurir / zona | Ongkir | Total |
|---|---|---|---|---|---:|---:|---|---:|---:|
| BD-SIM-2026-0001 | 2/9/2026, 09.00.00 | online | aulia@gmail.com | Lino Shopper Tote | 2 | Rp320.000 | JNE / Jabodetabek | Rp15.000 | Rp335.000 |
| BD-SIM-2026-0002 | 4/9/2026, 10.13.00 | pos | Pelanggan umum | Kiro Flap Sling | 2 | Rp460.000 | — | Rp0 | Rp460.000 |
| BD-SIM-2026-0003 | 6/9/2026, 11.26.00 | online | citra@gmail.com | Hana Mini Tote | 2 | Rp220.000 | SiCepat / Jawa | Rp19.000 | Rp239.000 |
| BD-SIM-2026-0004 | 8/9/2026, 12.39.00 | pos | dimas@gmail.com | Ayo Stripe Tote | 2 | Rp300.000 | — | Rp0 | Rp300.000 |
| BD-SIM-2026-0005 | 10/9/2026, 13.52.00 | online | nadia@gmail.com | Mika Pocket Tote | 2 | Rp280.000 | J&T / Luar Jawa | Rp32.000 | Rp312.000 |
| BD-SIM-2026-0006 | 12/9/2026, 09.05.00 | pos | Pelanggan umum | Hana Mini Tote | 1 | Rp110.000 | — | Rp0 | Rp110.000 |
| BD-SIM-2026-0007 | 13/9/2026, 10.18.00 | online | aulia@gmail.com | Kuma Zip Tote | 1 | Rp150.000 | JNE / Jabodetabek | Rp15.000 | Rp165.000 |
| BD-SIM-2026-0008 | 15/9/2026, 11.31.00 | pos | Pelanggan umum | Nara Sling | 2 | Rp360.000 | — | Rp0 | Rp360.000 |
| BD-SIM-2026-0009 | 16/9/2026, 12.44.00 | online | citra@gmail.com | Kiro Flap Sling | 1 | Rp230.000 | SiCepat / Jawa | Rp19.000 | Rp249.000 |
| BD-SIM-2026-0010 | 17/9/2026, 13.57.00 | pos | dimas@gmail.com | Kavi Campus Pack | 3 | Rp720.000 | — | Rp0 | Rp720.000 |
| BD-SIM-2026-0011 | 18/9/2026, 09.10.00 | online | nadia@gmail.com | Sora Canvas Tote | 2 | Rp240.000 | J&T / Luar Jawa | Rp32.000 | Rp272.000 |
| BD-SIM-2026-0012 | 25/9/2026, 10.23.00 | pos | Pelanggan umum | Mero Daypack | 2 | Rp540.000 | — | Rp0 | Rp540.000 |
| BD-SIM-2026-0013 | 27/9/2026, 11.36.00 | online | bima@gmail.com | Talo Trail Pack | 1 | Rp350.000 | JNE / Jabodetabek | Rp15.000 | Rp365.000 |
| BD-SIM-2026-0014 | 28/9/2026, 12.49.00 | pos | Pelanggan umum | Ayo Stripe Tote | 2 | Rp300.000 | — | Rp0 | Rp300.000 |
| BD-SIM-2026-0015 | 29/9/2026, 13.02.00 | online | dimas@gmail.com | Lino Shopper Tote | 1 | Rp160.000 | SiCepat / Jawa | Rp19.000 | Rp179.000 |
| BD-SIM-2026-0016 | 30/9/2026, 09.15.00 | pos | nadia@gmail.com | Kiro Flap Sling | 2 | Rp460.000 | — | Rp0 | Rp460.000 |
| BD-SIM-2026-0017 | 1/10/2026, 10.28.00 | online | bima@gmail.com | Ayo Stripe Tote | 3 | Rp450.000 | J&T / Jabodetabek | Rp13.000 | Rp463.000 |
| BD-SIM-2026-0018 | 3/10/2026, 11.41.00 | pos | citra@gmail.com | Lino Shopper Tote | 1 | Rp160.000 | — | Rp0 | Rp160.000 |
| BD-SIM-2026-0019 | 5/10/2026, 12.54.00 | online | aulia@gmail.com | Rhea Mini Pack | 2 | Rp400.000 | JNE / Jabodetabek | Rp15.000 | Rp415.000 |
| BD-SIM-2026-0020 | 6/10/2026, 13.07.00 | pos | Pelanggan umum | Zeno Laptop Pack | 2 | Rp760.000 | — | Rp0 | Rp760.000 |
| BD-SIM-2026-0021 | 7/10/2026, 09.20.00 | online | citra@gmail.com | Zeno Laptop Pack | 1 | Rp380.000 | SiCepat / Jawa | Rp19.000 | Rp399.000 |
| BD-SIM-2026-0022 | 8/10/2026, 10.33.00 | pos | Pelanggan umum | Lumi Mini Sling | 1 | Rp130.000 | — | Rp0 | Rp130.000 |
| BD-SIM-2026-0023 | 9/10/2026, 11.46.00 | online | dimas@gmail.com | Kavi Campus Pack | 1 | Rp240.000 | J&T / Jawa | Rp20.000 | Rp260.000 |
| BD-SIM-2026-0024 | 11/10/2026, 12.59.00 | online | nadia@gmail.com | Orin Roll-Top Pack | 3 | Rp960.000 | SiCepat / Luar Jawa | Rp30.000 | Rp990.000 |
| BD-SIM-2026-0025 | 12/10/2026, 13.12.00 | pos | Pelanggan umum | Kuma Zip Tote | 1 | Rp150.000 | — | Rp0 | Rp150.000 |
| BD-SIM-2026-0026 | 14/10/2026, 09.25.00 | pos | aulia@gmail.com | Hana Mini Tote | 2 | Rp220.000 | — | Rp0 | Rp220.000 |
| BD-SIM-2026-0027 | 16/10/2026, 10.38.00 | online | aulia@gmail.com | Talo Trail Pack | 3 | Rp1.050.000 | SiCepat / Jabodetabek | Rp12.000 | Rp1.062.000 |
| BD-SIM-2026-0028 | 19/10/2026, 11.51.00 | pos | bima@gmail.com | Tavo Utility Sling | 1 | Rp200.000 | — | Rp0 | Rp200.000 |
| BD-SIM-2026-0029 | 20/10/2026, 12.04.00 | online | bima@gmail.com | Orin Roll-Top Pack | 1 | Rp320.000 | J&T / Jabodetabek | Rp13.000 | Rp333.000 |
| BD-SIM-2026-0030 | 22/10/2026, 13.17.00 | pos | Pelanggan umum | Tavo Utility Sling | 2 | Rp400.000 | — | Rp0 | Rp400.000 |
| BD-SIM-2026-0031 | 24/10/2026, 09.30.00 | online | dimas@gmail.com | Mika Pocket Tote | 3 | Rp420.000 | JNE / Jawa | Rp22.000 | Rp442.000 |
| BD-SIM-2026-0032 | 25/10/2026, 10.43.00 | online | citra@gmail.com | Kuma Zip Tote | 2 | Rp300.000 | J&T / Jawa | Rp20.000 | Rp320.000 |
| BD-SIM-2026-0033 | 29/10/2026, 11.56.00 | pos | Pelanggan umum | Talo Trail Pack | 2 | Rp700.000 | — | Rp0 | Rp700.000 |
| BD-SIM-2026-0034 | 31/10/2026, 12.09.00 | pos | Pelanggan umum | Hana Mini Tote | 3 | Rp330.000 | — | Rp0 | Rp330.000 |
| BD-SIM-2026-0035 | 1/11/2026, 13.22.00 | online | aulia@gmail.com | Arlo Crossbody | 2 | Rp300.000 | J&T / Jabodetabek | Rp13.000 | Rp313.000 |
| BD-SIM-2026-0036 | 2/11/2026, 09.35.00 | pos | bima@gmail.com | Mero Daypack | 1 | Rp270.000 | — | Rp0 | Rp270.000 |
| BD-SIM-2026-0037 | 2/11/2026, 10.48.00 | online | nadia@gmail.com | Talo Trail Pack | 2 | Rp700.000 | JNE / Luar Jawa | Rp35.000 | Rp735.000 |
| BD-SIM-2026-0038 | 3/11/2026, 11.01.00 | online | citra@gmail.com | Hana Mini Tote | 2 | Rp220.000 | J&T / Jawa | Rp20.000 | Rp240.000 |
| BD-SIM-2026-0039 | 4/11/2026, 12.14.00 | pos | Pelanggan umum | Dova Pocket Sling | 1 | Rp160.000 | — | Rp0 | Rp160.000 |
| BD-SIM-2026-0040 | 4/11/2026, 13.27.00 | pos | aulia@gmail.com | Tavo Utility Sling | 1 | Rp200.000 | — | Rp0 | Rp200.000 |

## Stok dan pengujian

Penjualan historis dicatat pada tanggal transaksi. Mutasi inventaris dicatat saat impor, dengan catatan batch dan nomor transaksi; riwayat stok lama tidak ditulis ulang. Restock persiapan hanya ditambahkan bila dibutuhkan untuk menutup penjualan simulasi dan menyisakan stok di atas batas minimum. Setiap penjualan memiliki satu mutasi pengurangan stok yang terhubung ke order.

Dari backend/: `npm run demo:sales` untuk pratinjau, `npm run demo:sales -- --apply` untuk impor idempoten, dan `npm run demo:sales -- --check` untuk verifikasi baca saja. Impor ulang tidak menggandakan transaksi atau mereset password.

Untuk memeriksa semua bulan di dashboard/laporan, pilih rentang 1 September–4 November 2026. Rentang bawaan web hanya 30 hari terakhir. Nilai laporan seluruh toko juga mencakup transaksi lama di luar batch ini.
