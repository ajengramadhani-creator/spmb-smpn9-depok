import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BookOpenCheck, GraduationCap, Landmark } from "lucide-react";
import { auth } from "@/lib/auth/config";

export const metadata: Metadata = { title: "Pilih portal" };

const portals = [
  {
    href: "/masuk",
    title: "Calon Murid",
    description: "Daftar dan pantau proses penerimaan murid baru.",
    icon: GraduationCap,
    color: "bg-primary/10 text-primary",
    linkColor: "text-primary",
  },
  {
    href: "/admin/masuk",
    title: "Admin Panitia",
    description: "Kelola pendaftaran dan tahapan seleksi SPMB.",
    icon: BookOpenCheck,
    color: "bg-navy/10 text-navy",
    linkColor: "text-navy",
  },
  {
    href: "/kepsek/masuk",
    title: "Kepala Sekolah",
    description: "Pantau progres dan laporan penerimaan murid baru.",
    icon: Landmark,
    color: "bg-success/10 text-success",
    linkColor: "text-success",
  },
] as const;

const dashboardByRole = {
  SISWA: "/siswa",
  ADMIN: "/admin",
  KEPSEK: "/kepsek",
} as const;

export default async function PortalSelectionPage() {
  const session = await auth();
  if (session?.user.role) redirect(dashboardByRole[session.user.role]);
  const QuickLoginPanel = process.env.NODE_ENV !== "production"
    ? (await import("@/components/auth/development-quick-login")).DevelopmentQuickLoginPanel
    : null;

  return (
    <main className="min-h-screen bg-background px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition-colors hover:text-primary">
          <BookOpenCheck aria-hidden="true" className="size-5 text-primary" />
          SPMB SMPN 9 Depok
        </Link>
        <header className="mx-auto mt-12 max-w-2xl text-center sm:mt-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Penerimaan Murid Baru 2027/2028</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-navy sm:text-4xl">Pilih portal Anda</h1>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">Pilih portal sesuai peran Anda untuk melanjutkan ke layanan SPMB SMPN 9 Depok.</p>
        </header>

        <div className="mt-10 grid gap-4 md:mt-12 md:grid-cols-3 md:gap-5">
          {portals.map(({ href, title, description, icon: Icon, color, linkColor }) => (
            <Link
              key={href}
              href={href}
              className="group flex min-h-64 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-panel transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:p-7"
            >
              <span className={`grid size-14 place-items-center rounded-2xl ${color}`}>
                <Icon aria-hidden="true" className="size-7" />
              </span>
              <h2 className="mt-6 text-xl font-bold text-navy">{title}</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">{description}</p>
              <span className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${linkColor}`}>
                Masuk <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        {QuickLoginPanel && <QuickLoginPanel />}

        <p className="mt-10 text-center text-xs text-slate-500">Pastikan memilih portal sesuai akun dan peran Anda.</p>
      </div>
    </main>
  );
}
