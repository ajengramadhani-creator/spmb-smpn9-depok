import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = { title: "Atur ulang kata sandi" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-panel sm:p-9">
        <Link href="/masuk" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke halaman masuk</Link>
        <span className="mt-8 grid size-12 place-items-center rounded-xl bg-pale text-primary"><KeyRound aria-hidden="true" className="size-6" /></span>
        <h1 className="mt-5 text-2xl font-bold text-navy">Atur ulang kata sandi</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-600">Buat kata sandi baru dengan minimal 8 karakter, huruf besar, huruf kecil, dan angka.</p>
        {token
          ? <ResetPasswordForm token={token} />
          : <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-danger">Tautan reset tidak valid. Minta tautan baru melalui halaman lupa kata sandi.</p>}
      </section>
    </main>
  );
}
