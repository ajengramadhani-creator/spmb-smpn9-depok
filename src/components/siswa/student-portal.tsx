"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Bell, CalendarDays, Check, Clock3, Download, Eye, FileCheck2, GraduationCap, LockKeyhole, RefreshCw, Save, Send, ShieldCheck, Upload, UserRound } from "lucide-react";
import { Stepper } from "@/components/ui/stepper";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { saveRegistrationStage, submitRegistration, updateStudentPassword, updateStudentProfile, markAnnouncementRead, markNotificationsRead, refreshInvoiceStatus, saveTestAnswer, submitTest } from "@/app/siswa/actions";
import type { getExamData, getStudentPortalData } from "@/server/services/student-portal";

type PortalData = Awaited<ReturnType<typeof getStudentPortalData>>;
type ExamData = Awaited<ReturnType<typeof getExamData>>;
type PageProps = { page: string; detailId?: string; data: PortalData; exam: ExamData };
type GradeRow = { subject: string; semester: number; schoolYear: string; score: number | "" };
type FormValues = Record<string, string>;

const stageNames = ["Data diri", "Orang tua/wali", "Asal sekolah", "Nilai rapor kelas 4–6", "Pilihan jalur"];
const documentRequirements = [
  { type: "KARTU_KELUARGA", label: "Kartu Keluarga (KK)", required: true },
  { type: "AKTA_KELAHIRAN", label: "Akta kelahiran", required: true },
  { type: "RAPOR", label: "Rapor kelas 4–6", required: true },
  { type: "PAS_FOTO", label: "Pas foto", required: true },
  { type: "IJAZAH", label: "Surat Keterangan Lulus (SKL)", required: true },
  { type: "BUKTI_PRESTASI", label: "Sertifikat prestasi", required: false },
] as const;
const currency = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
const dateLong = (date: Date | string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(date));
const dateTime = (date: Date | string) => new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(date));

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6 ${className}`}>{children}</section>;
}

function Notice({ children, kind = "info" }: { children: React.ReactNode; kind?: "info" | "success" | "error" }) {
  const colors = kind === "error" ? "border-red-200 bg-red-50 text-red-800" : kind === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-blue-100 bg-pale text-slate-700";
  return <p role={kind === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm ${colors}`}>{children}</p>;
}

