import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenCheck, UserRoundPlus } from "lucide-react";
import { RegistrationForm } from "@/components/auth/registration-form";

export const metadata: Metadata = { title: "Daftar akun" };

export default function RegistrationPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-7 shadow-panel sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke beranda</Link>
        <Link href="/" className="mt-8 inline-flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-white"><BookOpenCheck aria-hidden="true" className="size-5" /></span><span className="text-sm font-bold text-navy">SPMB SMPN 9 Depok</span></Link>
        <span className="mt-7 grid size-12 place-items-center rounded-xl bg-pale text-primary"><UserRoundPlus aria-hidden="true" className="size-6" /></span>
        <h1 className="mt-5 text-2xl font-bold text-navy">Buat akun calon murid</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-600">Isi data dengan benar. Tautan verifikasi akan dikirim ke email aktif Anda.</p>
        <RegistrationForm />
        <p className="mt-6 text-center text-sm text-slate-500">Sudah memiliki akun? <Link href="/masuk" className="font-semibold text-primary hover:underline">Masuk</Link></p>
      </section>
    </main>
  );
}
