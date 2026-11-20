import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = { title: "Lupa kata sandi" };

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-panel sm:p-9">
        <Link href="/masuk" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke halaman masuk</Link>
        <span className="mt-8 grid size-12 place-items-center rounded-xl bg-pale text-primary"><KeyRound aria-hidden="true" className="size-6" /></span>
        <h1 className="mt-5 text-2xl font-bold text-navy">Lupa kata sandi?</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-600">Masukkan email akun Anda. Jika terdaftar, kami akan mengirim tautan untuk mengatur ulang kata sandi.</p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
