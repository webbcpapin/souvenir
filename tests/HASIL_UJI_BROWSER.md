# Hasil uji browser — 8 Oktober 2026

Kode produksi dites melalui browser Chrome, frontend lokal pada port 8768, popup backend tiruan pada port 8770, dan HTML Service tiruan pada port 8771. Backend menjalankan Code.gs nyata dengan layanan Google yang dimock serta database memori terpisah. Semua perubahan menggunakan TEST-BROWSER. Tidak ada transaksi atau penghapusan pada stok operasional.

| Alur | Hasil |
| --- | --- |
| Home → Masuk Arsip | Membuka tengah.html pada origin frontend yang sama |
| Popup lintas origin + iframe Google tiruan | Handshake, RPC, respons sukses/error terbaca; UI tetap pada frontend |
| Muat katalog | 22 barang dari backend simulasi; satuan terpisah |
| Tambah TEST-BROWSER | Kartu ke-23 muncul dengan renderer yang sama; saldo awal 2 buah |
| Edit nama | Nama Uji Setelah Edit tampil pada kartu, pilihan, dan riwayat |
| Reload halaman | Setelah Hubungkan Google kembali, barang dan nama hasil edit tetap tersedia |
| Barang masuk | +3, stok 2 → 5 |
| Keluar berlebih | 6 dari stok 5 ditolak validasi browser; backend juga diuji menolak |
| Barang keluar | 5, stok 5 → 0 |
| Batal hapus | Barang tetap aktif |
| Hapus stok nol | Barang pindah ke Nonaktif |
| Restore | Barang tampil kembali; saldo tetap nol |
| Riwayat | Saldo awal, masuk, dan keluar tetap tersedia setelah hapus/restore |
| Respons hilang setelah commit | Formulir mempertahankan request_id/body; retry sukses tanpa menggandakan stok |
| Retry tambahan | Backend mengembalikan duplicate:true, stok tetap 1 buah |
| Akun simulasi tanpa izin | Data ditolak; kartu dan stok lama disembunyikan; operasi nonaktif |
| Desktop | Latar, header, kartu oranye, dan tombol tetap sesuai desain dasar |
| Lebar 390 px | Iframe viewport 390 px, document client/scroll 375/375; kartu panjang berakhir pada x355; dialog 347 px, scroll/client 332/332 |
| Nama/foto leaflet | Empat foto diperiksa: PCMMEA memakai leaflet1, pak PCHPTL/PCREL leaflet2, lepasan leaflet3, PCHT leaflet4 |

Pengujian otomatis: 15 backend, 2 protokol postMessage, 5 regresi frontend/build. Build dijalankan ulang; output identik dan navigasi lokal/nama yang benar tetap ada.

Batasan spesifik:

- Pembacaan stok pada halaman Apps Script produksi lama berhasil dengan akun pengelola. Ini hanya bukti backend lama dapat dibaca, bukan uji Pages → Bridge baru → Google Sheets.
- Deployment produksi masih versi lama; route page=bridge belum tersedia. Pembaruan Code.gs dan penambahan Bridge.html harus dilakukan pengelola sesuai instruksi README. Kebijakan Google opener/COOP, login, dan hasil simpan lintas domain pada deployment baru belum diverifikasi langsung.
- Unggah foto melalui browser otomatis gagal karena ekstensi ChatGPT belum mengizinkan akses file URL. Tidak mengubah izin ekstensi. Tambah dengan foto, penggantian foto, persistensi file, pembatasan format/ukuran dan folder berhasil pada uji backend mock dengan file PNG nyata; tidak diklaim sebagai upload Drive nyata.
- Override viewport ekstensi tidak mengubah lebar halaman; pengujian mobile menggunakan iframe uji 390 px yang benar-benar terukur. Iframe ini hanya fixture lokal, bukan arsitektur aplikasi produksi.
- Migrasi nama/foto tidak dijalankan terhadap database operasional; tidak melakukan reseed atau mereset stok.

Bukti screenshot lokal ada di folder induk workspace: souvenir-pages-test-desktop.png, souvenir-pages-test-mobile.png.
