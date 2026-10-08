# Arsip Suvenir Bea Cukai Pangkalpinang

Website: https://webbcpapin.github.io/souvenir/
Repositori: https://github.com/webbcpapin/souvenir

Tampilan utama mengikuti `vscode.zip`: halaman masuk, latar, header, running text, kartu oranye, dan CSS dasar. Home membuka `tengah.html` pada GitHub Pages. Katalog, tambah, edit, masuk/keluar, hapus/nonaktif, pemulihan, dan riwayat dirender di Pages. Nama dari Sheets menjadi sumber utama; seluruh barang menggunakan renderer yang sama. Tidak ada saldo sumber yang ditampilkan sebagai stok terkini ketika koneksi gagal. Ringkasan stok dipisahkan menurut satuan.

## Pembaruan Apps Script yang diperlukan

**Frontend baru memerlukan `Code.gs` terbaru dan file baru `Bridge.html`. Deployment lama v3 belum menyediakan route bridge.** Pembaruan Apps Script dilakukan oleh pengelola, sesuai permintaan. Jangan membuat spreadsheet, folder, atau deployment URL baru.

1. Buka proyek souvenir yang sudah ada: https://script.google.com/home/projects/1uzz2anHVZbOomv7F9R9tOgJ9fLXO1Yz_h-REE8R4H3bUca_giJQiiPbB/edit
2. Ganti isi `Code.gs` dengan `apps-script/Code.gs`. Tambahkan berkas HTML bernama **Bridge** dengan isi `apps-script/Bridge.html`. Nama di editor menjadi `Bridge.html`.
3. Tambahkan berkas Script **Migration** dari `apps-script/Migration.gs`. Pertahankan `Seed.gs` dan Script Properties yang sekarang. Paket lengkap juga memuat `Index`, `Styles`, `Client`, dan `Home` terbaru jika halaman lama Apps Script tetap dibutuhkan. `appsscript.json` mempertahankan Sheets API v4 dan izin yang sudah digunakan.
4. Simpan, pilih **Deploy → Manage deployments → Edit → New version → Deploy** pada deployment aktif. Pertahankan **Execute as: User accessing the web app**, **Who has access: Anyone with Google account**, dan URL `/exec` yang sama. Jangan mengganti menjadi execute as owner atau membuka data tanpa pemeriksaan akun.
5. Buka website Pages → Masuk Arsip → **Hubungkan Google**. Izinkan popup untuk website tersebut. Selesaikan login/izin Google bila diperlukan dan biarkan jendela koneksi terbuka. Semua operasi tetap dikerjakan melalui formulir Pages. Jika sesudah login koneksi belum siap, tutup popup dan tekan Hubungkan Google lagi.

URL backend tetap:
https://script.google.com/macros/s/AKfycbx3nGCpNcyp6uIUXtczvOi8NvoRnjYY2F9KcEVhDtDGm-ht5yFw8hAIfiQLr_mxa_P5/exec

Database tetap `1b4lPrq0HWIn4QDqYQ63VcVC6JZNWZAZP7051JKtyGE0`. Folder foto tetap `1h6vz-ORzURJn7hP4gmigDu-MuKmPhYRT`. Jangan menjalankan ulang impor saldo awal. `setupArsip_` hanya diperlukan untuk database kosong, bukan pembaruan ini.

## Komunikasi dan akses

`backend-transport.js` membuka popup resmi Apps Script ke `doGet?page=bridge&channel=<random UUID>`. `Bridge.html` hanya berisi status koneksi dan penerus RPC; tidak memuat katalog tersembunyi. Kartu dan dialog tetap berada dalam DOM GitHub Pages. Popup memanggil `google.script.run`, yang hanya tersedia pada HTML Service Google. Pages tidak menganggap API tersebut tersedia. Mode native hanya untuk kompatibilitas halaman Apps Script dan tes yang terpisah.

Pesan `postMessage` diperiksa berdasarkan origin HTTPS Google yang spesifik, referensi jendela popup/parent, channel acak, dan ID permintaan. Bridge menerima hanya origin `https://webbcpapin.github.io` dan daftar tindakan yang ditentukan. Balasan terstruktur memuat `ok`, `data`, atau `error`. Tidak ada `no-cors`, fetch langsung lintas domain ke endpoint Google, token admin, atau kata sandi dalam frontend. Redirect/login Google berlangsung di popup; pemanggilan server dilakukan oleh runtime resmi Google, bukan respons CORS yang tidak terbaca. Pengaman frame default Apps Script tetap digunakan; tidak memakai ALLOWALL.

`authorize_()` memeriksa email Google server-side **pada setiap operasi dan pembacaan foto** terhadap `ALLOWED_EMAILS` di Script Properties. Pengguna yang diizinkan juga harus memiliki akses ke Sheet dan folder Drive karena aplikasi berjalan sebagai pengguna yang mengakses. Sumber daya tersebut tidak perlu dijadikan publik. Akun di luar daftar ditolak. Jika email kosong, periksa akun Google, izin OAuth, daftar akses, dan mode execute-as pada deployment.

