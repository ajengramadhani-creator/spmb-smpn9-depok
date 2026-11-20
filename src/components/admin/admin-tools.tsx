"use client";

import { useActionState } from "react";
import {
  createManualRegistrationAction,
  reviewDocumentAction,
  saveAnnouncementAction,
  savePaymentSettingsAction,
  verifyManualPaymentAction,
  type AdminActionState,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function ActionMessage({ state }: { state: AdminActionState }) {
  if (!state) return null;
  return (
    <p role={state.status === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-red-50 text-danger" : "bg-emerald-50 text-emerald-800"}`}>
      {state.message}
    </p>
  );
}

export function ManualRegistrationForm({ tracks }: { tracks: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createManualRegistrationAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm font-medium text-slate-700">Nama lengkap<Input name="fullName" required minLength={3} maxLength={150} /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">NIK (16 angka)<Input name="nationalId" inputMode="numeric" pattern="\d{16}" required maxLength={16} /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">NISN (10 angka)<Input name="nisn" inputMode="numeric" pattern="\d{10}" required maxLength={10} /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Nomor telepon<Input name="phone" type="tel" required minLength={9} maxLength={32} /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">Jalur pendaftaran
        <Select name="trackId" required defaultValue=""><option value="" disabled>Pilih jalur</option>{tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}</Select>
      </label>
      <div className="space-y-3 sm:col-span-2">
        <ActionMessage state={state} />
        <Button type="submit" loading={pending}>Tambah pendaftaran</Button>
      </div>
    </form>
  );
}

export function DocumentReviewForm({ documentId }: { documentId: string }) {
  const [state, action, pending] = useActionState(reviewDocumentAction, null);
  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="documentId" value={documentId} />
      <label className="block space-y-1 text-sm font-medium text-slate-700">Catatan untuk siswa
        <textarea name="note" maxLength={1000} rows={2} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </label>
      <ActionMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <Button name="status" value="DITERIMA" type="submit" loading={pending}>Setujui</Button>
        <Button name="status" value="PERLU_PERBAIKAN" type="submit" variant="secondary" loading={pending}>Minta perbaikan</Button>
      </div>
    </form>
  );
}

export function PaymentConfirmationForm({ paymentId }: { paymentId: string }) {
  const [state, action, pending] = useActionState(verifyManualPaymentAction, null);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <ActionMessage state={state} />
      <Button type="submit" size="sm" loading={pending}>Konfirmasi pembayaran</Button>
    </form>
  );
}

export function PaymentSettingsForm({
  amount,
  isEnabled,
  account,
}: {
  amount: number;
  isEnabled: boolean;
  account?: { id: string; bankName: string; accountName: string; accountNumber: string; instructions: string | null };
}) {
  const [state, action, pending] = useActionState(savePaymentSettingsAction, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      {account && <input type="hidden" name="bankAccountId" value={account.id} />}
      <label className="space-y-1 text-sm font-medium text-slate-700">Biaya pendaftaran (rupiah)<Input name="amount" type="number" min="0" max="1000000000" step="1000" defaultValue={amount} required /></label>
      <label className="flex items-center gap-2 self-end pb-3 text-sm text-slate-700"><input name="isEnabled" type="checkbox" defaultChecked={isEnabled} className="size-4 accent-primary" />Aktifkan tagihan pendaftaran</label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Nama bank<Input name="bankName" defaultValue={account?.bankName ?? ""} required minLength={2} maxLength={100} /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Nama pemilik rekening<Input name="accountName" defaultValue={account?.accountName ?? ""} required minLength={2} maxLength={120} /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Nomor rekening<Input name="accountNumber" defaultValue={account?.accountNumber ?? ""} required minLength={4} maxLength={64} /></label>
      <label className="space-y-1 text-sm font-medium text-slate-700">Petunjuk transfer<Input name="instructions" defaultValue={account?.instructions ?? ""} maxLength={1000} /></label>
      <div className="space-y-3 sm:col-span-2">
        <ActionMessage state={state} />
        <Button type="submit" loading={pending}>Simpan pengaturan</Button>
      </div>
    </form>
  );
}

export function AnnouncementForm({
  periods,
  initial,
}: {
  periods: { id: string; name: string }[];
  initial?: {
    id: string;
    title: string;
    body: string;
    type: "UMUM" | "JADWAL" | "HASIL" | "PEMBAYARAN";
    academicPeriodId: string | null;
    publishedAt: Date | null;
  };
}) {
  const [state, action, pending] = useActionState(saveAnnouncementAction, null);
  const dateParts = initial?.publishedAt
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(initial.publishedAt)
    : [];
  const dateValue = Object.fromEntries(dateParts.map(({ type, value }) => [type, value]));
  const localDateTime = initial?.publishedAt
    ? `${dateValue.year}-${dateValue.month}-${dateValue.day}T${dateValue.hour}:${dateValue.minute}`
    : "";
  return (
    <form action={action} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="block space-y-1 text-sm font-medium text-slate-700">Judul<Input name="title" defaultValue={initial?.title ?? ""} required minLength={3} maxLength={180} /></label>
      <label className="block space-y-1 text-sm font-medium text-slate-700">Isi pengumuman<textarea name="body" defaultValue={initial?.body ?? ""} required minLength={3} maxLength={10000} rows={4} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm font-medium text-slate-700">Jenis<Select name="type" defaultValue={initial?.type ?? "UMUM"}><option value="UMUM">Umum</option><option value="JADWAL">Jadwal</option><option value="HASIL">Hasil</option><option value="PEMBAYARAN">Pembayaran</option></Select></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">Target periode<Select name="academicPeriodId" defaultValue={initial?.academicPeriodId ?? ""}><option value="">Semua periode</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</Select></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">Waktu tayang<Input name="publishAt" type="datetime-local" defaultValue={localDateTime} /></label>
      </div>
      <p className="text-xs text-slate-500">Kosongkan waktu tayang untuk menyimpan sebagai draf. Waktu mendatang dijadwalkan.</p>
      <ActionMessage state={state} />
      <Button type="submit" loading={pending}>{initial ? "Simpan perubahan" : "Simpan pengumuman"}</Button>
    </form>
  );
}
