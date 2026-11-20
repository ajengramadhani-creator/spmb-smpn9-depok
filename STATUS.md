# Status Implementasi SPMB

Pembaruan terakhir: 20 November 2026.

## Tahap 1 — Error pendaftaran siswa

**Sebagian selesai.** Di lingkungan saat ini, `/siswa/pendaftaran` berhasil dimuat dengan akun SISWA dan tidak menghasilkan error browser. `pnpm prisma migrate status` melaporkan skema sudah mutakhir, dan `pnpm db:seed` selesai. Error boundary khusus portal siswa kini menampilkan instruksi pemulihan dan kode referensi tanpa membocorkan detail internal. Akar error yang dilaporkan belum dapat dipastikan karena tidak muncul saat reproduksi; jika berulang, perlu pesan terminal atau kode referensinya.

## Tahap 2 — Auth dan pintu masuk

**Selesai.** Gerbang tiga portal, login terpisah dan pemeriksaan role, redirect relatif, reset password, skrip staf, serta masuk cepat development tersedia. Login siswa kini mencari NISN pada kolom NISN dan kolom NIK lama; pendaftaran menjaga keunikan NISN. Jika Upstash belum dikonfigurasi, pembatasan laju memakai memori proses dengan peringatan yang jelas. Tiga portal demo, logout, dan pengalihan role diuji manual.

## Tahap 3 — Portal siswa

**Sebagian selesai.** Dashboard, formulir lima tahap, dokumen, pembayaran, hasil, pengumuman, notifikasi, dan profil sudah memiliki implementasi berbasis Prisma. Alur ujung ke ujung dan fallback layanan eksternal belum divalidasi pada rangkaian tugas ini.

## Tahap 4 — Admin inti

**Sebagian selesai.** Dashboard dan halaman dasar admin tersedia; kelengkapan pencarian, filter, paginasi, ekspor, tindakan verifikasi, dan konfigurasi perlu diaudit.

## Tahap 5 — Tes dan seleksi

**Belum diaudit.** Kelengkapan CRUD, keamanan ujian, penilaian, kuota, publikasi transaksional, dan notifikasi perlu diperiksa.

## Tahap 6 — Kepala sekolah dan laporan

**Sebagian selesai.** Dashboard monitoring dan kerangka baca-saja sudah tersedia; isi data dan ekspor laporan perlu diaudit.

## Tahap 7 — Penutup

**Belum selesai.** Smoke test lintas rute, alur ujung ke ujung, validasi bersih, dan ringkasan akhir masih diperlukan.

## Bug diketahui

- Error pendaftaran yang dilaporkan tidak muncul pada reproduksi saat ini; akar masalahnya belum teridentifikasi.
- Ketersediaan layanan email, penyimpanan, pembatasan laju, dan pembayaran perlu diverifikasi terhadap konfigurasi aktual serta fallback-nya.
