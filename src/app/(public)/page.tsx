import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileCheck2,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { TrackType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Beranda",
  description: "Informasi resmi SPMB SMP Negeri 9 Depok: alur pendaftaran, jadwal, persyaratan, jalur penerimaan, dan pengumuman.",
};

const trackPresentation: Record<TrackType, { title: string; detail: string; icon: typeof MapPin; tone: string }> = {
  DOMISILI: { title: "Domisili", detail: "Berdasarkan wilayah tempat tinggal calon murid.", icon: MapPin, tone: "bg-blue-50 text-blue-700" },
  PRESTASI: { title: "Prestasi", detail: "Berdasarkan capaian akademik maupun nonakademik.", icon: Trophy, tone: "bg-sky-50 text-sky-700" },
  AFIRMASI: { title: "Afirmasi", detail: "Untuk calon murid yang memenuhi ketentuan afirmasi.", icon: UsersRound, tone: "bg-emerald-50 text-emerald-700" },
  MUTASI: { title: "Mutasi", detail: "Untuk perpindahan tugas orang tua atau wali.", icon: BookOpenCheck, tone: "bg-amber-50 text-amber-700" },
};

const steps = [
  ["01", "Buat akun", "Daftarkan identitas calon murid dan email aktif."],
  ["02", "Verifikasi email", "Aktifkan akun melalui tautan yang dikirim ke email."],
  ["03", "Lengkapi data", "Isi data calon murid, orang tua, dan sekolah asal."],
  ["04", "Pilih jalur", "Tentukan jalur dan unggah dokumen persyaratan."],
  ["05", "Verifikasi berkas", "Pantau pemeriksaan berkas dan lengkapi perbaikan jika diminta."],
  ["06", "Pantau hasil", "Lihat pengumuman dan status seleksi dari portal."],
];

const requirements = [
  "Kartu Keluarga dan akta kelahiran calon murid.",
  "NISN dan dokumen identitas yang masih berlaku.",
  "Rapor atau bukti prestasi sesuai jalur yang dipilih.",
  "Dokumen pendukung khusus jalur afirmasi atau mutasi.",
];

const faqs = [
  ["Siapa yang dapat mendaftar melalui portal ini?", "Calon murid baru SMP Negeri 9 Depok yang memenuhi ketentuan penerimaan pada tahun ajaran berjalan."],
  ["Apakah saya harus memverifikasi email?", "Ya. Akun yang dibuat melalui pendaftaran publik perlu mengonfirmasi alamat email sebelum dapat digunakan untuk masuk."],
  ["Dokumen apa yang harus disiapkan?", "Siapkan dokumen identitas calon murid, Kartu Keluarga, akta kelahiran, NISN, serta dokumen tambahan sesuai jalur."],
  ["Bagaimana jika berkas perlu diperbaiki?", "Masuk ke portal dan ikuti catatan perbaikan pada status pendaftaran. Unggah kembali berkas yang diminta sebelum batas waktu."],
  ["Di mana saya melihat pengumuman seleksi?", "Pengumuman resmi ditampilkan pada bagian Pengumuman di halaman ini dan pada portal akun calon murid."],
];

function dateLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function LandingSkeleton() {
  return (
    <div aria-label="Memuat informasi SPMB" aria-busy="true">
      <div className="h-[560px] animate-pulse bg-blue-50" />
      {[1, 2, 3, 4].map((section) => (
        <div key={section} className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
          <div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <div key={item} className="h-32 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        </div>
      ))}
    </div>
  );
}

