"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  assignEligibleParticipantsAction,
  changeTestSessionStatusAction,
  createSelectionDraftAction,
  createTestPackageAction,
  createTestSessionAction,
  publishSelectionAction,
  saveQuestionAction,
  saveQuestionCategoryAction,
  type AssessmentActionState,
} from "@/app/admin/assessment-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function ActionMessage({ state }: { state: AssessmentActionState }) {
  if (!state) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${state.status === "error" ? "bg-red-50 text-danger" : "bg-emerald-50 text-emerald-800"}`}>{state.message}</p>;
}

export function QuestionCategoryForm() {
  const [state, action, pending] = useActionState(saveQuestionCategoryAction, null);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex-1 space-y-1 text-sm font-medium text-slate-700">Kategori baru<Input name="name" minLength={2} maxLength={80} required placeholder="Contoh: Matematika" /></label>
      <Button type="submit" loading={pending}>Simpan kategori</Button>
      <div className="sm:basis-full"><ActionMessage state={state} /></div>
    </form>
  );
}

export function QuestionForm({
  categories,
  initial,
}: {
  categories: { id: string; name: string }[];
  initial?: {
    id: string;
    categoryId: string;
    prompt: string;
    points: number;
    isActive: boolean;
    options: { label: string; content: string; isCorrect: boolean }[];
  };
}) {
  const [state, action, pending] = useActionState(saveQuestionAction, null);
  const getOption = (label: string) => initial?.options.find((option) => option.label === label);
  return (
    <form action={action} className="space-y-3">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <label className="block space-y-1 text-sm font-medium text-slate-700">Kategori<Select name="categoryId" defaultValue={initial?.categoryId ?? ""} required><option value="" disabled>Pilih kategori</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</Select></label>
      <label className="block space-y-1 text-sm font-medium text-slate-700">Pertanyaan<textarea name="prompt" defaultValue={initial?.prompt ?? ""} required minLength={5} maxLength={5000} rows={3} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B", "C", "D"] as const).map((label) => <label key={label} className="space-y-1 text-sm font-medium text-slate-700">Pilihan {label}<Input name={`option${label}`} defaultValue={getOption(label)?.content ?? ""} required maxLength={2000} /></label>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">Kunci jawaban<Select name="answer" defaultValue={initial?.options.find((option) => option.isCorrect)?.label ?? ""} required><option value="" disabled>Pilih kunci</option>{["A", "B", "C", "D"].map((label) => <option key={label} value={label}>{label}</option>)}</Select></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">Bobot nilai<Input name="points" type="number" min="0.01" max="100" step="0.01" defaultValue={initial?.points ?? 1} required /></label>
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked={initial?.isActive ?? true} className="size-4 accent-primary" />Soal aktif</label>
      <ActionMessage state={state} />
      <Button type="submit" loading={pending}>{initial ? "Simpan perubahan" : "Tambah soal"}</Button>
    </form>
  );
}

export function QuestionImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<{ baris: number; pesan: string }[]>([]);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setMessage("Pilih berkas Excel terlebih dahulu.");
      return;
    }
    const formData = new FormData();
    formData.set("file", file);
    setPending(true);
    setMessage("");
    setErrors([]);
    try {
      const response = await fetch("/api/admin/bank-soal/impor", { method: "POST", body: formData });
      const result = await response.json() as { pesan?: string; imported?: number; errors?: { baris: number; pesan: string }[] };
      setMessage(response.ok ? `${result.imported ?? 0} soal berhasil diimpor.` : result.pesan ?? "Impor soal gagal.");
      setErrors(result.errors ?? []);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      setMessage("Berkas belum berhasil diunggah. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-pale file:px-3 file:py-2 file:font-semibold file:text-primary" />
      {message && <p role={errors.length ? "alert" : "status"} className={`rounded-lg px-3 py-2 text-sm ${errors.length ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-700"}`}>{message}</p>}
      {errors.length > 0 && <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-amber-800">{errors.map((error) => <li key={`${error.baris}-${error.pesan}`}>Baris {error.baris}: {error.pesan}</li>)}</ul>}
      <Button type="submit" loading={pending}>Impor soal</Button>
    </form>
  );
}

