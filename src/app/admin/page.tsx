import { ClipboardList, FileCheck2, UsersRound, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import { RegistrationChart } from "@/components/shared/registration-chart";
import type { ColumnDef } from "@tanstack/react-table";

type Applicant = { no: string; name: string; track: string; status: string };
const applicants: Applicant[] = [
  { no: "SPMB27-00918", name: "Nabila Putri Azzahra", track: "Domisili", status: "Menunggu" },
  { no: "SPMB27-00919", name: "Rizky Maulana", track: "Prestasi", status: "Diterima" },
  { no: "SPMB27-00920", name: "Siti Rahmawati", track: "Afirmasi", status: "Draf" },
];
const columns: ColumnDef<Applicant>[] = [
  { accessorKey: "no", header: "Nomor pendaftaran" },
  { accessorKey: "name", header: "Nama calon murid" },
  { accessorKey: "track", header: "Jalur" },
  { accessorKey: "status", header: "Status" },
];

export default function AdminDashboardPage() {
  return <>
    <PageHeader title="Ringkasan SPMB" description="Pantau pendaftaran murid baru tahun ajaran 2027/2028." />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Total pendaftar" value="918" detail="Seluruh jalur" icon={UsersRound} trend="naik" /><StatCard label="Menunggu verifikasi" value="126" detail="Perlu ditinjau" icon={FileCheck2} /><StatCard label="Terverifikasi" value="704" detail="76,7% dari pendaftar" icon={ClipboardList} trend="naik" /><StatCard label="Kuota tersedia" value="288" detail="4 jalur penerimaan" icon={Wallet} /></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6"><div className="mb-5"><h2 className="text-base font-semibold text-navy">Tren pendaftar</h2><p className="mt-1 text-sm text-slate-500">Jumlah pendaftaran per bulan</p></div><RegistrationChart /></section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6"><div className="mb-5"><h2 className="text-base font-semibold text-navy">Kuota per jalur</h2><p className="mt-1 text-sm text-slate-500">Total daya tampung 288 murid</p></div><div className="space-y-5">{[["Domisili", 144, 50, "bg-primary"], ["Prestasi", 72, 25, "bg-sky"], ["Afirmasi", 58, 20, "bg-success"], ["Mutasi", 14, 5, "bg-warning"]].map(([label, quota, percent, color]) => <div key={String(label)}><div className="mb-2 flex justify-between text-sm"><span className="font-medium text-slate-700">{label}</span><span className="text-slate-500">{quota} kursi · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} /></div></div>)}</div></section>
    </div>
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6"><div className="mb-5"><h2 className="text-base font-semibold text-navy">Pendaftaran terbaru</h2><p className="mt-1 text-sm text-slate-500">Data pendaftar yang baru masuk ke sistem</p></div><DataTable columns={columns} data={applicants} searchPlaceholder="Cari nomor atau nama" filters={[{ columnId: "status", label: "status", options: [{ label: "Menunggu", value: "Menunggu" }, { label: "Diterima", value: "Diterima" }, { label: "Draf", value: "Draf" }] }]} /></section>
  </>;
}