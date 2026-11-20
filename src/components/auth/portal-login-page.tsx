"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowLeft, BookOpenCheck, LockKeyhole } from "lucide-react";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const portalSettings = {
  SISWA: {
    label: "PORTAL CALON MURID",
    heading: "Langkah baru menuju sekolah impian.",
    description: "Masuk untuk melanjutkan pendaftaran dan memantau informasi penerimaan murid baru.",
    provider: "siswa-credentials",
    destination: "/siswa",
    identifierLabel: "Email atau NISN",
    identifierPlaceholder: "Email atau 10 digit NISN",
    hero: "bg-pale text-navy",
    heroLogo: "bg-primary text-white",
    heroLabel: "text-primary",
    panel: "border-blue-100 bg-white",
    icon: "bg-pale text-primary",
    accent: "text-primary",
    input: "",
    labelText: "text-slate-700",
    button: "bg-primary hover:bg-blue-700",
  },
  ADMIN: {
    label: "PORTAL ADMIN PANITIA",
    heading: "Kelola proses penerimaan dengan aman.",
    description: "Portal khusus panitia untuk mengelola tahapan SPMB SMPN 9 Depok.",
    provider: "admin-credentials",
    destination: "/admin",
    identifierLabel: "Email panitia",
    identifierPlaceholder: "Masukkan email akun panitia",
    hero: "bg-navy text-white",
    heroLogo: "bg-sky text-navy",
    heroLabel: "text-sky",
    panel: "border-white/10 bg-slate-900 text-white",
    icon: "bg-white/10 text-sky",
    accent: "text-sky",
    input: "border-slate-700 bg-slate-800 text-white placeholder:text-slate-400 focus:border-sky focus:ring-sky/20",
    labelText: "text-slate-200",
    button: "bg-sky text-navy hover:bg-sky/90",
  },
  KEPSEK: {
    label: "PORTAL KEPALA SEKOLAH",
    heading: "Pantau pelaksanaan SPMB secara menyeluruh.",
    description: "Tinjau progres penerimaan murid baru melalui ringkasan dan laporan sekolah.",
    provider: "kepsek-credentials",
    destination: "/kepsek",
    identifierLabel: "Email",
    identifierPlaceholder: "Masukkan email akun",
    hero: "bg-success/10 text-navy",
    heroLogo: "bg-success text-white",
    heroLabel: "text-success",
    panel: "border-slate-200 bg-white",
    icon: "bg-success/10 text-success",
    accent: "text-success",
    input: "",
    labelText: "text-slate-700",
    button: "bg-success hover:bg-success/90",
  },
} satisfies Record<Role, {
  label: string;
  heading: string;
  description: string;
  provider: string;
  destination: string;
  identifierLabel: string;
  identifierPlaceholder: string;
  hero: string;
  heroLogo: string;
  heroLabel: string;
  panel: string;
  icon: string;
  accent: string;
  input: string;
  labelText: string;
  button: string;
}>;

