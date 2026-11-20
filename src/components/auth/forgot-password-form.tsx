"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { ActionFeedback } from "@/components/auth/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, null);
  return (
    <form action={formAction} className="space-y-5">
      <label className="block space-y-2 text-sm font-medium text-slate-700">Email terdaftar<Input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="nama@email.com" /></label>
      <ActionFeedback state={state} />
      <Button className="w-full" type="submit" loading={pending}>Kirim tautan reset</Button>
    </form>
  );
}
