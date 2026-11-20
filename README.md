# SPMB SMPN 9 Depok

Portal penerimaan murid baru SMP Negeri 9 Depok tahun ajaran 2027/2028. Aplikasi menggunakan Next.js 15 App Router, TypeScript strict, Tailwind CSS, Prisma, Neon PostgreSQL, dan Auth.js.

## Persiapan lokal

Prasyarat: Node.js 20.12 atau lebih baru dan pnpm 9.

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env
```

Isi `DATABASE_URL` dengan connection string Neon pooled, `DIRECT_URL` dengan endpoint direct, dan buat `AUTH_SECRET` unik:

```powershell
openssl rand -base64 32
```

Atur `AWS_ENDPOINT`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, dan `AWS_SECRET_ACCESS_KEY` untuk Neon Object Storage yang kompatibel dengan S3. Buat bucket privat bernama `uploads` pada endpoint tersebut. Aplikasi menggunakan nama objek acak, validasi isi berkas, dan URL bertanda tangan berumur pendek; jangan membuat bucket ini publik.

> Untuk development, gunakan kata sandi demo acak milik lingkungan lokal pada `DEMO_PASSWORD` (minimal 12 karakter). Seed tidak membuat akun demo jika `NODE_ENV=production`.

## Neon dan Prisma

1. Buat proyek PostgreSQL di Neon.
2. Salin connection string pooled ke `DATABASE_URL` dan connection string non-pooled ke `DIRECT_URL`; pertahankan `sslmode=require`.
3. Terapkan migrasi dan isi data demo:

```powershell
pnpm db:deploy
pnpm db:seed
```

Seed menyiapkan periode 2027/2028, jalur Domisili (144), Prestasi (72), Afirmasi (58), Mutasi (14), total 288 kursi, data contoh, pengumuman, serta 20 soal TKA. Di luar production, seed juga membuat akun demo dengan `DEMO_PASSWORD` yang sama. Seed tidak memperbarui akun lain jika email demo sudah dimiliki akun yang berbeda.

## Akun staf dan autentikasi

Portal masuk terpisah tersedia di `/masuk` (siswa), `/admin/masuk` (administrator), dan `/kepsek/masuk` (kepala sekolah). Pendaftaran publik hanya membuat akun SISWA dan memerlukan verifikasi email. Atur `RESEND_API_KEY` dan `EMAIL_FROM` untuk pengiriman email verifikasi serta pemulihan kata sandi. Tautan reset kata sandi berlaku 30 menit dan hanya dapat digunakan sekali.

Portal ADMIN memiliki dashboard pendaftaran, verifikasi, pembayaran, dan aktivitas audit; tabel pendaftaran, pembayaran, serta pengumuman menampilkan data basis data. Bank soal, tes, kelayakan TKA, seleksi, laporan, dan verifikasi berkas masih berupa kerangka. Portal KEPSEK bersifat baca-saja; dashboard menampilkan progres tahapan dan kuota per jalur, sementara halaman laporan lain masih berupa kerangka. Semua halaman staf diperiksa kembali berdasarkan peran di server.

Buat akun ADMIN atau KEPSEK pertama di terminal pada lingkungan yang memiliki akses ke basis data. Masukkan email asli staf dan nama saat menjalankan perintah; kata sandi diminta secara interaktif tanpa ditampilkan:

```powershell
$EmailAdmin = Read-Host "Email asli administrator"
$NamaAdmin = Read-Host "Nama administrator"
pnpm create-staff "--role=ADMIN" "--email=$EmailAdmin" "--name=$NamaAdmin"

$EmailKepsek = Read-Host "Email asli kepala sekolah"
$NamaKepsek = Read-Host "Nama kepala sekolah"
pnpm create-staff "--role=KEPSEK" "--email=$EmailKepsek" "--name=$NamaKepsek"
```

Kata sandi staf minimal 12 karakter dan harus memuat huruf besar, huruf kecil, angka, serta simbol. Untuk mengatur ulang kata sandi staf, jalankan:

```powershell
$EmailStaf = Read-Host "Email akun staf"
pnpm reset-staff-password "--email=$EmailStaf"
```

**Sebelum go-live, hapus akun demo Nabila, Andi, dan Ratna dari basis data serta tinjau/hapus data pendaftar contoh.** Seed tidak membuat akun demo baru di production, tetapi tidak menghapus data demo yang sudah ada.

Untuk produksi, isi `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` agar pembatasan percobaan masuk, pendaftaran, dan pemulihan kata sandi terdistribusi. Tanpa Upstash, pembatasan memori hanya digunakan pada development. Midtrans menggunakan endpoint sandbox; pembayaran elektronik memerlukan `MIDTRANS_SERVER_KEY`.

## Menjalankan aplikasi

```powershell
pnpm dev
```

Buka `http://localhost:3000`. Periksa kualitas kode dengan `pnpm lint`, `pnpm typecheck`, dan `pnpm build`.

## Vercel

Impor repositori GitHub ke Vercel, gunakan preset Next.js, lalu masukkan variabel dari `.env.example` pada pengaturan proyek. Untuk produksi, gunakan `DATABASE_URL` pooled dan `DIRECT_URL` langsung ke Neon. Pastikan `AUTH_SECRET`, kredensial AWS, Resend, Midtrans, dan Upstash berasal dari penyimpanan secret; jangan masukkan nilai rahasia ke repositori. Berkas siswa disimpan di bucket privat dan hanya dibuka melalui URL bertanda tangan setelah pemeriksaan kepemilikan/peran. Atur perintah build `pnpm build` dan jalankan migrasi produksi melalui `pnpm db:deploy` sebelum mengalihkan trafik.

## GitHub

Simpan kode sumber dan perubahan schema di GitHub. Workflow `.github/workflows/ci.yml` menjalankan lint, pemeriksaan tipe, dan build pada setiap pull request serta push ke cabang utama. Tambahkan secret produksi pada GitHub Actions hanya bila workflow memerlukan akses ke layanan eksternal.

## Struktur utama

- `src/app`: halaman publik, autentikasi, API, dan portal siswa/admin/kepala sekolah
- `src/components`: komponen UI, layout, dan komponen bersama
- `src/lib`: database, autentikasi, validasi, RBAC, audit, penyimpanan S3 privat, email, dan PDF
- `src/server/services`: layanan domain pendaftaran, dokumen, pembayaran, seleksi, pengumuman, dan laporan
- `prisma`: skema dan seed basis data

Token visual utama: primary `#2563EB`, navy `#0F172A`, pale blue `#EFF6FF`, sky `#38BDF8`, latar `#F8FAFC`, serta radius utama 12 px. Halaman publik mengikuti token UI Kit. Referensi desain lokal tidak disertakan dalam commit; PDF yang tersedia di lingkungan pengembangan tidak dapat dirender atau diekstrak.