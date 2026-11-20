"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction } from "@/app/actions/auth";
import { ActionFeedback } from "@/components/auth/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegistrationForm() {
  const [state, formAction, pending] = useActionState(registerAction, null);
  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-2 text-sm font-medium text-slate-700">Nama lengkap siswa<Input name="fullName" autoComplete="name" required maxLength={120} placeholder="Nama sesuai dokumen kependudukan" /></label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">NISN<Input name="nationalId" inputMode="numeric" autoComplete="off" minLength={10} maxLength={10} pattern="[0-9]{10}" required placeholder="10 digit NISN" /></label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">Email aktif<Input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="nama@email.com" /></label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">WhatsApp orang tua<Input name="phone" type="tel" autoComplete="tel" required placeholder="08xx atau +62..." /></label>
      <label className="block space-y-2 text-sm font-medium text-slate-700">Kata sandi<Input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Minimal 8 karakter" /></label>
      <p className="-mt-2 text-xs leading-5 text-slate-500">Gunakan minimal 8 karakter dengan huruf besar, huruf kecil, dan angka.</p>
      <label className="block space-y-2 text-sm font-medium text-slate-700">Konfirmasi kata sandi<Input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required placeholder="Ulangi kata sandi" /></label>
      <label className="flex items-start gap-2 text-sm leading-5 text-slate-600">
        <input className="mt-1 size-4 rounded border-slate-300 text-primary focus:ring-primary" type="checkbox" name="consent" required />
        <span>Saya menyatakan data yang diisi benar dan menyetujui ketentuan pendaftaran SPMB.</span>
      </label>
      <ActionFeedback state={state} />
      {state?.status === "success" ? (
        <Link href="/masuk" className="block"><Button className="w-full" variant="secondary">Kembali ke halaman masuk</Button></Link>
      ) : (
        <Button className="w-full" type="submit" loading={pending}>Buat akun</Button>
      )}
    </form>
  );
}
