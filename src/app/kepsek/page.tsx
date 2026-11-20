import { BadgeCheck, ClipboardCheck, FileCheck2, UsersRound, Wallet } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getKepsekDashboardData } from "@/server/services/staff-portal";

const panelClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6";

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export default async function KepsekDashboardPage() {
  const data = await getKepsekDashboardData();
  const stages = [
    { label: "Pendaftaran dikirim", value: data.submittedRegistrations, icon: ClipboardCheck },
    { label: "Berkas terverifikasi", value: data.verifiedRegistrations, icon: FileCheck2 },
    { label: "Pembayaran lunas", value: data.paidRegistrations, icon: Wallet },
    { label: "Hasil TKA tersedia", value: data.testResults, icon: BadgeCheck },
    { label: "Hasil seleksi diterbitkan", value: data.publishedResults, icon: BadgeCheck },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard Monitoring" }]} />
      <PageHeader title="Dashboard Monitoring" description={`Ikhtisar pelaksanaan SPMB periode ${data.periodName}.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pendaftar" value={formatNumber(data.totalRegistrations)} detail="Semua jalur penerimaan" icon={UsersRound} />
        <StatCard label="Terverifikasi" value={formatNumber(data.verifiedRegistrations)} detail="Berkas telah diverifikasi" icon={FileCheck2} />
        <StatCard label="Pembayaran lunas" value={formatNumber(data.paidRegistrations)} detail="Pendaftar dengan pembayaran lunas" icon={Wallet} />
        <StatCard label="Diterima" value={formatNumber(data.acceptedRegistrations)} detail="Hasil seleksi saat ini" icon={BadgeCheck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={panelClass}>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-navy">Progres tahapan</h2>
            <p className="mt-1 text-sm text-slate-500">Jumlah peserta pada setiap tahap penerimaan</p>
          </div>
          <div className="space-y-5">
            {stages.map(({ label, value, icon: Icon }) => {
              const percentage = data.totalRegistrations === 0
                ? 0
                : Math.min(Math.round((value / data.totalRegistrations) * 100), 100);
              return (
                <div key={label}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2 font-medium text-slate-700"><Icon aria-hidden="true" className="size-4 text-primary" />{label}</span>
                    <span className="shrink-0 text-slate-500">{formatNumber(value)} · {percentage}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={label} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={panelClass}>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-navy">Kuota terisi per jalur</h2>
            <p className="mt-1 text-sm text-slate-500">Pendaftar diterima dibandingkan kuota yang tersedia</p>
          </div>
          {data.tracks.length > 0 ? (
            <div className="space-y-5">
              {data.tracks.map((track) => {
                const percentage = track.quota === 0 ? 0 : Math.min(Math.round((track.filled / track.quota) * 100), 100);
                return (
                  <div key={track.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700">{track.name}</span>
                      <span className="shrink-0 text-slate-500">{formatNumber(track.filled)} / {formatNumber(track.quota)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`Kuota ${track.name}`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-sky" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Kuota belum tersedia" description="Kuota jalur akan muncul setelah periode penerimaan diaktifkan." />
          )}
        </section>
      </div>
    </>
  );
}
