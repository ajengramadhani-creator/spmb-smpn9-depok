"use client";

import { useActionState } from "react";
import { verifyEmailAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

type VerificationState = { status: "success" | "error"; message: string } | null;

export function VerifyEmailForm({ token }: { token: string }) {
  const action = async (): Promise<VerificationState> => {
    const verified = await verifyEmailAction(token);
    return verified
      ? { status: "success", message: "Email berhasil diverifikasi. Anda sekarang dapat masuk." }
      : { status: "error", message: "Tautan verifikasi tidak valid atau sudah kedaluwarsa." };
  };
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      {state && <p role={state.status === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2.5 text-sm ${state.status === "error" ? "bg-red-50 text-danger" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>}
      {state?.status !== "success" && <Button className="w-full" type="submit" loading={pending}>Verifikasi email</Button>}
    </form>
  );
}
