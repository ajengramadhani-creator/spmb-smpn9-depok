import Link from "next/link";
import { BadgeCheck, ClipboardCheck, FileCheck2, UsersRound, Wallet } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RegistrationChart } from "@/components/shared/registration-chart";
import { StatCard } from "@/components/ui/stat-card";
import { getAdminDashboardData } from "@/server/services/staff-portal";

const panelClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6";
const activityLabels: Record<string, string> = {
  LOGIN_SUCCESS: "Masuk ke portal",
  LOGIN_FAILED: "Percobaan masuk gagal",
  REGISTRATION_SUBMITTED: "Mengirim pendaftaran",
  DOCUMENT_REVIEWED: "Meninjau berkas",
  PAYMENT_RECORDED: "Memperbarui pembayaran",
  SELECTION_PUBLISHED: "Menerbitkan hasil seleksi",
  ROLE_CHANGED: "Mengubah peran akun",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard" }]} />
      <PageHeader title="Dashboard SPMB" description={`Ringkasan penerimaan murid baru periode ${data.periodName}.`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total pendaftar" value={formatNumber(data.totalRegistrations)} detail="Semua jalur penerimaan" icon={UsersRound} />
        <StatCard label="Terverifikasi" value={formatNumber(data.verifiedRegistrations)} detail="Berkas telah diverifikasi" icon={FileCheck2} />
        <StatCard label="Lunas" value={formatNumber(data.paidRegistrations)} detail="Pendaftar dengan pembayaran lunas" icon={Wallet} />
        <StatCard label="Lulus" value={formatNumber(data.acceptedRegistrations)} detail="Dinyatakan diterima" icon={BadgeCheck} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className={panelClass}>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-navy">Tren pendaftaran harian</h2>
            <p className="mt-1 text-sm text-slate-500">Pendaftar baru selama 30 hari terakhir</p>
          </div>
          <RegistrationChart data={data.dailyRegistrations} />
        </section>

        <section className={panelClass}>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-navy">Tugas menunggu</h2>
            <p className="mt-1 text-sm text-slate-500">Hal yang memerlukan tindak lanjut</p>
          </div>
          <div className="space-y-3">
            {data.tasks.map((task) => (
              <Link key={task.href} href={task.href} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50">
                <span className="flex items-center gap-3 text-sm text-slate-700">
                  <ClipboardCheck aria-hidden="true" className="size-4 shrink-0 text-primary" />
                  {task.label}
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{formatNumber(task.count)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className={`${panelClass} mt-6`}>
        <div className="mb-5">
          <h2 className="text-base font-semibold text-navy">Aktivitas terbaru</h2>
          <p className="mt-1 text-sm text-slate-500">Catatan aktivitas portal dari AuditLog</p>
        </div>
        {data.recentActivity.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {data.recentActivity.map((activity) => (
              <li key={activity.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-800">{activityLabels[activity.action] ?? activity.action.replaceAll("_", " ")}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{activity.actor?.name ?? "Sistem"} · {activity.entity}</p>
                </div>
                <time className="text-xs text-slate-500" dateTime={activity.createdAt.toISOString()}>{formatDate(activity.createdAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Belum ada aktivitas" description="Aktivitas terbaru akan ditampilkan di sini." />
        )}
      </section>
    </>
  );
}