export function TestPackageForm({ questions }: { questions: { id: string; prompt: string; category: string }[] }) {
  const [state, action, pending] = useActionState(createTestPackageAction, null);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">Nama paket<Input name="name" required minLength={2} maxLength={120} /></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">Durasi (menit)<Input name="durationMin" type="number" min="5" max="240" required defaultValue="60" /></label>
      </div>
      <label className="block space-y-1 text-sm font-medium text-slate-700">Deskripsi<Input name="description" maxLength={1000} /></label>
      <fieldset className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">Pilih soal aktif</legend>
        {questions.length ? questions.map((question) => <label key={question.id} className="flex items-start gap-2 text-sm text-slate-700"><input type="checkbox" name="questionId" value={question.id} className="mt-1 accent-primary" /><span><span className="font-medium">{question.category}</span> · {question.prompt}</span></label>) : <p className="text-sm text-slate-500">Belum ada soal aktif.</p>}
      </fieldset>
      <ActionMessage state={state} />
      <Button type="submit" loading={pending} disabled={!questions.length}>Buat paket soal</Button>
    </form>
  );
}

export function TestSessionForm({ packages }: { packages: { id: string; name: string; durationMin: number }[] }) {
  const [state, action, pending] = useActionState(createTestSessionAction, null);
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1 text-sm font-medium text-slate-700">Nama sesi<Input name="title" required minLength={3} maxLength={180} /></label>
      <label className="block space-y-1 text-sm font-medium text-slate-700">Paket soal<Select name="packageId" required defaultValue=""><option value="" disabled>Pilih paket</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.durationMin} menit</option>)}</Select></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm font-medium text-slate-700">Mulai (WIB)<Input name="startsAt" type="datetime-local" required /></label>
        <label className="space-y-1 text-sm font-medium text-slate-700">Selesai (WIB)<Input name="endsAt" type="datetime-local" required /></label>
      </div>
      <ActionMessage state={state} />
      <Button type="submit" loading={pending} disabled={!packages.length}>Jadwalkan sesi</Button>
    </form>
  );
}

export function SessionTools({ sessionId, status }: { sessionId: string; status: string }) {
  const [assignState, assignAction, assigning] = useActionState(assignEligibleParticipantsAction, null);
  const [statusState, statusAction, changing] = useActionState(changeTestSessionStatusAction, null);
  const statusOptions = status === "DRAF"
    ? [["TERJADWAL", "Jadwalkan"], ["DIBATALKAN", "Batalkan"]]
    : status === "TERJADWAL"
      ? [["TERJADWAL", "Tetap terjadwal"], ["BERLANGSUNG", "Mulai ujian"], ["SELESAI", "Akhiri dan nilai otomatis"], ["DIBATALKAN", "Batalkan"]]
      : [["SELESAI", "Akhiri dan nilai otomatis"]];
  const defaultStatus = status === "BERLANGSUNG" ? "SELESAI" : status === "DRAF" ? "TERJADWAL" : "TERJADWAL";
  return (
    <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
      {(status === "DRAF" || status === "TERJADWAL") && <form action={assignAction} className="space-y-2"><input type="hidden" name="sessionId" value={sessionId} /><ActionMessage state={assignState} /><Button type="submit" size="sm" variant="secondary" loading={assigning}>Tempatkan peserta layak</Button></form>}
      {statusOptions.length && status !== "SELESAI" && status !== "DIBATALKAN" && <form action={statusAction} className="space-y-2"><input type="hidden" name="sessionId" value={sessionId} /><Select name="status" defaultValue={defaultStatus}>{statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select><ActionMessage state={statusState} /><Button type="submit" size="sm" loading={changing}>Perbarui sesi</Button></form>}
    </div>
  );
}

export function SelectionDraftForm({ periods }: { periods: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(createSelectionDraftAction, null);
  return (
    <form action={action} className="space-y-3">
      <label className="block space-y-1 text-sm font-medium text-slate-700">Periode seleksi<Select name="academicPeriodId" defaultValue=""><option value="">Periode aktif</option>{periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</Select></label>
      <p className="text-xs leading-5 text-slate-500">Nilai berbobot: TKA 60%, rata-rata rapor 30%, bukti prestasi terverifikasi 10%. Sertifikat prestasi dinilai 100 bila disetujui dan 0 bila tidak ada/belum disetujui. Cadangan maksimal 10% kuota per jalur.</p>
      <ActionMessage state={state} />
      <Button type="submit" loading={pending}>Buat draf seleksi</Button>
    </form>
  );
}

export function PublishSelectionForm({ selectionVersionId }: { selectionVersionId: string }) {
  const [state, action, pending] = useActionState(publishSelectionAction, null);
  return <form action={action} className="space-y-2"><input type="hidden" name="selectionVersionId" value={selectionVersionId} /><ActionMessage state={state} /><Button type="submit" loading={pending}>Terbitkan hasil</Button></form>;
}