async function LandingContent() {
  const now = new Date();
  const period = await prisma.academicPeriod.findFirst({
    where: { isActive: true },
    include: { tracks: { where: { isActive: true }, orderBy: { type: "asc" } } },
    orderBy: { startsAt: "desc" },
  });
  const announcements = await prisma.announcement.findMany({
    where: {
      publishedAt: { not: null, lte: now },
      ...(period ? { OR: [{ academicPeriodId: period.id }, { academicPeriodId: null }] } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });
  const scheduleStatus = !period
    ? "Jadwal belum tersedia"
    : now < period.startsAt
      ? "Akan datang"
      : now <= period.endsAt
        ? "Berlangsung"
        : "Selesai";
  const totalQuota = period?.tracks.reduce((sum, track) => sum + track.quota, 0) ?? 0;

  return (
    <main className="min-h-screen overflow-hidden bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="SPMB SMPN 9 Depok, beranda">
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><BookOpenCheck aria-hidden="true" className="size-5" /></span>
            <span><span className="block text-sm font-bold text-navy">SPMB SMPN 9 Depok</span><span className="block text-xs text-slate-500">{period?.name ?? "Penerimaan murid baru"}</span></span>
          </Link>
          <nav className="hidden items-center gap-4 xl:flex" aria-label="Navigasi utama">
            <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#beranda">Beranda</a>
            <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#alur-jadwal">Alur &amp; jadwal</a>
            <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#persyaratan">Persyaratan</a>
            <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#pengumuman">Pengumuman</a>
            <a className="text-sm font-medium text-slate-600 hover:text-primary" href="#faq">FAQ</a>
            <Link href="/portal" className="text-sm font-semibold text-slate-700 hover:text-primary">Masuk</Link>
            <Link href="/daftar"><Button size="sm">Daftar sekarang</Button></Link>
          </nav>
          <details className="relative xl:hidden">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">Menu<ChevronDown aria-hidden="true" className="size-4" /></summary>
            <nav className="absolute right-0 top-12 z-40 grid w-56 gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-panel" aria-label="Navigasi utama">
              <a className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="#beranda">Beranda</a>
              <a className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="#alur-jadwal">Alur &amp; jadwal</a>
              <a className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="#persyaratan">Persyaratan</a>
              <a className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="#pengumuman">Pengumuman</a>
              <a className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="#faq">FAQ</a>
              <Link className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" href="/portal">Masuk</Link>
              <Link href="/daftar" className="p-1"><Button className="w-full" size="sm">Daftar sekarang</Button></Link>
            </nav>
          </details>
        </div>
      </header>

      <section id="beranda" className="relative scroll-mt-20 border-b border-blue-100 bg-[linear-gradient(115deg,#EFF6FF_0%,#FFFFFF_56%,#F0F9FF_100%)]">
        <div className="pointer-events-none absolute -right-20 top-0 h-full w-[46%] bg-[radial-gradient(ellipse_at_75%_42%,rgba(56,189,248,0.17),transparent_58%)]" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary"><span className="size-1.5 rounded-full bg-emerald-500" />PENERIMAAN MURID BARU {period?.name ?? ""}</p>
            <h1 className="mt-6 text-4xl font-bold leading-[1.12] text-navy sm:text-5xl">Langkah baru, <span className="text-primary">masa depan cerah.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Informasi resmi penerimaan murid baru SMP Negeri 9 Depok. Kenali jalur, siapkan berkas, dan pantau proses pendaftaran dari satu portal.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href="/daftar"><Button size="lg">Daftar sekarang<ArrowRight aria-hidden="true" className="size-4" /></Button></Link><a href="#alur-jadwal"><Button variant="secondary" size="lg">Lihat alur pendaftaran<ArrowDown aria-hidden="true" className="size-4" /></Button></a></div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4 text-emerald-600" />Portal resmi sekolah</span><span className="inline-flex items-center gap-2"><BadgeCheck aria-hidden="true" className="size-4 text-primary" />Proses transparan</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[500px]">
            <div className="absolute -left-5 -top-5 size-20 rounded-2xl border border-sky-200" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-6 shadow-[0_24px_70px_-34px_rgba(37,99,235,0.36)] sm:p-8">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">Penerimaan murid baru</p><p className="mt-2 text-3xl font-bold text-navy">{period?.name ?? "SPMB"} </p></div><span className="grid size-12 place-items-center rounded-xl bg-pale text-primary"><Sparkles aria-hidden="true" className="size-6" /></span></div>
              <div className="my-6 h-px bg-slate-100" />
              <div className="grid grid-cols-2 gap-3"><div className="rounded-lg bg-slate-50 p-4"><p className="text-xs text-slate-500">Jalur tersedia</p><p className="mt-1 text-2xl font-bold text-navy">{period?.tracks.length ?? 0}</p></div><div className="rounded-lg bg-blue-50 p-4"><p className="text-xs text-blue-700">Total kuota</p><p className="mt-1 text-2xl font-bold text-primary">{totalQuota}</p></div></div>
              <div className="mt-5 space-y-3"><div className="flex items-center gap-3 text-sm text-slate-700"><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />Pendaftaran terpusat dan transparan</div><div className="flex items-center gap-3 text-sm text-slate-700"><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" />Pemantauan status secara daring</div></div>
            </div>
          </div>
        </div>
      </section>

      <section id="alur-jadwal" className="scroll-mt-20 border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Alur pendaftaran</p>
            <h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">Enam langkah menuju sekolah baru.</h2>
            <ol className="mt-8 grid gap-3 sm:grid-cols-2">
              {steps.map(([number, title, detail]) => <li key={number} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-pale text-sm font-bold text-primary">{number}</span><span><span className="block text-sm font-semibold text-navy">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span></li>)}
            </ol>
          </div>
          <aside className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6 sm:p-7">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white text-primary"><CalendarDays aria-hidden="true" className="size-5" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Jadwal penerimaan</p><h3 className="text-lg font-bold text-navy">{period?.name ?? "Periode aktif"}</h3></div></div>
            {period ? (
              <div className="mt-6 rounded-xl border border-blue-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3"><p className="font-semibold text-navy">Pendaftaran SPMB</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scheduleStatus === "Berlangsung" ? "bg-emerald-50 text-emerald-700" : scheduleStatus === "Akan datang" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>{scheduleStatus}</span></div>
                <p className="mt-3 text-sm text-slate-600">{dateLabel(period.startsAt)} – {dateLabel(period.endsAt)}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">Jadwal diperbarui mengikuti periode penerimaan yang diumumkan sekolah.</p>
              </div>
            ) : <p className="mt-6 rounded-xl border border-blue-100 bg-white p-4 text-sm leading-6 text-slate-600">Informasi jadwal penerimaan belum tersedia. Silakan kunjungi halaman ini kembali.</p>}
            <Link className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline" href="/daftar">Mulai pendaftaran<ArrowRight aria-hidden="true" className="size-4" /></Link>
          </aside>
        </div>
      </section>

      <section id="persyaratan" className="scroll-mt-20 bg-slate-50">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-wide text-primary">Persyaratan</p><h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">Siapkan dokumen sebelum mendaftar.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Pastikan dokumen terbaca jelas dan data yang diisikan sesuai dokumen asli.</p></div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {requirements.map((requirement, index) => <article key={requirement} className="rounded-xl border border-slate-200 bg-white p-5"><span className="grid size-10 place-items-center rounded-lg bg-pale text-primary"><FileCheck2 aria-hidden="true" className="size-5" /></span><p className="mt-4 text-sm leading-6 text-slate-700">{requirement}</p><p className="mt-3 text-xs font-bold text-slate-400">DOKUMEN {String(index + 1).padStart(2, "0")}</p></article>)}
          </div>
          <div className="mt-14 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Jalur penerimaan</p><h3 className="mt-2 text-xl font-bold text-navy">Pilih jalur yang sesuai</h3></div><p className="max-w-md text-sm leading-6 text-slate-500">Kuota dan ketentuan mengikuti periode penerimaan aktif.</p></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {period?.tracks.map((track) => {
              const info = trackPresentation[track.type];
              const Icon = info.icon;
              return <article key={track.id} className="rounded-xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-panel"><div className="flex items-start justify-between"><span className={`grid size-11 place-items-center rounded-lg ${info.tone}`}><Icon aria-hidden="true" className="size-5" /></span><span className="text-right"><span className="block text-xl font-bold text-navy">{track.quota}</span><span className="text-[11px] text-slate-500">kursi</span></span></div><h4 className="mt-5 text-base font-semibold text-navy">Jalur {info.title}</h4><p className="mt-2 min-h-10 text-sm leading-5 text-slate-500">{track.description ?? info.detail}</p></article>;
            })}
            {!period?.tracks.length && <p className="text-sm text-slate-500">Informasi jalur penerimaan belum tersedia.</p>}
          </div>
        </div>
      </section>

      <section id="pengumuman" className="scroll-mt-20 border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-wide text-primary">Informasi terbaru</p><h2 className="mt-2 text-2xl font-bold text-navy sm:text-3xl">Pengumuman SPMB</h2></div><Megaphone aria-hidden="true" className="hidden size-8 text-sky-500 sm:block" /></div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {announcements.map((announcement) => <article key={announcement.id} className="rounded-xl border border-slate-200 p-5"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-pale px-2.5 py-1 text-xs font-semibold text-primary">{announcement.type === "JADWAL" ? "Jadwal" : announcement.type === "HASIL" ? "Hasil seleksi" : "Informasi"}</span>{announcement.publishedAt && <time className="text-xs text-slate-400" dateTime={announcement.publishedAt.toISOString()}>{dateLabel(announcement.publishedAt)}</time>}</div><h3 className="mt-4 text-base font-semibold text-navy">{announcement.title}</h3><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{announcement.body}</p></article>)}
            {!announcements.length && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 md:col-span-3">Belum ada pengumuman yang diterbitkan.</p>}
          </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:py-20">
          <div><span className="grid size-11 place-items-center rounded-xl bg-white text-primary shadow-sm"><CircleHelp aria-hidden="true" className="size-5" /></span><p className="mt-5 text-xs font-bold uppercase tracking-wide text-primary">Pusat bantuan</p><h2 className="mt-2 text-2xl font-bold text-navy">Pertanyaan yang sering diajukan.</h2><p className="mt-3 text-sm leading-6 text-slate-600">Temukan jawaban seputar pendaftaran SPMB SMPN 9 Depok.</p></div>
          <div className="space-y-3">{faqs.map(([question, answer]) => <details key={question} className="group rounded-xl border border-slate-200 bg-white p-4 open:border-blue-200"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-navy">{question}<ChevronDown aria-hidden="true" className="size-4 shrink-0 text-slate-500 transition group-open:rotate-180" /></summary><p className="mt-3 pr-7 text-sm leading-6 text-slate-600">{answer}</p></details>)}</div>
        </div>
      </section>

      <section className="bg-navy">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-5 py-12 sm:px-8 md:flex-row md:items-center md:py-14">
          <div><p className="text-xs font-bold uppercase tracking-wide text-sky">Siap memulai?</p><h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Langkah baru dimulai dari sini.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Buat akun dan ikuti seluruh proses pendaftaran melalui portal resmi SPMB.</p></div>
          <Link href="/daftar"><Button size="lg" className="shrink-0 bg-white text-navy hover:bg-slate-100">Daftar sekarang<ArrowRight aria-hidden="true" className="size-4" /></Button></Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div><p className="font-semibold text-slate-700">SMP Negeri 9 Depok</p><p className="mt-1">Portal Penerimaan Murid Baru · © {new Date().getFullYear()}</p></div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Navigasi kaki halaman"><a className="hover:text-primary" href="#alur-jadwal">Alur &amp; jadwal</a><a className="hover:text-primary" href="#persyaratan">Persyaratan</a><a className="hover:text-primary" href="#faq">Bantuan</a><Link className="font-semibold text-primary hover:underline" href="/portal">Masuk ke portal</Link></nav>
      </footer>
    </main>
  );
}

export default function PublicHomePage() {
  return <Suspense fallback={<LandingSkeleton />}><LandingContent /></Suspense>;
}
