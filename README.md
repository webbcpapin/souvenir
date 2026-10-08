# Souvenir

Website Arsip Souvenir Kantor Pengawasan dan Pelayanan Bea dan Cukai Tipe Madya Pabean C Pangkalpinang.

Website: https://webbcpapin.github.io/souvenir/

## Frontend asli dan Google Sheets

Desain memakai `vscode.zip`: halaman pembuka, latar, header, foto, kartu oranye, teks berjalan, animasi, dan total stok dipertahankan. Katalog mendapat tiga kontrol: **Barang Masuk**, **Barang Keluar**, dan **Edit Barang**. Formulir terbuka di atas katalog. Stok diperbarui melalui transaksi masuk/keluar; edit mengubah nama, kategori, lokasi, catatan, batas minimum, dan foto.

Tombol **Masuk Arsip** membuka [katalog dengan backend Google Sheets](https://script.google.com/macros/s/AKfycbx3nGCpNcyp6uIUXtczvOi8NvoRnjYY2F9KcEVhDtDGm-ht5yFw8hAIfiQLr_mxa_P5/exec?page=katalog). Katalog dijalankan dalam Apps Script agar dapat memakai akun Google dan mengakses spreadsheet privat. URL `?page=beranda` menampilkan halaman pembuka asli. Pengguna harus masuk dengan akun yang ada dalam `ALLOWED_EMAILS` dan mempunyai akses ke spreadsheet serta folder foto.

`tengah.html` pada hosting statis adalah pratinjau saldo awal dengan tampilan yang sama. Tombol transaksinya membuka katalog aktif. Angka terkini dibaca dari Google Sheets pada katalog aktif; halaman statis tidak menyimpan transaksi lokal.

`frontend-source/` menyimpan HTML asli dengan pagar Markdown dan spasi akhir baris dibersihkan. `build_frontend.py` menghasilkan frontend statis dan template Apps Script dari sumber itu. `catalog-controls.css`, `catalog-dialogs.html`, dan `catalog-client.js` berisi penambahan kontrol serta integrasi. CSS utama dan foto katalog asli tidak diganti.

Backend tersedia di `apps-script/`: `Code.gs`, `Seed.gs`, `Home.html`, `Index.html`, `Styles.html`, `Client.html`, dan `appsscript.json`. Di editor Apps Script, berkas HTML dinamai `Home`, `Index`, `Styles`, dan `Client`. Salin seluruh berkas, simpan, lalu perbarui deployment yang sama dengan **New version**. Jangan menjalankan impor saldo awal lagi untuk pembaruan frontend.

Spreadsheet dan folder foto memakai ID yang sudah diberikan pengelola. Foto dari katalog asli dimuat dari aset website; foto pengganti yang disimpan melalui Edit Barang masuk ke Google Drive dan dibaca melalui backend. Data barang, stok, transaksi, dan audit tetap memakai database yang sama.

## Pengujian lokal

Jalankan `python tests/test_frontend.py` untuk memeriksa bahwa desain, foto, dan halaman pembuka asli tetap dipertahankan. Jalankan `node tests/test_backend.cjs` untuk memeriksa saldo, akses pengguna, validasi, audit, konflik versi, dan transaksi berulang dengan mock layanan Google. Pengujian mock tidak memverifikasi izin Google yang sebenarnya.
