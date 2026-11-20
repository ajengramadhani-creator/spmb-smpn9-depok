"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bell,
  BadgeCheck,
  BookOpenCheck,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileCheck2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Megaphone,
  Search,
  ShieldCheck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = {
  SISWA: [
    { href: "/siswa", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/siswa/pendaftaran", label: "Pendaftaran", icon: ClipboardList },
    { href: "/siswa/dokumen", label: "Dokumen", icon: FileText },
    { href: "/siswa/pembayaran", label: "Pembayaran", icon: CreditCard },
    { href: "/siswa/ujian", label: "Ujian TKA", icon: BookOpenCheck },
    { href: "/siswa/hasil", label: "Hasil seleksi", icon: ShieldCheck },
    { href: "/siswa/pengumuman", label: "Pengumuman", icon: Megaphone },
    { href: "/siswa/notifikasi", label: "Notifikasi", icon: Bell },
    { href: "/siswa/profil", label: "Profil", icon: UserRound },
  ],
  ADMIN: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/pendaftaran", label: "Pendaftaran Siswa", icon: ClipboardList },
    { href: "/admin/verifikasi", label: "Verifikasi Berkas", icon: FileCheck2 },
    { href: "/admin/bank-soal", label: "Bank Soal TKA", icon: BookOpenCheck },
    { href: "/admin/tes", label: "Manajemen Tes", icon: ClipboardCheck },
    { href: "/admin/kelayakan", label: "Kelayakan TKA", icon: ShieldCheck },
    { href: "/admin/seleksi", label: "Seleksi Siswa", icon: BadgeCheck },
    { href: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
    { href: "/admin/laporan", label: "Laporan & Analitik", icon: FileText },
    { href: "/admin/pembayaran", label: "Pembayaran", icon: Wallet },
  ],
  KEPSEK: [
    { href: "/kepsek", label: "Dashboard Monitoring", icon: LayoutDashboard },
    { href: "/kepsek/pendaftaran", label: "Data Pendaftaran", icon: ClipboardList },
    { href: "/kepsek/hasil-tes", label: "Hasil Tes Akademik", icon: BookOpenCheck },
    { href: "/kepsek/hasil-seleksi", label: "Hasil Seleksi", icon: ShieldCheck },
    { href: "/kepsek/statistik", label: "Statistik SPMB", icon: ClipboardCheck },
    { href: "/kepsek/pembayaran", label: "Laporan Pembayaran", icon: Wallet },
    { href: "/kepsek/laporan-eksekutif", label: "Laporan Eksekutif", icon: FileText },
  ],
} as const;

const roleName = { SISWA: "Portal Siswa", ADMIN: "Portal Admin", KEPSEK: "Portal Kepala Sekolah" } as const;
const profileRoleName = { SISWA: "Calon murid", ADMIN: "Admin Panitia", KEPSEK: "Kepala sekolah" } as const;
const rootPath = { SISWA: "/siswa", ADMIN: "/admin", KEPSEK: "/kepsek" } as const;
const loginPath = { SISWA: "/masuk", ADMIN: "/admin/masuk", KEPSEK: "/kepsek/masuk" } as const;

export function PortalShell({
  role,
  name,
  children,
  unreadCount = 0,
}: {
  role: keyof typeof navigation;
  name: string;
  children: React.ReactNode;
  unreadCount?: number;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const studentTheme = role === "SISWA";
  const searchResults = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return query ? navigation[role].filter(({ label }) => label.toLocaleLowerCase("id-ID").includes(query)) : [];
  }, [role, search]);

  const sidebar = (
    <>
      <div className={cn("flex h-16 items-center gap-3 border-b px-5", studentTheme ? "border-blue-100" : "border-white/10")}>
        <span className={cn("grid size-9 place-items-center rounded-lg", studentTheme ? "bg-primary text-white" : "bg-sky text-navy")}><BookOpenCheck aria-hidden="true" className="size-5" /></span>
        <div>
          <p className={cn("text-sm font-bold", studentTheme ? "text-navy" : "text-white")}>SPMB 2027</p>
          <p className={cn("text-[11px]", studentTheme ? "text-slate-500" : "text-slate-400")}>SMPN 9 Depok</p>
        </div>
        <button className={cn("ml-auto grid size-8 place-items-center lg:hidden", studentTheme ? "text-slate-700" : "text-white")} aria-label="Tutup menu" onClick={() => setDrawerOpen(false)}><X aria-hidden="true" className="size-5" /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-3 flex items-center justify-between px-3">
          <p className={cn("text-[10px] font-semibold uppercase", studentTheme ? "text-slate-500" : "text-slate-400")}>Menu utama</p>
          {role === "KEPSEK" && <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-sky">Baca-saja</span>}
        </div>
        <nav className="space-y-1" aria-label="Navigasi portal">
          {navigation[role].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== rootPath[role] && pathname.startsWith(`${href}/`));
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  studentTheme
                    ? active ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:bg-white/70"
                    : active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon aria-hidden="true" className="size-[18px] shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-3">
        <button onClick={() => void signOut({ callbackUrl: loginPath[role] })} className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm", studentTheme ? "text-slate-600 hover:bg-white" : "text-slate-300 hover:bg-white/5")}>
          <LogOut aria-hidden="true" className="size-[18px]" />Keluar
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex", studentTheme ? "border-blue-100 bg-pale" : "border-white/10 bg-navy")}>{sidebar}</aside>
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <aside className={cn("flex h-full w-[min(18rem,85vw)] flex-col", studentTheme ? "bg-pale" : "bg-navy")} onClick={(event) => event.stopPropagation()}>{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" aria-label="Buka menu" onClick={() => setDrawerOpen(true)}><Menu aria-hidden="true" className="size-5" /></Button>
            <span className="hidden shrink-0 text-sm font-medium text-slate-500 md:block">{roleName[role]}</span>
            {role === "KEPSEK" && <span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">Baca-saja</span>}
            <div className="relative min-w-0 w-full max-w-64">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Escape") setSearch(""); }}
                aria-label="Cari menu portal"
                placeholder="Cari menu..."
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
              {search.trim() && (
                <div className="absolute left-0 right-0 top-11 z-30 rounded-lg border border-slate-200 bg-white p-1 shadow-panel">
                  {searchResults.length ? searchResults.map(({ href, label }) => (
                    <Link key={href} href={href} onClick={() => setSearch("")} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">{label}</Link>
                  )) : <p className="px-3 py-2 text-sm text-slate-500">Menu tidak ditemukan.</p>}
                </div>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {role === "SISWA" && (
              <Link href="/siswa/notifikasi" aria-label={`Notifikasi${unreadCount ? `, ${unreadCount} belum dibaca` : ""}`} className="relative grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100">
                <Bell aria-hidden="true" className="size-5" />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </Link>
            )}
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="min-w-0 max-w-24 text-right sm:max-w-40">
                <p className="truncate text-xs font-semibold text-navy sm:text-sm">{name}</p>
                <p className="truncate text-[10px] text-slate-500 sm:text-xs">{profileRoleName[role]}</p>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pale text-sm font-bold text-primary" aria-label={name}>{name.slice(0, 1).toUpperCase()}</span>
            </div>
            <Button variant="ghost" size="sm" aria-label="Keluar dari portal" onClick={() => void signOut({ callbackUrl: loginPath[role] })}>
              <LogOut aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Keluar</span>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