export function PortalLoginPage({ role }: { role: Role }) {
  const router = useRouter();
  const settings = portalSettings[role];
  const rememberKey = `spmb:login-identifier:${role.toLowerCase()}`;
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedIdentifier = window.localStorage.getItem(rememberKey);
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, [rememberKey]);

  async function onSubmit(formData: FormData) {
    setFormError("");
    setIsSubmitting(true);
    try {
      const submittedIdentifier = String(formData.get("identifier") ?? "").trim();
      const shouldRemember = formData.get("rememberMe") === "on";
      if (shouldRemember) window.localStorage.setItem(rememberKey, submittedIdentifier);
      else window.localStorage.removeItem(rememberKey);

      const result = await signIn(settings.provider, {
        identifier: submittedIdentifier,
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });
      if (result?.error) {
        setFormError("Email atau kata sandi tidak sesuai.");
        return;
      }
      router.push(settings.destination);
      router.refresh();
    } catch {
      setFormError("Layanan masuk belum dapat dihubungi. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={cn("min-h-screen px-4 py-6 sm:px-6 sm:py-10", role === "ADMIN" ? "bg-navy" : "bg-background")}>
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-xl md:min-h-[min(760px,calc(100vh-5rem))] md:grid-cols-[0.95fr_1.05fr]">
        <section className={cn("relative flex flex-col justify-between overflow-hidden p-7 sm:p-10 lg:p-12", settings.hero)}>
          <div className="pointer-events-none absolute -right-24 -top-20 size-80 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />
          <Link href="/" className="relative inline-flex items-center gap-3" aria-label="Kembali ke beranda SPMB SMPN 9 Depok">
            <span className={cn("grid size-11 place-items-center rounded-xl", settings.heroLogo)}><BookOpenCheck aria-hidden="true" className="size-5" /></span>
            <span><span className="block text-sm font-bold">SPMB SMPN 9 Depok</span><span className="text-xs opacity-70">Tahun ajaran 2027/2028</span></span>
          </Link>
          <div className="relative my-12 max-w-lg md:my-0">
            <p className={cn("text-xs font-bold tracking-[0.14em]", settings.heroLabel)}>{settings.label}</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">{settings.heading}</h1>
            <p className="mt-5 max-w-md text-sm leading-7 opacity-75 sm:text-base">{settings.description}</p>
          </div>
          <p className="relative text-xs opacity-60">© 2027 SMP Negeri 9 Depok</p>
        </section>

        <section className={cn("flex items-center justify-center border-t px-6 py-8 sm:px-10 sm:py-12 md:border-l md:border-t-0 lg:px-14", settings.panel)}>
          <div className="w-full max-w-sm">
            <Link href="/portal" className={cn("mb-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-900", role === "ADMIN" && "text-slate-300 hover:text-white", role === "KEPSEK" && "hover:text-success")}>
              <ArrowLeft aria-hidden="true" className="size-3.5" />Ganti portal
            </Link>
            <div className="mb-7">
              <span className={cn("grid size-12 place-items-center rounded-xl", settings.icon)}><LockKeyhole aria-hidden="true" className="size-5" /></span>
              <p className={cn("mt-5 text-xs font-bold tracking-[0.12em]", settings.accent)}>{settings.label}</p>
              <h2 className={cn("mt-2 text-2xl font-bold", role === "ADMIN" ? "text-white" : "text-navy")}>Masuk ke akun</h2>
              <p className={cn("mt-2 text-sm leading-6", role === "ADMIN" ? "text-slate-300" : "text-slate-500")}>
                {role === "SISWA" ? "Masuk menggunakan email atau NISN dan kata sandi." : "Masuk menggunakan email dan kata sandi akun resmi."}
              </p>
              {role === "ADMIN" && <p className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">Akun dibuat oleh panitia.</p>}
            </div>

            <form action={onSubmit} className="space-y-5">
              <label className={cn("block space-y-2 text-sm font-medium", settings.labelText)}>
                {settings.identifierLabel}
                <Input
                  name="identifier"
                  type={role === "SISWA" ? "text" : "email"}
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  autoComplete="username"
                  required
                  placeholder={settings.identifierPlaceholder}
                  className={settings.input}
                />
              </label>
              <label className={cn("block space-y-2 text-sm font-medium", settings.labelText)}>
                Kata sandi
                <Input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  placeholder="Masukkan kata sandi"
                  className={settings.input}
                />
              </label>
              <div className="flex items-center justify-between gap-4 text-sm">
                <label className={cn("flex items-center gap-2", role === "ADMIN" ? "text-slate-300" : "text-slate-600")}>
                  <input className={cn("size-4 rounded border-slate-300", role === "ADMIN" ? "accent-sky" : role === "KEPSEK" ? "accent-success" : "accent-primary")} type="checkbox" name="rememberMe" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                  Ingat saya
                </label>
                {role === "SISWA" && <Link href="/lupa-password" className="font-medium text-primary hover:underline">Lupa kata sandi?</Link>}
              </div>
              {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-danger">{formError}</p>}
              <Button className={cn("w-full", settings.button)} type="submit" loading={isSubmitting}>Masuk</Button>
            </form>

            {role === "SISWA" && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Belum memiliki akun? <Link href="/daftar" className="font-semibold text-primary hover:underline">Daftar sekarang</Link>
              </p>
            )}
            <p className={cn("mt-9 text-center text-xs", role === "ADMIN" ? "text-slate-500" : "text-slate-400")}>Dengan masuk, Anda menyetujui ketentuan penggunaan portal SPMB.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
