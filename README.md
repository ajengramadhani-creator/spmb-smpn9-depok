# SPMB SMPN 9 Depok

Portal penerimaan murid baru SMP Negeri 9 Depok tahun ajaran 2027/2028. Aplikasi menggunakan Next.js 15 App Router, TypeScript strict, Tailwind CSS, Prisma, Neon PostgreSQL, dan Auth.js.

## Persiapan lokal

Prasyarat: Node.js 20 atau lebih baru dan pnpm 9.

```powershell
corepack enable
pnpm install
Copy-Item .env.example .env
```

Isi `DATABASE_URL` dengan connection string Neon pooled, `DIRECT_URL` dengan endpoint direct, dan buat `AUTH_SECRET` unik:

```powershell
openssl rand -base64 32
```

Buat `BLOB_ENCRYPTION_KEY` sebagai kunci Base64 32 byte untuk enkripsi dokumen:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

> Gunakan kata sandi demo acak milik lingkungan lokal pada `DEMO_PASSWORD` (minimal 12 karakter). Nilainya tidak disimpan di repositori.

## Neon dan Prisma

1. Buat proyek PostgreSQL di Neon.
2. Salin connection string pooled ke `DATABASE_URL` dan connection string non-pooled ke `DIRECT_URL`; pertahankan `sslmode=require`.
3. Jalankan migrasi awal dan isi data demo:

```powershell
pnpm db:migrate --name init
pnpm db:seed
```

Seed menyiapkan periode 2027/2028, jalur Domisili (144), Prestasi (72), Afirmasi (58), Mutasi (14), total 288 kursi, akun demo, contoh pendaftar, pengumuman, serta 20 soal TKA. Akun demo menggunakan `DEMO_PASSWORD` yang sama, dengan email `nabila@spmb.smpn9depok.sch.id`, `andi.rahman@spmb.smpn9depok.sch.id`, dan `ratna.wulandari@spmb.smpn9depok.sch.id`.

## Autentikasi dan email

Masuk menerima email atau NISN. Pendaftaran publik hanya membuat akun SISWA dan memerlukan verifikasi email; akun ADMIN dan KEPSEK dikelola melalui seed atau panel. Atur `RESEND_API_KEY` dan `EMAIL_FROM` untuk pengiriman email verifikasi serta pemulihan kata sandi. Tautan reset kata sandi berlaku 30 menit dan hanya dapat digunakan sekali.

Untuk produksi, isi `UPSTASH_REDIS_REST_URL` dan `UPSTASH_REDIS_REST_TOKEN` agar pembatasan percobaan masuk, pendaftaran, dan pemulihan kata sandi terdistribusi. Tanpa Upstash, pembatasan memori hanya digunakan pada development.

## Menjalankan aplikasi

```powershell
pnpm dev
```

Buka `http://localhost:3000`. Periksa kualitas kode dengan `pnpm lint`, `pnpm typecheck`, dan `pnpm build`.

## Vercel

Impor repositori GitHub ke Vercel, gunakan preset Next.js, lalu masukkan variabel dari `.env.example` pada pengaturan proyek. Untuk produksi, gunakan `DATABASE_URL` pooled dan `DIRECT_URL` langsung ke Neon. Pastikan `AUTH_SECRET`, `BLOB_ENCRYPTION_KEY`, token Blob, Resend, Midtrans, dan Upstash berasal dari penyimpanan secret Vercel; jangan masukkan nilai rahasia ke repositori. Berkas dokumen dienkripsi AES-256-GCM sebelum diunggah dan hanya dibuka melalui endpoint dengan autentikasi dan pemeriksaan kepemilikan/peran. Atur perintah build `pnpm build` dan jalankan migrasi produksi melalui `pnpm db:deploy` sebelum mengalihkan trafik.

## GitHub

Simpan kode sumber dan perubahan schema di GitHub. Workflow `.github/workflows/ci.yml` menjalankan lint, pemeriksaan tipe, dan build pada setiap pull request serta push ke cabang utama. Tambahkan secret produksi pada GitHub Actions hanya bila workflow memerlukan akses ke layanan eksternal.

## Struktur utama

- `src/app`: halaman publik, autentikasi, API, dan portal siswa/admin/kepala sekolah
- `src/components`: komponen UI, layout, dan komponen bersama
- `src/lib`: database, autentikasi, validasi, RBAC, audit, Blob, email, dan PDF
- `src/server/services`: layanan domain pendaftaran, dokumen, pembayaran, seleksi, pengumuman, dan laporan
- `prisma`: skema dan seed basis data

Token visual utama: primary `#2563EB`, navy `#0F172A`, pale blue `#EFF6FF`, sky `#38BDF8`, latar `#F8FAFC`, serta radius utama 12 px. Halaman publik mengikuti token UI Kit. Referensi desain lokal tidak disertakan dalam commit; PDF yang tersedia di lingkungan pengembangan tidak dapat dirender atau diekstrak.