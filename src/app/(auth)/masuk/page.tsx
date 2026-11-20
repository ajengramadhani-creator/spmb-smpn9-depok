"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { BookOpenCheck, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const savedIdentifier = window.localStorage.getItem("spmb:login-identifier");
    if (savedIdentifier) {
      setIdentifier(savedIdentifier);
      setRememberMe(true);
    }
  }, []);

  async function onSubmit(formData: FormData) {
    setFormError("");
    setIsSubmitting(true);
    try {
      const submittedIdentifier = String(formData.get("identifier") ?? "").trim();
      const shouldRemember = formData.get("rememberMe") === "on";
      if (shouldRemember) window.localStorage.setItem("spmb:login-identifier", submittedIdentifier);
      else window.localStorage.removeItem("spmb:login-identifier");
      const result = await signIn("credentials", {
        identifier: submittedIdentifier,
        password: String(formData.get("password") ?? ""),
        redirect: false,
        redirectTo: "/ruang-kerja",
      });
      if (result?.error) {
        setFormError("Email/NISN atau kata sandi tidak sesuai, atau akun belum diverifikasi.");
        return;
      }
      router.push("/ruang-kerja");
      router.refresh();
    } catch {
      setFormError("Layanan masuk belum dapat dihubungi. Silakan coba kembali.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_0.82fr]">
      <section className="relative hidden overflow-hidden bg-navy px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,rgba(56,189,248,0.18),transparent_50%)]" aria-hidden="true" />
        <Link href="/" className="relative flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-sky text-navy"><BookOpenCheck aria-hidden="true" className="size-5" /></span><span><span className="block text-sm font-bold">SPMB SMPN 9 Depok</span><span className="text-xs text-slate-300">Tahun ajaran 2027/2028</span></span></Link>
        <div className="relative max-w-lg"><p className="text-xs font-semibold uppercase text-sky">Portal resmi</p><h1 className="mt-4 text-4xl font-bold leading-tight">Selamat datang di portal penerimaan murid baru.</h1><p className="mt-5 leading-7 text-slate-300">Gunakan akun Anda untuk melanjutkan proses pendaftaran dan memantau informasi terbaru.</p></div>
        <p className="relative text-xs text-slate-400">© 2027 SMP Negeri 9 Depok</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <Link href="/" className="mb-12 inline-flex items-center gap-3 lg:hidden"><span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><BookOpenCheck aria-hidden="true" className="size-5" /></span><span className="text-sm font-bold text-navy">SPMB SMPN 9 Depok</span></Link>
          <div className="mb-8"><span className="grid size-12 place-items-center rounded-xl bg-pale text-primary"><LockKeyhole aria-hidden="true" className="size-5" /></span><h2 className="mt-5 text-2xl font-bold text-navy">Masuk ke akun</h2><p className="mt-2 text-sm text-slate-500">Masuk menggunakan email atau NISN dan kata sandi.</p></div>
          <form action={onSubmit} className="space-y-5">
            <label className="block space-y-2 text-sm font-medium text-slate-700">Email atau NISN<Input name="identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} autoComplete="username" required placeholder="nama@email.com atau 10 digit NISN" /></label>
            <label className="block space-y-2 text-sm font-medium text-slate-700">Kata sandi<Input name="password" type="password" autoComplete="current-password" required placeholder="Masukkan kata sandi" /></label>
            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 text-slate-600"><input className="size-4 rounded border-slate-300 text-primary focus:ring-primary" type="checkbox" name="rememberMe" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />Ingat saya</label>
              <Link href="/lupa-password" className="font-medium text-primary hover:underline">Lupa kata sandi?</Link>
            </div>
            {formError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-danger">{formError}</p>}
            <Button className="w-full" type="submit" loading={isSubmitting}>Masuk</Button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">Belum memiliki akun? <Link href="/daftar" className="font-semibold text-primary hover:underline">Daftar sekarang</Link></p>
          <p className="mt-10 text-center text-xs text-slate-400">Dengan masuk, Anda menyetujui ketentuan penggunaan portal SPMB.</p>
        </div>
      </section>
    </main>
  );
}
