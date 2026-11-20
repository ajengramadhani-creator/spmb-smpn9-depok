import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileText, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function SiswaDashboardPage() {
  return (
    <>
      <PageHeader title="Ringkasan pendaftaran" description="Selamat datang, Nabila. Pantau proses pendaftaran Anda di sini." actions={<Link href="/siswa/pendaftaran"><Button variant="secondary">Lihat pendaftaran<ArrowRight aria-hidden="true" className="size-4" /></Button></Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Nomor pendaftaran" value="SPMB27-00918" detail="Periode 2027/2028" icon={ClipboardCheck} /><StatCard label="Jalur pilihan" value="Domisili" detail="Kuota tersedia 144 murid" icon={FileText} /><StatCard label="Status pendaftaran" value="Menunggu" detail="Dokumen sedang diverifikasi" icon={Megaphone} /></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold text-navy">Tahapan pendaftaran</h2><p className="mt-1 text-sm text-slate-500">Perkembangan berkas Anda</p></div><StatusBadge status="Menunggu" /></div><ol className="mt-6 space-y-0">{[["Data diri", "Lengkap", true], ["Unggah dokumen", "Lengkap", true], ["Verifikasi berkas", "Sedang diproses", false], ["Pengumuman hasil", "Belum dimulai", false]].map(([label, status, complete], index) => <li key={String(label)} className="relative flex gap-4 pb-6 last:pb-0"><span className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${complete ? "bg-green-100 text-green-700" : index === 2 ? "bg-pale text-primary ring-4 ring-blue-50" : "bg-slate-100 text-slate-400"}`}>{complete ? "✓" : String(index + 1).padStart(2, "0")}</span>{index < 3 && <span className={`absolute left-4 top-8 h-full w-px ${complete ? "bg-green-200" : "bg-slate-200"}`} />}<span className="pt-0.5"><span className="block text-sm font-medium text-slate-800">{label}</span><span className="mt-1 block text-xs text-slate-500">{status}</span></span></li>)}</ol></section>
        <section className="rounded-xl border border-blue-100 bg-pale p-5 sm:p-6"><span className="grid size-10 place-items-center rounded-lg bg-white text-primary"><Megaphone aria-hidden="true" className="size-5" /></span><h2 className="mt-4 text-base font-semibold text-navy">Informasi terbaru</h2><p className="mt-2 text-sm leading-6 text-slate-600">Pastikan dokumen yang diunggah terlihat jelas dan sesuai persyaratan jalur pendaftaran Anda.</p><Link href="/siswa/pengumuman" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Lihat pengumuman<ArrowRight aria-hidden="true" className="size-4" /></Link></section>
      </div>
    </>
  );
}