function Field({ label, name, defaultValue = "", type = "text", required = true, placeholder, inputMode, readOnly = false }: { label: string; name: string; defaultValue?: string | number; type?: string; required?: boolean; placeholder?: string; inputMode?: "numeric" | "text" | "tel"; readOnly?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700">{label}<input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} inputMode={inputMode} readOnly={readOnly} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-100 read-only:bg-slate-50" /></label>;
}

function draftRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function objectRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function formValues(value: unknown): FormValues {
  return Object.fromEntries(Object.entries(objectRecord(value)).map(([key, fieldValue]) => [key, String(fieldValue ?? "")]));
}

function RegistrationForm({ data }: { data: PortalData }) {
  const router = useRouter();
  const saved = new Set(data.registration?.submittedAt ? ["0", "1", "2", "3", "4"] : data.draft?.savedSections ?? []);
  const stored = draftRecord(data.draft?.data);
  const student = data.student;
  const initialPersonal = {
    fullName: student?.fullName ?? data.user.name,
    nisn: student?.nisn ?? "",
    nationalId: student?.nationalId?.length === 16 ? student.nationalId : "",
    birthPlace: student?.birthPlace ?? "",
    birthDate: student?.birthDate ? new Date(student.birthDate).toISOString().slice(0, 10) : "",
    gender: student?.gender ?? "",
    phone: student?.phone ?? "",
    address: student?.address ?? "",
  };
  const initialGuardian = data.student?.guardians[0];
  const initialSchool = data.student?.schoolOrigin;
  const initialGrades = data.student?.reportGrades.map((grade) => ({
    subject: grade.subject,
    semester: grade.semester,
    schoolYear: grade.schoolYear,
    score: grade.score,
  })) ?? [];
  const [valuesByStage, setValuesByStage] = useState<Record<string, unknown>>({
    "0": { ...initialPersonal, ...objectRecord(stored["0"]) },
    "1": { name: initialGuardian?.name ?? "", relationship: initialGuardian?.relationship ?? "", phone: initialGuardian?.phone ?? "", email: initialGuardian?.email ?? "", occupation: initialGuardian?.occupation ?? "", ...objectRecord(stored["1"]) },
    "2": { name: initialSchool?.name ?? "", npsn: initialSchool?.npsn ?? "", address: initialSchool?.address ?? "", city: initialSchool?.city ?? "", graduationYear: initialSchool?.graduationYear ?? 2027, ...objectRecord(stored["2"]) },
    "3": { grades: initialGrades.length ? initialGrades : Array.from({ length: 6 }, (_, index) => ({ subject: ["Bahasa Indonesia", "Matematika", "IPAS"][index % 3], semester: index + 1, schoolYear: "", score: "" })), ...objectRecord(stored["3"]) },
    "4": { trackId: data.registration?.trackId ?? "", ...objectRecord(stored["4"]) },
  });
  const firstIncomplete = stageNames.findIndex((_, index) => !saved.has(String(index)));
  const [activeStage, setActiveStage] = useState(Math.max(0, firstIncomplete));
  const [savedSections, setSavedSections] = useState(saved);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const locked = Boolean(data.registration?.submittedAt);
  const grades = objectRecord(valuesByStage["3"]).grades as GradeRow[] | undefined ?? [];
  const scoredGrades = grades.filter((grade) => grade.score !== "");
  const average = scoredGrades.reduce((sum, grade) => sum + Number(grade.score), 0) / (scoredGrades.length || 1);

  function updateStage(stage: number, value: unknown) {
    setValuesByStage((current) => ({ ...current, [String(stage)]: value }));
    setDirty(true);
  }

  function moveToStage(stage: number) {
    if (dirty) {
      setError("Simpan perubahan pada bagian ini sebelum berpindah ke bagian lain.");
      return;
    }
    setActiveStage(stage);
  }

  async function saveStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    let values: unknown;
    if (activeStage === 3) {
      const subjects = formData.getAll("subject").map(String);
      const semesters = formData.getAll("semester").map(Number);
      const years = formData.getAll("schoolYear").map(String);
      const scores = formData.getAll("score").map((score) => Number(score));
      values = { grades: subjects.map((subject, index) => ({ subject, semester: semesters[index], schoolYear: years[index], score: scores[index] })) };
    } else {
      values = Object.fromEntries(formData.entries());
      if (activeStage === 2) (values as FormValues).graduationYear = String(formData.get("graduationYear") ?? "");
    }
    try {
      const result = await saveRegistrationStage(activeStage, values);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDirty(false);
      setMessage(result.message);
      setSavedSections((current) => new Set([...current, String(activeStage)]));
      setValuesByStage((current) => ({ ...current, [String(activeStage)]: values }));
      router.refresh();
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setError("Bagian formulir belum berhasil disimpan. Periksa koneksi, lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function sendForm() {
    if (!window.confirm("Kirim formulir pendaftaran? Data tidak dapat diubah setelah dikirim.")) return;
    setBusy(true);
    setError("");
    try {
      const result = await submitRegistration();
      setMessage(result.message);
      if (!result.ok) setError(result.message ?? "Formulir belum dapat dikirim.");
      else router.refresh();
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setError("Formulir belum berhasil dikirim. Periksa koneksi, lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  const summary = [
    ["Data diri", ["Nama", "NISN", "NIK", "Tempat lahir", "Tanggal lahir", "Nomor telepon", "Alamat"]],
    ["Orang tua/wali", ["name", "relationship", "phone", "email", "occupation"]],
    ["Asal sekolah", ["name", "npsn", "address", "city", "graduationYear"]],
  ];

  return <>
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-navy">Formulir pendaftaran</h2><p className="mt-1 text-sm text-slate-500">Simpan setiap bagian sebagai draf sebelum mengirim.</p></div><span className="rounded-full bg-pale px-3 py-1 text-sm font-semibold text-primary">{savedSections.size} dari 5 bagian tersimpan</span></div>
      <div className="mt-6 overflow-x-auto pb-2"><div className="min-w-[36rem]"><Stepper steps={stageNames} currentStep={activeStage} /></div></div>
      {locked && <Notice kind="success">Formulir telah dikirim dan terkunci. Nomor pendaftaran: <strong>{data.registration?.registrationNo}</strong>.</Notice>}
      {message && !locked && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {savedSections.size === 5 && <div className="mt-6 rounded-xl border border-green-100 bg-green-50/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-navy">Ringkasan pendaftaran</h3><p className="mt-1 text-sm text-slate-600">Periksa data sebelum mengirim formulir.</p></div>{!locked && <Button onClick={() => void sendForm()} disabled={busy || dirty}><Send aria-hidden="true" className="size-4" />{dirty ? "Simpan perubahan untuk mengirim" : "Kirim formulir"}</Button>}</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{summary.map(([title, labels], index) => <div key={String(title)} className="rounded-lg bg-white p-4"><div className="flex justify-between"><h4 className="text-sm font-semibold text-navy">{title}</h4>{!locked && <button className="text-xs font-semibold text-primary" onClick={() => moveToStage(index)}>Edit</button>}</div><dl className="mt-2 space-y-1 text-xs text-slate-500">{(labels as string[]).map((label) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="truncate text-right text-slate-700">{String(objectRecord(valuesByStage[String(index)])[label === "Nama" ? "fullName" : label === "NISN" ? "nisn" : label === "NIK" ? "nationalId" : label === "Tempat lahir" ? "birthPlace" : label === "Tanggal lahir" ? "birthDate" : label === "Nomor telepon" ? "phone" : label === "Alamat" ? "address" : label] ?? "—")}</dd></div>)}</dl></div>)}
          <div className="rounded-lg bg-white p-4"><div className="flex justify-between"><h4 className="text-sm font-semibold text-navy">Nilai rapor</h4>{!locked && <button className="text-xs font-semibold text-primary" onClick={() => moveToStage(3)}>Edit</button>}</div><p className="mt-2 text-sm text-slate-600">{grades.length} nilai · Rata-rata <strong>{scoredGrades.length ? average.toFixed(2) : "—"}</strong></p></div>
          <div className="rounded-lg bg-white p-4"><div className="flex justify-between"><h4 className="text-sm font-semibold text-navy">Pilihan jalur</h4>{!locked && <button className="text-xs font-semibold text-primary" onClick={() => moveToStage(4)}>Edit</button>}</div><p className="mt-2 text-sm text-slate-600">{data.period?.tracks.find((track) => track.id === String(objectRecord(valuesByStage["4"]).trackId))?.name ?? "Belum dipilih"}</p></div>
        </div>
      </div>}
      {!locked && <form key={activeStage} onSubmit={saveStage} onChange={() => setDirty(true)} className="mt-6 border-t border-slate-100 pt-6">
        <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Bagian {activeStage + 1} dari 5</p><h3 className="mt-1 text-lg font-semibold text-navy">{stageNames[activeStage]}</h3></div>{savedSections.has(String(activeStage)) && <span className="flex items-center gap-1 text-xs font-medium text-green-700"><Check aria-hidden="true" className="size-4" />Tersimpan</span>}</div>
        {activeStage === 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nama lengkap" name="fullName" defaultValue={formValues(valuesByStage["0"]).fullName} />
          <Field label="NISN (10 angka)" name="nisn" defaultValue={formValues(valuesByStage["0"]).nisn} inputMode="numeric" />
          <Field label="NIK (16 angka)" name="nationalId" defaultValue={formValues(valuesByStage["0"]).nationalId} inputMode="numeric" />
          <Field label="Tempat lahir" name="birthPlace" defaultValue={formValues(valuesByStage["0"]).birthPlace} />
          <Field label="Tanggal lahir" name="birthDate" type="date" defaultValue={formValues(valuesByStage["0"]).birthDate} />
          <label className="block text-sm font-medium text-slate-700">Jenis kelamin<select name="gender" required defaultValue={formValues(valuesByStage["0"]).gender} className="mt-1.5 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Pilih jenis kelamin</option><option value="LAKI_LAKI">Laki-laki</option><option value="PEREMPUAN">Perempuan</option></select></label>
          <Field label="Nomor telepon" name="phone" type="tel" defaultValue={formValues(valuesByStage["0"]).phone} />
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">Alamat rumah<textarea name="address" required minLength={8} defaultValue={formValues(valuesByStage["0"]).address} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-100" /></label>
        </div>}
        {activeStage === 1 && <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nama orang tua/wali" name="name" defaultValue={formValues(valuesByStage["1"]).name} />
          <Field label="Hubungan" name="relationship" defaultValue={formValues(valuesByStage["1"]).relationship} placeholder="Contoh: Ibu" />
          <Field label="Nomor telepon" name="phone" type="tel" defaultValue={formValues(valuesByStage["1"]).phone} />
          <Field label="Email" name="email" type="email" required={false} defaultValue={formValues(valuesByStage["1"]).email} />
          <Field label="Pekerjaan" name="occupation" defaultValue={formValues(valuesByStage["1"]).occupation} />
        </div>}
        {activeStage === 2 && <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Nama sekolah asal" name="name" defaultValue={formValues(valuesByStage["2"]).name} />
          <Field label="NPSN (8 angka)" name="npsn" defaultValue={formValues(valuesByStage["2"]).npsn} required={false} />
          <Field label="Alamat sekolah" name="address" defaultValue={formValues(valuesByStage["2"]).address} />
          <Field label="Kota/kabupaten" name="city" defaultValue={formValues(valuesByStage["2"]).city} />
          <Field label="Tahun lulus" name="graduationYear" type="number" defaultValue={formValues(valuesByStage["2"]).graduationYear || "2027"} />
        </div>}
        {activeStage === 3 && <div className="mt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-slate-600">Masukkan nilai semester kelas 4, 5, dan 6. Rata-rata dihitung otomatis.</p><span className="rounded-full bg-pale px-3 py-1 text-sm font-semibold text-primary">Rata-rata: {scoredGrades.length ? average.toFixed(2) : "—"}</span></div>
          <div className="space-y-3">{grades.map((grade, index) => <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1.4fr_0.7fr_1fr_0.7fr_auto]">
            <label className="text-xs font-medium text-slate-600">Mata pelajaran<input name="subject" required value={grade.subject} onChange={(event) => updateStage(3, { grades: grades.map((item, row) => row === index ? { ...item, subject: event.target.value } : item) })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">Semester<select name="semester" value={grade.semester} onChange={(event) => updateStage(3, { grades: grades.map((item, row) => row === index ? { ...item, semester: Number(event.target.value) } : item) })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm">{[1, 2, 3, 4, 5, 6].map((semester) => <option key={semester} value={semester}>{semester} · Kelas {4 + Math.floor((semester - 1) / 2)}</option>)}</select></label>
            <label className="text-xs font-medium text-slate-600">Tahun ajaran<input name="schoolYear" required value={grade.schoolYear} placeholder="2024/2025" onChange={(event) => updateStage(3, { grades: grades.map((item, row) => row === index ? { ...item, schoolYear: event.target.value } : item) })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
            <label className="text-xs font-medium text-slate-600">Nilai<input name="score" required type="number" min="0" max="100" step="0.01" value={grade.score} onChange={(event) => updateStage(3, { grades: grades.map((item, row) => row === index ? { ...item, score: event.target.value === "" ? "" : Number(event.target.value) } : item) })} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-2 text-sm" /></label>
            <button type="button" aria-label="Hapus nilai" onClick={() => updateStage(3, { grades: grades.filter((_, row) => row !== index) })} className="self-end rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-100">Hapus</button>
          </div>)}</div>
          <button type="button" className="mt-3 text-sm font-semibold text-primary" onClick={() => updateStage(3, { grades: [...grades, { subject: "", semester: 1, schoolYear: "", score: "" }] })}>+ Tambah nilai</button>
        </div>}
        {activeStage === 4 && <div className="mt-5 grid gap-3 sm:grid-cols-2">{data.period?.tracks.map((track) => <label key={track.id} className={`cursor-pointer rounded-xl border p-4 transition ${String(objectRecord(valuesByStage["4"]).trackId) === track.id ? "border-primary bg-pale ring-1 ring-primary" : "border-slate-200 hover:border-blue-300"}`}><span className="flex items-start gap-3"><input type="radio" name="trackId" required value={track.id} checked={String(objectRecord(valuesByStage["4"]).trackId) === track.id} onChange={() => updateStage(4, { trackId: track.id })} className="mt-1 accent-blue-600" /><span><span className="block font-semibold text-navy">{track.name}</span><span className="mt-1 block text-sm text-slate-500">{track.description || `${track.quota} kuota tersedia`}</span></span></span></label>)}</div>}
        <div className="mt-6 flex flex-wrap justify-between gap-3"><Button type="button" variant="secondary" disabled={activeStage === 0 || busy} onClick={() => moveToStage(activeStage - 1)}><ArrowLeft aria-hidden="true" className="size-4" />Sebelumnya</Button><div className="flex gap-2"><Button type="submit" disabled={busy}><Save aria-hidden="true" className="size-4" />{busy ? "Menyimpan..." : "Simpan draf"}</Button><Button type="button" variant="secondary" disabled={activeStage === 4 || busy} onClick={() => moveToStage(activeStage + 1)}>Berikutnya<ArrowRight aria-hidden="true" className="size-4" /></Button></div></div>
      </form>}
    </Panel>
  </>;
}

function DocumentsPage({ data }: { data: PortalData }) {
  const router = useRouter();
  const registration = data.registration;
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function upload(type: string, file?: File) {
    if (!file || !registration) return;
    setMessage("");
    setError("");
    const form = new FormData();
    form.set("registrationId", registration.id);
    form.set("type", type);
    form.set("file", file);
    try {
      const response = await fetch("/api/siswa/dokumen", { method: "POST", body: form });
      const body = await response.json() as { pesan?: string };
      if (!response.ok) setError(body.pesan ?? "Berkas gagal diunggah.");
      else {
        setMessage(body.pesan ?? "Berkas berhasil diunggah.");
        router.refresh();
      }
    } catch (requestError) {
      if (!(requestError instanceof TypeError || requestError instanceof SyntaxError)) throw requestError;
      setError("Berkas belum dapat diunggah. Periksa koneksi Anda dan coba lagi.");
    }
  }
  if (!registration) return <EmptyState title="Formulir belum dikirim" description="Kirim formulir pendaftaran terlebih dahulu untuk mengunggah dokumen." />;
  return <div className="space-y-4">
    {message && <Notice kind="success">{message}</Notice>}{error && <Notice kind="error">{error}</Notice>}
    <Notice>Format berkas PDF, JPG, atau PNG · Maksimal 2 MB per berkas. Berkas hanya dapat diakses melalui tautan privat.</Notice>
    <div className="grid gap-4 lg:grid-cols-2">{documentRequirements.map((requirement) => {
      const required = requirement.required || (registration.track.type === "PRESTASI" && requirement.type === "BUKTI_PRESTASI");
      const document = registration.documents.find((item) => item.type === requirement.type);
      const review = document?.reviews[0];
      const status = review?.status === "DITERIMA" ? "Diterima" : review?.status === "DITOLAK" || review?.status === "PERLU_PERBAIKAN" ? "Ditolak" : document ? "Menunggu" : "Belum diunggah";
      const badge = status === "Diterima" ? "bg-green-50 text-green-700" : status === "Ditolak" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
      return <Panel key={requirement.type} className="p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-pale text-primary"><FileCheck2 aria-hidden="true" className="size-5" /></span><div><h3 className="font-semibold text-navy">{requirement.label}</h3><p className="mt-1 text-xs text-slate-500">{required ? "Wajib" : "Opsional"} · {status}</p></div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge}`}>{status}</span></div>
        {document && <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm"><p className="truncate font-medium text-slate-700">{document.fileName}</p><p className="mt-1 text-xs text-slate-500">{Math.ceil(document.sizeBytes / 1024)} KB · Diunggah {dateLong(document.uploadedAt)}</p>{review?.note && <p className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">Catatan panitia: {review.note}</p>}<a href={`/api/dokumen/${document.id}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"><Eye aria-hidden="true" className="size-4" />Pratinjau berkas</a></div>}
        <div className="mt-4"><FileDropzone key={`${requirement.type}-${document?.id ?? "baru"}`} onFiles={(files) => void upload(requirement.type, files[0])} prompt={document ? "Ganti / Unggah ulang berkas" : "Pilih atau unggah berkas"} maxSizeMb={2} multiple={false} /></div>
        {document && <p className="mt-2 text-xs text-slate-500">{status === "Diterima" ? "Ganti berkas jika ada perubahan." : "Unggah ulang jika berkas perlu diperbaiki."}</p>}
      </Panel>;
    })}</div>
  </div>;
}

function PaymentPage({ data }: { data: PortalData }) {
  const router = useRouter();
  const [method, setMethod] = useState("VIRTUAL_ACCOUNT");
  const [evidence, setEvidence] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const registration = data.registration;
  const invoices = registration?.invoices ?? [];
  async function pay(invoiceId: string) {
    setBusy(true);
    setMessage("");
    setError("");
    const form = new FormData();
    form.set("invoiceId", invoiceId);
    form.set("method", method);
    if (evidence) form.set("evidence", evidence);
    try {
      const response = await fetch("/api/siswa/pembayaran", { method: "POST", body: form });
      const result = await response.json() as { pesan?: string; redirectUrl?: string; instructions?: string };
      setBusy(false);
      if (!response.ok) setError(result.pesan ?? "Pembayaran tidak dapat diproses.");
      else if (result.redirectUrl) window.location.assign(result.redirectUrl);
      else {
        setMessage(result.instructions ?? "Bukti pembayaran dikirim untuk diverifikasi.");
        router.refresh();
      }
    } catch (requestError) {
      setBusy(false);
      if (!(requestError instanceof TypeError || requestError instanceof SyntaxError)) throw requestError;
      setError("Pembayaran belum dapat diproses. Periksa koneksi Anda dan coba lagi.");
    }
  }
  async function check(invoiceId: string) {
    setBusy(true);
    setError("");
    try {
      const result = await refreshInvoiceStatus(invoiceId);
      if (!result.ok) setError(result.message ?? "Status pembayaran tidak dapat diperiksa.");
      else {
        setMessage(result.status === "LUNAS" ? "Pembayaran telah lunas." : "Pembayaran masih menunggu konfirmasi.");
        router.refresh();
      }
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setError("Status pembayaran belum berhasil diperiksa. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  if (!registration) return <EmptyState title="Belum ada tagihan" description="Tagihan akan tersedia setelah formulir pendaftaran dikirim dan biaya ditetapkan." />;
  if (!invoices.length) return <div className="space-y-4"><EmptyState title="Tagihan belum tersedia" description="Informasi pembayaran akan tampil setelah panitia mengaktifkan biaya pendaftaran." /><Panel><h2 className="font-semibold text-navy">Metode pembayaran tersedia</h2><p className="mt-2 text-sm leading-6 text-slate-600">Virtual Account, QRIS, E-wallet, dan transfer bank. Anda dapat melakukan pembayaran setelah tagihan diterbitkan.</p></Panel></div>;
  return <div className="space-y-5">
    {message && <Notice kind="success">{message}</Notice>}{error && <Notice kind="error">{error}</Notice>}
    {invoices.map((invoice) => {
      const countdown = invoice.dueAt ? Math.max(0, Math.ceil((new Date(invoice.dueAt).getTime() - Date.now()) / 86_400_000)) : null;
      return <Panel key={invoice.id}>
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nomor tagihan</p><h2 className="mt-1 text-lg font-bold text-navy">{invoice.invoiceNo}</h2><p className="mt-1 text-sm text-slate-500">Diterbitkan {dateLong(invoice.createdAt)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${invoice.status === "LUNAS" ? "bg-green-50 text-green-700" : invoice.status === "KADALUWARSA" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{invoice.status.replaceAll("_", " ")}</span></div>
        <div className="mt-5 grid gap-4 border-y border-slate-100 py-4 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Biaya pendaftaran</p><p className="mt-1 font-semibold text-navy">{currency.format(invoice.amount)}</p></div><div><p className="text-xs text-slate-500">Batas pembayaran</p><p className="mt-1 font-semibold text-navy">{invoice.dueAt ? dateLong(invoice.dueAt) : "Belum ditentukan"}</p></div><div><p className="text-xs text-slate-500">Waktu tersisa</p><p className="mt-1 flex items-center gap-1 font-semibold text-navy"><Clock3 aria-hidden="true" className="size-4 text-primary" />{countdown === null ? "—" : countdown ? `${countdown} hari` : "Batas waktu terlewati"}</p></div></div>
        {invoice.status !== "LUNAS" && <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div><h3 className="font-semibold text-navy">Pilih metode pembayaran</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{[["VIRTUAL_ACCOUNT", "Virtual Account"], ["QRIS", "QRIS"], ["E_WALLET", "E-wallet"], ["TRANSFER_BANK", "Transfer bank"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm ${method === value ? "border-primary bg-pale" : "border-slate-200"}`}><input type="radio" name="paymentMethod" value={value} checked={method === value} onChange={() => setMethod(value)} className="accent-blue-600" />{label}</label>)}</div>
            {method === "TRANSFER_BANK" && <label className="mt-4 block text-sm font-medium text-slate-700">Bukti transfer<input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setEvidence(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-pale file:px-3 file:py-2 file:font-semibold file:text-primary" /><span className="mt-1 block text-xs text-slate-500">PDF, JPG, PNG · Maksimal 2 MB.</span></label>}
            <Button className="mt-4" disabled={busy || (method === "TRANSFER_BANK" && !evidence)} onClick={() => void pay(invoice.id)}><CreditCardIcon />{busy ? "Memproses..." : "Lanjutkan pembayaran"}</Button>
          </div>
          <div className="rounded-xl bg-pale p-4"><h3 className="font-semibold text-navy">Instruksi transfer bank</h3>{data.bankAccounts.length ? data.bankAccounts.map((account) => <div key={`${account.bankName}-${account.accountNumber}`} className="mt-3 rounded-lg bg-white p-3 text-sm"><p className="font-semibold text-navy">{account.bankName}</p><p className="mt-1 text-slate-700">{account.accountNumber}</p><p className="text-xs text-slate-500">a.n. {account.accountName}</p>{account.instructions && <p className="mt-2 text-xs leading-5 text-slate-500">{account.instructions}</p>}</div>) : <p className="mt-2 text-sm leading-6 text-slate-600">Pilih Virtual Account, QRIS, atau E-wallet untuk mendapatkan instruksi pembayaran dari penyedia pembayaran.</p>}</div>
        </div>}
        {invoice.status === "LUNAS" && <div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => window.open(`/api/siswa/pdf/kwitansi?invoiceId=${encodeURIComponent(invoice.id)}`, "_blank", "noopener,noreferrer")}><Download aria-hidden="true" className="size-4" />Unduh kwitansi PDF</Button></div>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Riwayat transaksi: {invoice.payments.length || "belum ada"}</p>{invoice.status !== "LUNAS" && <Button variant="secondary" size="sm" disabled={busy} onClick={() => void check(invoice.id)}><RefreshCw aria-hidden="true" className="size-4" />Cek status</Button>}</div>
        {invoice.payments.length > 0 && <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100">{invoice.payments.map((payment) => <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{payment.provider.replaceAll("_", " ")} · {dateTime(payment.createdAt)}</span><span className="font-medium">{currency.format(payment.amount)} · {payment.status.replaceAll("_", " ")}</span>{payment.hasEvidence && <a className="basis-full text-xs font-semibold text-primary" href={`/api/siswa/pembayaran/${payment.id}/bukti`} target="_blank" rel="noreferrer">Lihat bukti transfer</a>}</li>)}</ul>}
      </Panel>;
    })}
  </div>;
}

function CreditCardIcon() {
  return <span aria-hidden="true" className="text-base leading-none">▤</span>;
}

function ResultsPage({ data }: { data: PortalData }) {
  const registration = data.registration;
  if (!registration) return <EmptyState title="Hasil belum tersedia" description="Hasil seleksi akan ditampilkan setelah formulir pendaftaran dan tahapan seleksi selesai." />;
  const result = registration.selectionResults[0];
  const participant = registration.testParticipants[0];
  if (result) {
    const passed = result.status === "DITERIMA";
    return <div className="space-y-5"><Panel className={passed ? "border-green-200 bg-green-50/40" : "border-blue-100"}>
      <div className="flex items-start gap-4"><span className={`grid size-12 shrink-0 place-items-center rounded-full ${passed ? "bg-green-100 text-green-700" : "bg-pale text-primary"}`}><GraduationCap aria-hidden="true" className="size-6" /></span><div><p className="text-sm text-slate-500">Hasil seleksi resmi · Versi {result.selectionVersion.version}</p><h2 className="mt-1 text-2xl font-bold text-navy">{result.status === "DITERIMA" ? "Selamat, Anda diterima!" : result.status === "CADANGAN" ? "Anda masuk daftar cadangan" : "Belum berhasil pada seleksi ini"}</h2><p className="mt-2 text-sm text-slate-600">{result.note || "Hasil ini berasal dari versi seleksi yang telah diterbitkan panitia."}</p></div></div>
      <div className="mt-6 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-3"><div><p className="text-xs text-slate-500">Nomor pendaftaran</p><p className="mt-1 font-semibold">{registration.registrationNo}</p></div><div><p className="text-xs text-slate-500">Skor seleksi</p><p className="mt-1 font-semibold">{result.score === null ? "—" : result.score}</p></div><div><p className="text-xs text-slate-500">Peringkat</p><p className="mt-1 font-semibold">{result.rank ?? "—"}</p></div></div>
      <div className="mt-5 flex flex-wrap gap-3"><Button onClick={() => window.open("/api/siswa/pdf/surat-keputusan", "_blank", "noopener,noreferrer")}><Download aria-hidden="true" className="size-4" />Unduh Surat Keputusan PDF</Button><Link href="/siswa/pengumuman"><Button variant="secondary">Informasi daftar ulang</Button></Link></div>
    </Panel><Panel><h3 className="font-semibold text-navy">Panduan daftar ulang</h3><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600"><li>Unduh dan simpan Surat Keputusan hasil seleksi.</li><li>Pantau pengumuman resmi untuk jadwal dan dokumen daftar ulang.</li><li>Ikuti petunjuk daftar ulang sesuai jadwal yang diterbitkan sekolah.</li></ol></Panel></div>;
  }
  const session = participant?.session ?? data.upcomingTestSession;
  const isLive = session?.status === "BERLANGSUNG";
  return <div className="space-y-5"><Panel><div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pale text-primary"><CalendarDays aria-hidden="true" className="size-5" /></span><div><h2 className="text-lg font-semibold text-navy">{session ? isLive ? "Tes sedang berlangsung" : "Jadwal dan kartu peserta" : "Hasil seleksi belum tersedia"}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{session ? `${session.title} · ${dateTime(session.startsAt)} WIB` : registration.status === "TERVERIFIKASI" || registration.status === "MENGIKUTI_SELEKSI" ? "Pantau portal ini untuk jadwal TKA dan hasil seleksi yang diterbitkan." : "Jadwal akan tersedia setelah pendaftaran Anda memenuhi persyaratan seleksi."}</p></div></div>
      {session && <div className="mt-5 flex flex-wrap gap-3">{participant && <Button variant="secondary" onClick={() => window.open("/api/siswa/pdf/kartu-peserta", "_blank", "noopener,noreferrer")}><Download aria-hidden="true" className="size-4" />Unduh kartu peserta PDF</Button>}{isLive && participant && <Link href="/siswa/ujian"><Button>Masuk ujian<ArrowRight aria-hidden="true" className="size-4" /></Button></Link>}</div>}
      <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600"><p className="font-semibold text-navy">Status hasil</p><p className="mt-1">Hasil seleksi ditampilkan hanya setelah versi hasil resmi diterbitkan panitia.</p></div>
    </Panel>{!session && <Panel><EmptyState title="Menunggu tahapan berikutnya" description="Informasi jadwal, kartu peserta, dan hasil akan tampil di halaman ini sesuai tahap seleksi." /></Panel>}</div>;
}

function AnnouncementsPage({ data, detailId }: { data: PortalData; detailId?: string }) {
  const router = useRouter();
  const [category, setCategory] = useState("SEMUA");
  const [tab, setTab] = useState("SEMUA");
  const [error, setError] = useState("");
  const announcement = detailId ? data.announcements.find((item) => item.id === detailId) : null;
  useEffect(() => {
    if (announcement && !announcement.reads.length) {
      void markAnnouncementRead(announcement.id).catch((actionError: unknown) => {
        if (!(actionError instanceof Error)) throw actionError;
        setError("Status baca pengumuman belum berhasil disimpan.");
      });
    }
  }, [announcement]);
  if (detailId) {
    if (!announcement) return <EmptyState title="Pengumuman tidak ditemukan" description="Pengumuman mungkin tidak lagi tersedia." />;
    return <div className="space-y-4">{error && <Notice kind="error">{error}</Notice>}<Panel><button onClick={() => router.push("/siswa/pengumuman")} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke pengumuman</button><span className="block text-xs font-semibold uppercase tracking-wide text-primary">{announcement.type}</span><h2 className="mt-2 text-2xl font-bold text-navy">{announcement.title}</h2><p className="mt-2 text-sm text-slate-500">{announcement.publishedAt ? dateLong(announcement.publishedAt) : ""}</p><div className="mt-6 whitespace-pre-wrap text-sm leading-7 text-slate-700">{announcement.body}</div>{announcement.attachments.length > 0 && <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="font-semibold text-navy">Lampiran</h3><ul className="mt-3 space-y-2">{announcement.attachments.map((attachment) => <li key={attachment.id}><a href={`/api/siswa/pengumuman/${announcement.id}/lampiran/${attachment.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary"><Download aria-hidden="true" className="size-4" />{attachment.fileName}</a></li>)}</ul></div>}</Panel></div>;
  }
  const filtered = data.announcements.filter((item) =>
    (category === "SEMUA" || item.type === category) &&
    (tab === "SEMUA" || (tab === "BELUM_DIBACA" ? !item.reads.length : Boolean(item.reads.length))),
  );
  return <div className="space-y-4">{error && <Notice kind="error">{error}</Notice>}<Panel><div className="flex flex-wrap gap-3"><label className="text-sm font-medium text-slate-700">Kategori<select value={category} onChange={(event) => setCategory(event.target.value)} className="ml-2 h-10 rounded-lg border border-slate-300 bg-white px-3"><option value="SEMUA">Semua kategori</option><option value="UMUM">Umum</option><option value="JADWAL">Jadwal</option><option value="HASIL">Hasil</option><option value="PEMBAYARAN">Pembayaran</option></select></label><div className="flex gap-2" role="tablist" aria-label="Status baca">{[["SEMUA", "Semua"], ["BELUM_DIBACA", "Belum dibaca"], ["SUDAH_DIBACA", "Sudah dibaca"]].map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === value ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div></div></Panel>
    {filtered.length ? filtered.map((item) => <Link key={item.id} href={`/siswa/pengumuman/${item.id}`} className="block rounded-xl border border-slate-200 bg-white p-5 shadow-panel transition hover:border-blue-200"><div className="flex items-start justify-between gap-3"><div><span className="text-[11px] font-semibold uppercase tracking-wide text-primary">{item.type}</span><h2 className="mt-1 font-semibold text-navy">{item.title}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{item.body}</p></div>{item.reads.length ? <span className="text-xs text-slate-400">Dibaca</span> : <span className="size-2 shrink-0 rounded-full bg-primary" />}</div><p className="mt-3 text-xs text-slate-500">{item.publishedAt ? dateLong(item.publishedAt) : ""} · {item.attachments.length} lampiran</p></Link>) : <EmptyState title="Belum ada pengumuman" description="Pengumuman sesuai filter ini akan muncul di sini." />}
  </div>;
}

function NotificationsPage({ data }: { data: PortalData }) {
  const router = useRouter();
  const [filter, setFilter] = useState("SEMUA");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const notifications = data.notifications.filter((item) => filter === "SEMUA" || (filter === "BELUM_DIBACA" ? item.status === "MENUNGGU" : item.status !== "MENUNGGU"));
  async function mark(id?: string) {
    setError("");
    try {
      const result = await markNotificationsRead(id);
      if (result.ok) {
        setMessage(id ? "Notifikasi ditandai telah dibaca." : "Semua notifikasi ditandai telah dibaca.");
        router.refresh();
      }
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setError("Status notifikasi belum berhasil diperbarui.");
    }
  }
  return <div className="space-y-4">{error && <Notice kind="error">{error}</Notice>}<Panel><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{[["SEMUA", "Semua"], ["BELUM_DIBACA", "Belum dibaca"], ["SUDAH_DIBACA", "Sudah dibaca"]].map(([value, label]) => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${filter === value ? "bg-primary text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div><Button variant="secondary" size="sm" disabled={!data.unreadNotificationCount} onClick={() => void mark()}><Check aria-hidden="true" className="size-4" />Tandai semua dibaca</Button></div></Panel>
    {message && <Notice kind="success">{message}</Notice>}
    {notifications.length ? notifications.map((item) => <article key={item.id} className={`rounded-xl border p-4 ${item.status === "MENUNGGU" ? "border-blue-200 bg-white" : "border-slate-200 bg-slate-50"}`}><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-pale text-primary"><Bell aria-hidden="true" className="size-4" /></span><div className="min-w-0 flex-1"><h2 className="font-semibold text-navy">{item.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p><p className="mt-2 text-xs text-slate-400">{dateTime(item.createdAt)}</p></div>{item.status === "MENUNGGU" && <button className="text-xs font-semibold text-primary" onClick={() => void mark(item.id)}>Tandai dibaca</button>}</div></article>) : <EmptyState title="Tidak ada notifikasi" description="Informasi penting tentang pendaftaran akan tampil di halaman ini." />}
  </div>;
}

function ProfilePage({ data }: { data: PortalData }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(data.user.hasImage ? "/api/siswa/foto" : "");
  const [busy, setBusy] = useState(false);
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true);
    setError("");
    try {
      const result = await updateStudentProfile({ fullName: String(values.fullName ?? ""), phone: String(values.phone ?? ""), address: String(values.address ?? "") });
      if (!result.ok) setError(result.message);
      else {
        setMessage(result.message);
        router.refresh();
      }
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setError("Profil belum berhasil diperbarui. Periksa koneksi, lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = Object.fromEntries(new FormData(formElement).entries());
    setBusy(true);
    setError("");
    try {
      const result = await updateStudentPassword(String(values.currentPassword ?? ""), String(values.newPassword ?? ""));
      if (!result.ok) setError(result.message);
      else {
        setMessage(result.message);
        formElement.reset();
      }
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setError("Kata sandi belum berhasil diperbarui. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }
  async function uploadPhoto(file?: File) {
    if (!file) return;
    const form = new FormData();
    form.set("file", file);
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/siswa/foto", { method: "POST", body: form });
      const result = await response.json() as { pesan?: string; url?: string };
      setBusy(false);
      if (!response.ok) setError(result.pesan ?? "Foto profil gagal diperbarui.");
      else {
        setPhoto(result.url ?? "/api/siswa/foto");
        setMessage("Foto profil berhasil diperbarui.");
      }
    } catch (requestError) {
      setBusy(false);
      if (!(requestError instanceof TypeError || requestError instanceof SyntaxError)) throw requestError;
      setError("Foto profil belum dapat diperbarui. Periksa koneksi Anda dan coba lagi.");
    }
  }
  return <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">{message && <Notice kind="success">{message}</Notice>}{error && <Notice kind="error">{error}</Notice>}
    <Panel><div className="flex items-center gap-4"><div className="grid size-16 place-items-center overflow-hidden rounded-full bg-pale text-primary">{photo ? <Image src={photo} alt="Foto profil" width={64} height={64} unoptimized className="size-full object-cover" onError={() => setPhoto("")} /> : <UserRound aria-hidden="true" className="size-7" />}</div><div><h2 className="font-semibold text-navy">Foto profil</h2><p className="mt-1 text-xs text-slate-500">JPG atau PNG · Maksimal 2 MB</p></div></div><label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Upload aria-hidden="true" className="size-4" />Ganti foto<input type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" className="sr-only" onChange={(event) => void uploadPhoto(event.target.files?.[0])} /></label>{busy && <span className="ml-3 text-xs text-slate-500">Memproses...</span>}</Panel>
    <Panel><h2 className="font-semibold text-navy">Data diri</h2><form onSubmit={saveProfile} className="mt-4 grid gap-4"><Field label="Nama lengkap" name="fullName" defaultValue={data.student?.fullName ?? data.user.name} /><Field label="Email" name="email" type="email" defaultValue={data.user.email} required={false} readOnly /><Field label="Nomor telepon" name="phone" type="tel" defaultValue={data.student?.phone ?? ""} /><label className="text-sm font-medium text-slate-700">Alamat<textarea name="address" minLength={8} required defaultValue={data.student?.address ?? ""} className="mt-1.5 min-h-24 w-full rounded-lg border border-slate-300 p-3 text-sm" /></label><Button disabled={busy}>Simpan perubahan</Button></form></Panel>
    <Panel className="xl:col-span-2"><h2 className="flex items-center gap-2 font-semibold text-navy"><LockKeyhole aria-hidden="true" className="size-5 text-primary" />Ganti kata sandi</h2><form onSubmit={changePassword} className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Kata sandi saat ini" name="currentPassword" type="password" /><Field label="Kata sandi baru (minimal 12 karakter)" name="newPassword" type="password" /><div className="sm:col-span-2"><Button variant="secondary" disabled={busy}>Ganti kata sandi</Button></div></form></Panel>
  </div>;
}

function ExamPage({ exam }: { exam: ExamData }) {
  const [remaining, setRemaining] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { optionId?: string; isFlagged: boolean }>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (!exam) return;
    const remainingAtLoad = Math.max(0, new Date(exam.expiresAt).getTime() - new Date(exam.serverNow).getTime());
    const startedAt = performance.now();
    setRemaining(remainingAtLoad);
    setAnswers(Object.fromEntries(exam.answers.map((answer) => [answer.questionId, { optionId: answer.optionId ?? undefined, isFlagged: answer.isFlagged }])));
    setInitialized(true);
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, remainingAtLoad - (performance.now() - startedAt)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [exam]);
  useEffect(() => {
    if (exam && initialized && remaining === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submitTest(exam.id).then((result) => {
        setSubmitted(result.ok);
        setMessage(result.message ?? "");
      }).catch((actionError: unknown) => {
        if (!(actionError instanceof Error)) throw actionError;
        setMessage("Ujian belum berhasil dikirim. Hubungi panitia sebelum waktu berakhir.");
      });
    }
  }, [exam, initialized, remaining]);
  if (!exam) return <Panel><EmptyState title="Belum ada ujian aktif" description="Ruang ujian hanya dapat dibuka saat sesi terjadwal berlangsung dan akun Anda memenuhi syarat." /><div className="mt-4 text-center"><Link href="/siswa/hasil" className="text-sm font-semibold text-primary">Lihat jadwal dan kartu peserta</Link></div></Panel>;
  if (!exam.questions.length) return <Panel><EmptyState title="Soal belum tersedia" description="Hubungi panitia jika sesi ujian sudah dimulai tetapi soal belum tersedia." /></Panel>;
  const activeExam = exam;
  const question = activeExam.questions[current];
  const currentAnswer = answers[question.id] ?? { isFlagged: false };
  const answeredCount = Object.values(answers).filter((answer) => answer.optionId).length;
  const time = Math.floor(remaining / 1000);
  const remainingLabel = `${String(Math.floor(time / 3600)).padStart(2, "0")}:${String(Math.floor((time % 3600) / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;
  async function save(questionId: string, optionId: string | undefined, isFlagged: boolean) {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [questionId]: { optionId, isFlagged } }));
    setSaving(true);
    try {
      const result = await saveTestAnswer({ participantId: activeExam.id, questionId, optionId, flagged: isFlagged });
      if (!result.ok) setMessage(result.message ?? "Jawaban belum tersimpan.");
      else setMessage("Jawaban tersimpan otomatis.");
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setMessage("Jawaban belum tersimpan. Periksa koneksi dan coba lagi.");
    } finally {
      setSaving(false);
    }
  }
  async function finish() {
    if (!window.confirm("Akhiri ujian dan kirim jawaban sekarang? Jawaban tidak dapat diubah setelah dikirim.")) return;
    try {
      const result = await submitTest(activeExam.id);
      setSubmitted(result.ok);
      setMessage(result.message ?? "Ujian tidak dapat diselesaikan.");
    } catch (actionError) {
      if (!(actionError instanceof Error)) throw actionError;
      setMessage("Ujian belum berhasil dikirim. Periksa koneksi dan coba lagi.");
    }
  }
  return <div className="space-y-4"><Notice><span className="inline-flex items-center gap-2"><ShieldCheck aria-hidden="true" className="size-4" />Jawaban tersimpan otomatis. Jangan tutup halaman sebelum menekan tombol selesai.</span></Notice>
    <Panel><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-lg font-semibold text-navy">{activeExam.title}</h2><p className="mt-1 text-sm text-slate-500">{answeredCount} dari {activeExam.questions.length} soal terjawab</p></div><div className={`rounded-xl px-4 py-2 font-mono text-lg font-bold ${time < 300 ? "bg-red-50 text-red-700" : "bg-pale text-primary"}`} aria-live="polite"><Clock3 aria-hidden="true" className="mr-2 inline size-5" />{remainingLabel}</div></div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[16rem_1fr]"><aside className="rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-semibold text-navy">Nomor soal</h3><div className="mt-3 grid grid-cols-5 gap-2">{activeExam.questions.map((item, index) => { const answer = answers[item.id]; return <button key={item.id} disabled={submitted} onClick={() => setCurrent(index)} aria-label={`Soal ${index + 1}${answer?.optionId ? ", terjawab" : ", belum dijawab"}${answer?.isFlagged ? ", ragu-ragu" : ""}`} className={`relative grid size-10 place-items-center rounded-lg border text-sm font-semibold ${index === current ? "border-primary bg-primary text-white" : answer?.optionId ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-white text-slate-600"}`}>{index + 1}{answer?.isFlagged && <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-amber-500" />}</button>; })}</div><div className="mt-4 space-y-2 text-xs text-slate-600"><p><span className="mr-2 inline-block size-2 rounded-full bg-green-500" />Terjawab</p><p><span className="mr-2 inline-block size-2 rounded-full bg-amber-500" />Ragu-ragu</p><p><span className="mr-2 inline-block size-2 rounded-full bg-slate-400" />Belum dijawab</p></div></aside>
        <div className="rounded-xl border border-slate-200 p-4 sm:p-6"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Soal {current + 1} dari {activeExam.questions.length}</p><h3 className="mt-3 text-base font-semibold leading-7 text-navy">{question.prompt}</h3><div className="mt-5 space-y-3">{question.options.map((option) => <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${currentAnswer.optionId === option.id ? "border-primary bg-pale" : "border-slate-200 hover:bg-slate-50"} ${submitted ? "cursor-not-allowed opacity-70" : ""}`}><input type="radio" name={question.id} disabled={submitted || remaining === 0} checked={currentAnswer.optionId === option.id} onChange={() => void save(question.id, option.id, currentAnswer.isFlagged)} className="mt-1 accent-blue-600" /><span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">{option.label}</span><span className="text-sm leading-6 text-slate-700">{option.content}</span></label>)}</div>
          <div className="mt-5 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-4"><Button variant="secondary" disabled={current === 0 || submitted} onClick={() => setCurrent((index) => index - 1)}><ArrowLeft aria-hidden="true" className="size-4" />Sebelumnya</Button><div className="flex gap-2"><Button variant="secondary" disabled={submitted || remaining === 0} onClick={() => void save(question.id, currentAnswer.optionId, !currentAnswer.isFlagged)}>{currentAnswer.isFlagged ? "Hapus tanda ragu" : "Tandai ragu"}</Button><Button disabled={current === activeExam.questions.length - 1 || submitted} onClick={() => setCurrent((index) => index + 1)}>Berikutnya<ArrowRight aria-hidden="true" className="size-4" /></Button></div></div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p aria-live="polite" className="text-xs text-slate-500">{saving ? "Menyimpan jawaban..." : message}</p><Button variant="danger" disabled={submitted || remaining === 0} onClick={() => void finish()}><Check aria-hidden="true" className="size-4" />{submitted ? "Jawaban terkirim" : "Selesai dan kirim jawaban"}</Button></div>
    </Panel>
  </div>;
}

export function StudentPortalPage({ page, detailId, data, exam }: PageProps) {
  const labels: Record<string, [string, string]> = {
    pendaftaran: ["Formulir pendaftaran", "Lengkapi lima bagian formulir SPMB 2027/2028."],
    dokumen: ["Unggah berkas", "Unggah dokumen persyaratan untuk diverifikasi panitia."],
    pembayaran: ["Pembayaran", "Lihat tagihan, pilih metode pembayaran, dan pantau status transaksi."],
    hasil: ["Hasil ujian & seleksi", "Jadwal TKA dan hasil resmi seleksi pendaftaran Anda."],
    ujian: ["Ujian TKA", "Ruang ujian daring calon murid."],
    pengumuman: [detailId ? "Detail pengumuman" : "Pengumuman", "Informasi resmi SPMB SMPN 9 Depok."],
    notifikasi: ["Notifikasi", "Pemberitahuan penting terkait pendaftaran Anda."],
    profil: ["Profil", "Perbarui informasi akun dan data diri Anda."],
  };
  const [title, description] = labels[page] ?? ["Portal siswa", ""];
  return <div className="space-y-5"><PageHeader title={title} description={description} />
    {page === "pendaftaran" && <RegistrationForm data={data} />}
    {page === "dokumen" && <DocumentsPage data={data} />}
    {page === "pembayaran" && <PaymentPage data={data} />}
    {page === "hasil" && <ResultsPage data={data} />}
    {page === "ujian" && <ExamPage exam={exam} />}
    {page === "pengumuman" && <AnnouncementsPage data={data} detailId={detailId} />}
    {page === "notifikasi" && <NotificationsPage data={data} />}
    {page === "profil" && <ProfilePage data={data} />}
  </div>;
}
