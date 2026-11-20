"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { ActionFeedback } from "@/components/auth/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);
  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <label className="block space-y-2 text-sm font-medium text-slate-700">Kata sandi baru<Input name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Minimal 8 karakter" /></label>
      <p className="-mt-3 text-xs leading-5 text-slate-500">Gunakan huruf besar, huruf kecil, dan angka.</p>
      <label className="block space-y-2 text-sm font-medium text-slate-700">Konfirmasi kata sandi<Input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={8} required placeholder="Ulangi kata sandi baru" /></label>
      <ActionFeedback state={state} />
      <Button className="w-full" type="submit" loading={pending}>Simpan kata sandi baru</Button>
    </form>
  );
}
