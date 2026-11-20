import Link from "next/link";
import { ArrowRight, BellRing, BookOpenCheck, CalendarDays, ClipboardCheck, FileText, Megaphone, TriangleAlert } from "lucide-react";
import { Role } from "@prisma/client";
import { requireRole } from "@/lib/auth/authorization";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { getStudentPortalData } from "@/server/services/student-portal";
import { prisma } from "@/lib/db/prisma";

const requiredDocuments = ["KARTU_KELUARGA", "AKTA_KELAHIRAN", "RAPOR", "PAS_FOTO", "IJAZAH"] as const;
const stages = ["Formulir", "Berkas", "Pembayaran", "Verifikasi", "Tes TKA", "Hasil"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

export default async function SiswaDashboardPage() {
  const user = await requireRole([Role.SISWA]);
  const data = await getStudentPortalData(user.id);
  const { registration, student, period } = data;
  const documents = registration?.documents ?? [];
  const hasDocuments = (type: string) => documents.some((document) =>
    document.type === type && document.reviews[0]?.status === "DITERIMA",
  );
  const completeForm = Boolean(registration?.submittedAt);
  const documentsComplete = Boolean(completeForm && requiredDocuments.every(hasDocuments) &&
    (registration?.track.type !== "PRESTASI" || hasDocuments("BUKTI_PRESTASI")));
  const invoicePaid = Boolean(registration?.invoices.length && registration.invoices.every((invoice) => invoice.status === "LUNAS"));
  const verified = ["TERVERIFIKASI", "MENGIKUTI_SELEKSI", "DITERIMA", "DITOLAK", "CADANGAN"].includes(registration?.status ?? "");
  const examComplete = Boolean(registration?.testParticipants.some((participant) => participant.submittedAt));
  const publishedResult = Boolean(registration?.selectionResults.length);
  const complete = [completeForm, documentsComplete, invoicePaid, verified, examComplete, publishedResult];
  const activeStage = Math.max(0, complete.findIndex((value) => !value));
  const draftSavedCount = data.draft?.savedSections.length ?? (completeForm ? 5 : 0);
  const progress = Math.round(((draftSavedCount + documents.filter((document) => document.reviews[0]?.status === "DITERIMA").length) / 11) * 100);
  const schedule = period ? await prisma.testSession.findFirst({
    where: { academicPeriodId: period.id, status: { in: ["TERJADWAL", "BERLANGSUNG"] }, endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  }) : null;
  const gradesAverage = student?.reportGrades.length
    ? student.reportGrades.reduce((sum, grade) => sum + Number(grade.score), 0) / student.reportGrades.length
    : null;
  const alerts = [
    !student?.reportGrades.length && "Lengkapi nilai rapor kelas 4–6 pada formulir pendaftaran.",
    registration?.invoices.some((invoice) => invoice.status !== "LUNAS") && "Ada tagihan pendaftaran yang belum lunas.",
    completeForm && !documentsComplete && "Masih ada dokumen persyaratan yang belum diunggah.",
  ].filter(Boolean) as string[];

  return (
    <>
      <PageHeader title={`Selamat datang, ${student?.fullName ?? user.name ?? "Calon murid"}!`} description="Pantau perkembangan pendaftaran SPMB SMPN 9 Depok di sini." actions={<Link href="/siswa/pendaftaran"><Button variant="secondary">Lanjutkan pendaftaran<ArrowRight aria-hidden="true" className="size-4" /></Button></Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Nomor pendaftaran" value={registration?.registrationNo ?? "Belum terbit"} detail={`Periode ${period?.name ?? "belum dibuka"}`} icon={ClipboardCheck} />
        <StatCard label="Jalur pilihan" value={registration?.track.name ?? "Belum dipilih"} detail={registration?.track.description ?? "Pilih jalur pada formulir pendaftaran"} icon={FileText} />
        <StatCard label="Nilai rata-rata rapor" value={gradesAverage === null ? "—" : gradesAverage.toFixed(2)} detail={`${student?.reportGrades.length ?? 0} nilai tersimpan`} icon={BookOpenCheck} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="text-base font-semibold text-navy">Tahapan pendaftaran</h2><p className="mt-1 text-sm text-slate-500">Status terbaru proses penerimaan Anda</p></div>
            <span className="rounded-full bg-pale px-3 py-1 text-xs font-semibold text-primary">{registration?.status.replaceAll("_", " ") ?? "Draf"}</span>
          </div>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map((label, index) => <li key={label} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${complete[index] ? "bg-green-100 text-green-700" : activeStage === index ? "bg-pale text-primary ring-4 ring-blue-50" : "bg-slate-100 text-slate-400"}`}>{complete[index] ? "✓" : index + 1}</span>
              <span><span className="block text-sm font-medium text-slate-800">{label}</span><span className="text-xs text-slate-500">{complete[index] ? "Selesai" : activeStage === index ? "Perlu ditindaklanjuti" : "Belum dimulai"}</span></span>
            </li>)}
          </ol>
        </section>
        <section className="rounded-xl border border-blue-100 bg-pale p-5 sm:p-6">
          <span className="grid size-10 place-items-center rounded-lg bg-white text-primary"><ClipboardCheck aria-hidden="true" className="size-5" /></span>
          <h2 className="mt-4 text-base font-semibold text-navy">Lanjutkan pendaftaran</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{completeForm ? "Periksa kembali dokumen dan tahapan berikutnya." : "Simpan data secara bertahap, lalu kirim formulir setelah lengkap."}</p>
          <div className="mt-4"><div className="flex justify-between text-xs text-slate-600"><span>Kelengkapan</span><span>{completeForm ? `${documentsComplete ? 100 : Math.min(95, 45 + documents.length * 10)}%` : `${Math.min(progress, 100)}%`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completeForm ? documentsComplete ? 100 : Math.min(95, 45 + documents.length * 10) : Math.min(progress, 100)}%` }} /></div></div>
          <Link href="/siswa/pendaftaran" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Buka formulir<ArrowRight aria-hidden="true" className="size-4" /></Link>
        </section>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="flex items-center gap-2 font-semibold text-navy"><TriangleAlert aria-hidden="true" className="size-5 text-amber-500" />Perlu perhatian</h2>
          {alerts.length ? <ul className="mt-3 space-y-3">{alerts.map((alert) => <li key={alert} className="text-sm leading-5 text-slate-600">{alert}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Tidak ada peringatan untuk saat ini.</p>}
          {registration?.invoices[0] && <Link className="mt-4 inline-block text-sm font-semibold text-primary" href="/siswa/pembayaran">{formatCurrency(Number(registration.invoices[0].amount))} · Lihat pembayaran</Link>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="flex items-center gap-2 font-semibold text-navy"><CalendarDays aria-hidden="true" className="size-5 text-primary" />Jadwal TKA</h2>
          {schedule ? <><p className="mt-3 text-sm font-medium text-slate-800">{schedule.title}</p><p className="mt-1 text-sm text-slate-500">{new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(schedule.startsAt)} WIB</p>{registration?.testParticipants.length ? <Link href="/siswa/ujian" className="mt-4 inline-block text-sm font-semibold text-primary">Masuk ruang ujian</Link> : <p className="mt-3 text-xs text-slate-500">Kartu peserta tersedia setelah Anda memenuhi syarat seleksi.</p>}</> : <p className="mt-3 text-sm text-slate-500">Jadwal TKA belum diumumkan.</p>}
        </section>
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-panel">
          <h2 className="flex items-center gap-2 font-semibold text-navy"><Megaphone aria-hidden="true" className="size-5 text-primary" />Pengumuman terbaru</h2>
          {data.announcements.slice(0, 2).map((announcement) => <Link key={announcement.id} href={`/siswa/pengumuman/${announcement.id}`} className="mt-3 block border-t border-slate-100 pt-3 first:border-0 first:pt-0"><span className="text-sm font-medium text-slate-800">{announcement.title}</span><span className="mt-1 block text-xs text-slate-500">{announcement.publishedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(announcement.publishedAt) : ""}</span></Link>)}
          {!data.announcements.length && <p className="mt-3 text-sm text-slate-500">Belum ada pengumuman.</p>}
          <Link href="/siswa/pengumuman" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary">Semua pengumuman<ArrowRight aria-hidden="true" className="size-4" /></Link>
        </section>
      </div>
      {publishedResult && <section className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"><BellRing aria-hidden="true" className="mr-2 inline size-4" />Hasil seleksi Anda telah diterbitkan. <Link className="font-semibold underline" href="/siswa/hasil">Lihat hasil</Link></section>}
    </>
  );
}
