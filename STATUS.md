# Status Implementasi SPMB

Pembaruan terakhir: 20 November 2026.

## Tahap 1 — Error pendaftaran siswa

**Sebagian selesai.** Di lingkungan saat ini, `/siswa/pendaftaran` berhasil dimuat dengan akun SISWA dan tidak menghasilkan error browser. `pnpm prisma migrate status` melaporkan skema sudah mutakhir, dan `pnpm db:seed` selesai. Error boundary khusus portal siswa kini menampilkan instruksi pemulihan dan kode referensi tanpa membocorkan detail internal. Akar error yang dilaporkan belum dapat dipastikan karena tidak muncul saat reproduksi; jika berulang, perlu pesan terminal atau kode referensinya.

## Tahap 2 — Auth dan pintu masuk

**Selesai.** Gerbang tiga portal, login terpisah dan pemeriksaan role, redirect relatif, reset password, skrip staf, serta masuk cepat development tersedia. Login siswa kini mencari NISN pada kolom NISN dan kolom NIK lama; pendaftaran menjaga keunikan NISN. Jika Upstash belum dikonfigurasi, pembatasan laju memakai memori proses dengan peringatan yang jelas. Tiga portal demo, logout, dan pengalihan role diuji manual.

## Tahap 3 — Portal siswa

**Sebagian selesai.** Dashboard, formulir lima tahap, dokumen, pembayaran, hasil, pengumuman, notifikasi, dan profil memakai data Prisma. Aksi formulir/notifikasi/profil/ujian menampilkan pesan saat server action gagal; storage yang belum dikonfigurasi mengembalikan 503 yang jelas. Magic bytes diuji menolak berkas palsu dan rute siswa diuji tanpa error halaman. Upload nyata dan signed URL belum dapat diuji karena seluruh `AWS_*` belum dikonfigurasi.

## Tahap 4 — Admin inti

**Sebagian selesai.** Dashboard memakai agregasi Prisma. Pendaftaran sekarang memiliki pencarian/filter/paginasi server-side, detail data siswa, ekspor Excel, dan penambahan manual sebagai draf. Antrean berkas mendukung viewer privat, persetujuan/perbaikan, notifikasi siswa, dan AuditLog. Pembayaran menampilkan transaksi, mendukung konfirmasi transfer manual, serta pengaturan biaya/rekening. Pengumuman dapat dibuat, ditargetkan per periode, diedit, dijadwalkan, dan menerbitkan notifikasi untuk publikasi langsung. Penayangan terjadwal mengikuti waktu `publishedAt`, tetapi pengiriman notifikasi terjadwal belum memiliki worker/scheduler; unggah bukti dan verifikasi berkas nyata belum dapat diuji tanpa storage terkonfigurasi.

## Tahap 5 — Tes dan seleksi

**Sebagian selesai.** Admin dapat mengelola kategori/soal pilihan ganda A–D, mengimpor soal Excel dengan laporan kesalahan, mengunduh templat, membuat paket dan sesi, menempatkan peserta yang memenuhi syarat, serta meninjau kelayakan. Ujian menyimpan jawaban melalui aksi server, tidak mengirim kunci jawaban ke klien, dan menilai otomatis saat dikirim atau sesi ditutup. Seleksi menghitung komponen TKA 60%, rapor 30%, prestasi 10%, menyusun draf/status/kuota per jalur, lalu memublikasikan hasil secara transaksional dengan notifikasi dan AuditLog. Lint, typecheck, build, dan render halaman utama Admin Tes/Seleksi lulus. Impor dan mutasi nyata belum diuji menyeluruh. Belum tersedia model skor prestasi, sehingga komponen prestasi saat ini menggunakan bukti yang disetujui (100/0); cadangan dibatasi 10% kuota (minimal satu jika kuota tidak nol). Kedua kebijakan tersebut perlu persetujuan pemilik produk.

## Tahap 6 — Kepala sekolah dan laporan

**Sebagian selesai.** Dashboard monitoring dan kerangka baca-saja sudah tersedia; isi data dan ekspor laporan perlu diaudit.

## Tahap 7 — Penutup

**Belum selesai.** Smoke test lintas rute, alur ujung ke ujung, validasi bersih, dan ringkasan akhir masih diperlukan.

## Bug diketahui

- Error pendaftaran yang dilaporkan tidak muncul pada reproduksi saat ini; akar masalahnya belum teridentifikasi.
- Ketersediaan layanan email, penyimpanan, pembatasan laju, dan pembayaran perlu diverifikasi terhadap konfigurasi aktual serta fallback-nya.
