import { BadgeCheck, ClipboardList, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { RegistrationChart } from "@/components/shared/registration-chart";
import { StatusBadge } from "@/components/ui/badge";

export default function KepsekDashboardPage() {
  return <>
    <PageHeader title="Dasbor penerimaan murid" description="Ikhtisar pelaksanaan SPMB SMPN 9 Depok 2027/2028." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><StatCard label="Jumlah pendaftar" value="918" detail="Semua jalur penerimaan" icon={UsersRound} trend="naik" /><StatCard label="Kuota penerimaan" value="288" detail="Daya tampung tahun ajaran ini" icon={ClipboardList} /><StatCard label="Hasil seleksi" value="Draf" detail="Menunggu persetujuan dan penerbitan" icon={BadgeCheck} /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6"><div className="mb-5"><h2 className="text-base font-semibold text-navy">Perkembangan pendaftaran</h2><p className="mt-1 text-sm text-slate-500">Ringkasan tren bulanan</p></div><RegistrationChart /></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold text-navy">Persetujuan hasil</h2><p className="mt-1 text-sm text-slate-500">Status seleksi periode berjalan</p></div><StatusBadge status="Draf" /></div><div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Hasil seleksi belum diterbitkan</p><p className="mt-1 text-sm leading-6 text-amber-800">Hasil seleksi akan ditampilkan setelah proses verifikasi dan persetujuan selesai.</p></div><div className="mt-5 space-y-3">{[["Domisili", "144 kursi"], ["Prestasi", "72 kursi"], ["Afirmasi", "58 kursi"], ["Mutasi", "14 kursi"]].map(([track, quota]) => <div key={track} className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"><span className="text-sm text-slate-600">{track}</span><span className="text-sm font-semibold text-navy">{quota}</span></div>)}</div></section>
    </div>
  </>;
}