# Souvenir

Website Arsip Souvenir Kantor Pengawasan dan Pelayanan Bea dan Cukai Tipe Madya Pabean C Pangkalpinang.

Website: https://webbcpapin.github.io/souvenir/

## Aplikasi persediaan

Tombol **Masuk Arsip** pada GitHub Pages membuka [aplikasi Google Apps Script](https://script.google.com/macros/s/AKfycbx3nGCpNcyp6uIUXtczvOi8NvoRnjYY2F9KcEVhDtDGm-ht5yFw8hAIfiQLr_mxa_P5/exec). Aplikasi memakai Google Sheets untuk barang, stok, transaksi, dan audit; foto disimpan di Google Drive. Pengguna masuk dengan akun Google yang diberi akses oleh pengelola.

Kode terbaru dari `vscode (baru).zip` tersedia di `apps-script/`: `Code.gs`, `Seed.gs`, `Index.html`, `Styles.html`, `Client.html`, dan `appsscript.json`. Salin semua berkas ke proyek Apps Script dengan nama yang sama. HTML di Apps Script dinamai `Index`, `Styles`, dan `Client`. GitHub Pages hanya menyediakan halaman masuk; aplikasi persediaan dijalankan oleh Apps Script.

`Code.gs` sudah dikonfigurasi memakai spreadsheet dan folder foto yang diberikan pengelola. Pembaruan Apps Script dan deployment ditangani pengelola. Ikuti `PETUNJUK_AKTIVASI.txt` untuk setup, layanan Sheets API, sinkronisasi foto, dan pembaruan versi deployment.

Foto awal tersedia di `foto-awal/`. `tengah.html` merupakan katalog statis versi sebelumnya; angka di halaman itu tidak mengikuti transaksi pada Google Sheets.

## Pengujian lokal

Jalankan `node tests/test_backend.cjs`. Pengujian memakai mock layanan Google untuk memeriksa saldo, akses pengguna, validasi, audit, konflik versi, dan transaksi berulang. Pengujian ini tidak memverifikasi izin atau deployment Google yang sebenarnya.