Popup yang ditutup memutuskan koneksi; katalog menyembunyikan stok lama dan menonaktifkan operasi sampai muat ulang berhasil. Browser mungkin membutuhkan login sekali lagi saat membuka koneksi. Permintaan dibatasi waktu. Bila respons simpan hilang, formulir menyimpan body dan `request_id` yang sama serta membekukan kolom; tombol Simpan dapat dipakai lagi untuk memeriksa hasil tanpa transaksi ganda. Jangan menutup formulir dan membuat transaksi baru jika hasil sebelumnya belum jelas.

Dokumentasi resmi: [Web apps / identitas eksekusi](https://developers.google.com/apps-script/guides/web), [komunikasi HTML Service](https://developers.google.com/apps-script/guides/html/communication), [Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).

## Barang, foto, dan konsistensi

Tambah: kode unik, nama, kategori, satuan, saldo awal, minimum, lokasi, catatan, foto opsional. PNG/JPEG/WebP maksimal 2 MB; frontend menampilkan pratinjau, backend memeriksa MIME dan signature. Foto baru tersimpan privat di folder Drive aplikasi. Data barang dan transaksi awal disimpan dalam satu batch Sheets. Edit mengganti identitas/foto tanpa mengganti stok, kode, atau satuan. Stok berubah lewat transaksi.

Hapus: konfirmasi nama/kode/stok, backend menolak stok bukan nol; `active=0` disimpan bersama Audit `delete`, waktu, email, dan request ID. Pemulihan memakai Audit `restore`. Barang nonaktif tidak muncul di pilihan transaksi. Riwayat dan foto tidak dihapus. LockService, batch atomik Sheets, pemeriksaan versi, dan dedup ID+hash tetap digunakan. Photo create dan batch Sheets bukan satu transaksi lintas layanan: jika batch gagal setelah upload, berkas foto yang belum terhubung dapat tertinggal; tidak ada penghapusan otomatis.

Nama sumber dan alt diperbaiki. Foto cadangan: PCHT `leaflet4.png`, PCHPTL/PCREL pak `leaflet2.png`, PCMMEA `leaflet1.png`, PCHPTL/PCREL lepasan `leaflet3.png`. Satuan operasional tidak diganti berdasarkan gambar. Gambar awal tetap memakai aset yang sudah publik di repositori sampai memiliki referensi Drive; foto yang diunggah menggantikannya setelah backend berhasil menyimpan.

Migrasi opsional: `migrateKnownCorrections_` hanya memperbaiki alias salah yang dikenal pada kode tertentu dan referensi awal PCMMEA. Nama hasil edit pengguna yang berbeda dipertahankan, stok/ID/kode/satuan/transaksi tidak berubah, Audit dicatat. Foto Drive hanya diganti bila terbukti berasal dari sinkronisasi foto awal dengan nama berkas yang salah; foto unggahan pengguna dipertahankan. Untuk menjalankan fungsi privat melalui menu editor, tambahkan sementara `function runMigrationOnce(){ return migrateKnownCorrections_(); }`, jalankan dari akun yang diizinkan, lalu hapus wrapper dan simpan sebelum deployment. Pengulangan migrasi tidak membuat koreksi ganda. Migrasi belum dijalankan pada data operasional.

## Build dan pengujian

```
python build_frontend.py
python tests/test_frontend.py
node tests/test_backend.cjs
node tests/test_transport.cjs
node tests/serve_frontend_check.cjs
```

Server uji: `http://127.0.0.1:8768/`; kontrol akun/fault `http://127.0.0.1:8771/__check`; viewport iframe 390 px `http://127.0.0.1:8768/mobile`. Semua memakai mock layanan Google dan database memori terpisah. Origin dan URL backend diganti **hanya dalam respons server fixture**, tidak dalam berkas produksi. Popup uji memiliki wrapper Google tiruan dan iframe lintas origin; kode Bridge dan transport yang sama digunakan. Hentikan server setelah pengujian.

15 pengujian backend, 2 pemeriksaan protokol, dan 5 regresi frontend/build lulus. Browser lokal memverifikasi navigasi, katalog dinamis, tambah/edit, persistensi setelah reload, masuk/keluar, penolakan kelebihan stok, batal hapus, hapus stok nol, restore, riwayat, penolakan akun simulasi, dan retry setelah respons hilang tanpa menggandakan transaksi. Lihat `tests/HASIL_UJI_BROWSER.md` untuk bukti dan batasan.

**Belum merupakan uji produksi end-to-end.** Deployment Apps Script lama tidak memiliki Bridge baru; pengelola perlu memperbaruinya. Login Google, kebijakan COOP/opener Google, dan hasil simpan melalui koneksi Pages pada deployment baru belum dapat dinyatakan lulus sampai pembaruan itu dilakukan. Backend lama dapat dibaca melalui halaman Apps Script, tetapi itu bukan pembuktian transport Pages baru. Tidak ada stok operasional yang diubah dalam pengujian ini.

Unggah foto browser otomatis terhalang ekstensi ChatGPT karena **Allow access to file URLs** belum aktif. Ini membatasi alat uji, bukan izin upload pengguna aplikasi. Uji penyimpanan dan penggantian foto lulus dengan mock backend memakai berkas PNG nyata. Uji foto browser/Drive nyata masih perlu dijalankan setelah deployment. Petunjuk alat: https://developers.openai.com/codex/app/chrome-extension#upload-files
