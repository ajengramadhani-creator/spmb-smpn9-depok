"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Bell, BookOpenCheck, ClipboardList, CreditCard, FileCheck2, FileText, LayoutDashboard, LogOut, Menu, Megaphone, Settings2, ShieldCheck, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navigation = {
  SISWA: [
    { href: "/siswa", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/siswa/pendaftaran", label: "Pendaftaran", icon: ClipboardList },
    { href: "/siswa/dokumen", label: "Dokumen", icon: FileText },
    { href: "/siswa/pembayaran", label: "Pembayaran", icon: CreditCard },
    { href: "/siswa/pengumuman", label: "Pengumuman", icon: Megaphone },
  ],
  ADMIN: [
    { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/admin/pendaftar", label: "Data pendaftar", icon: ClipboardList },
    { href: "/admin/verifikasi", label: "Verifikasi dokumen", icon: FileCheck2 },
    { href: "/admin/seleksi", label: "Seleksi", icon: ShieldCheck },
    { href: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
    { href: "/admin/laporan", label: "Laporan", icon: BookOpenCheck },
  ],
  KEPSEK: [
    { href: "/kepsek", label: "Ringkasan", icon: LayoutDashboard },
    { href: "/kepsek/hasil", label: "Hasil seleksi", icon: ShieldCheck },
    { href: "/kepsek/pengumuman", label: "Pengumuman", icon: Megaphone },
  ],
} as const;

const roleName = { SISWA: "Portal Siswa", ADMIN: "Portal Admin", KEPSEK: "Portal Kepala Sekolah" };

export function PortalShell({ role, name, children }: { role: keyof typeof navigation; name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const studentTheme = role === "SISWA";
  const sidebar = (
    <>
      <div className={cn("flex h-16 items-center gap-3 border-b px-5", studentTheme ? "border-blue-100" : "border-white/10")}>
        <span className={cn("grid size-9 place-items-center rounded-lg", studentTheme ? "bg-primary text-white" : "bg-sky text-navy")}><BookOpenCheck aria-hidden="true" className="size-5" /></span>
        <div><p className={cn("text-sm font-bold", studentTheme ? "text-navy" : "text-white")}>SPMB 2027</p><p className={cn("text-[11px]", studentTheme ? "text-slate-500" : "text-slate-400")}>SMPN 9 Depok</p></div>
        <button className="ml-auto grid size-8 place-items-center lg:hidden" aria-label="Tutup menu" onClick={() => setDrawerOpen(false)}><X aria-hidden="true" className="size-5" /></button>
      </div>
      <div className="px-3 py-5"><p className={cn("mb-3 px-3 text-[10px] font-semibold uppercase", studentTheme ? "text-slate-500" : "text-slate-400")}>Menu utama</p>
        <nav className="space-y-1" aria-label="Navigasi portal">
          {navigation[role].map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== `/${role.toLowerCase()}` && pathname.startsWith(`${href}/`));
            return <Link key={href} href={href} onClick={() => setDrawerOpen(false)} className={cn("flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors", studentTheme ? active ? "bg-white text-primary shadow-sm" : "text-slate-600 hover:bg-white/70" : active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white")}>
              <Icon aria-hidden="true" className="size-[18px]" />{label}
            </Link>;
          })}
        </nav>
      </div>
      <div className="mt-auto p-3">
        <button onClick={() => void signOut({ callbackUrl: "/masuk" })} className={cn("flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm", studentTheme ? "text-slate-600 hover:bg-white" : "text-slate-300 hover:bg-white/5")}><LogOut aria-hidden="true" className="size-[18px]" />Keluar</button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r lg:flex", studentTheme ? "border-blue-100 bg-pale" : "border-white/10 bg-navy")}>{sidebar}</aside>
      {drawerOpen && <div className="fixed inset-0 z-40 bg-navy/40 lg:hidden" onClick={() => setDrawerOpen(false)}>
        <aside className={cn("flex h-full w-[min(18rem,85vw)] flex-col", studentTheme ? "bg-pale" : "bg-navy")} onClick={(event) => event.stopPropagation()}>{sidebar}</aside>
      </div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu" onClick={() => setDrawerOpen(true)}><Menu aria-hidden="true" className="size-5" /></Button><span className="text-sm font-medium text-slate-500">{roleName[role]}</span></div>
          <div className="flex items-center gap-2 sm:gap-4"><Button variant="ghost" size="icon" aria-label="Notifikasi"><Bell aria-hidden="true" className="size-5" /></Button><span className="hidden h-8 w-px bg-slate-200 sm:block" /><div className="text-right"><p className="max-w-40 truncate text-sm font-semibold text-navy">{name}</p><p className="text-xs text-slate-500">{role === "SISWA" ? "Calon murid" : role === "ADMIN" ? "Administrator" : "Kepala sekolah"}</p></div><span className="grid size-9 shrink-0 place-items-center rounded-full bg-pale text-sm font-bold text-primary">{name.slice(0, 1).toUpperCase()}</span><Settings2 aria-hidden="true" className="hidden size-4 text-slate-400 sm:block" /></div>
        </header>
        <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}