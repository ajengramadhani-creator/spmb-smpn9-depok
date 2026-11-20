import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MailCheck } from "lucide-react";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";

export const metadata: Metadata = { title: "Verifikasi email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5 py-10">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-7 shadow-panel sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary"><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke beranda</Link>
        <span className="mt-8 grid size-12 place-items-center rounded-xl bg-pale text-primary"><MailCheck aria-hidden="true" className="size-6" /></span>
        <h1 className="mt-5 text-2xl font-bold text-navy">Verifikasi email</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-slate-600">Verifikasi alamat email untuk mengaktifkan akun calon murid.</p>
        {token
          ? <VerifyEmailForm token={token} />
          : <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-danger">Tautan verifikasi tidak valid atau tidak lengkap.</p>}
        <p className="mt-6 text-center text-sm text-slate-500">Sudah siap? <Link href="/masuk" className="font-semibold text-primary hover:underline">Masuk</Link></p>
      </section>
    </main>
  );
}
