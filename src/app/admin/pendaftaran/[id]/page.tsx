import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/prisma";

const panelClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6";
const statusLabels: Record<string, string> = {
  DRAF: "Draf",
  MENUNGGU_VERIFIKASI: "Menunggu verifikasi",
  PERLU_PERBAIKAN: "Perlu perbaikan",
  TERVERIFIKASI: "Terverifikasi",
  MENGIKUTI_SELEKSI: "Mengikuti seleksi",
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
  CADANGAN: "Cadangan",
};

function formatDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(date) : "—";
}

export default async function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const registration = await prisma.registration.findUnique({
    where: { id },
    include: {
      student: {
        include: {
          user: { select: { email: true } },
          guardians: { orderBy: { isPrimary: "desc" } },
          schoolOrigin: true,
          reportGrades: { orderBy: [{ semester: "asc" }, { subject: "asc" }] },
        },
      },
      track: true,
      academicPeriod: true,
      documents: { include: { reviews: { orderBy: { reviewedAt: "desc" }, take: 1 } }, orderBy: { uploadedAt: "desc" } },
      invoices: { include: { payments: { orderBy: { createdAt: "desc" } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!registration) notFound();

  const student = registration.student;
  return (
    <>
      <Breadcrumb items={[
        { label: "Dashboard", href: "/admin" },
        { label: "Pendaftaran Siswa", href: "/admin/pendaftaran" },
        { label: registration.registrationNo },
      ]} />
      <PageHeader title={`Detail ${registration.registrationNo}`} description={`${student.fullName} · ${registration.track.name} · ${registration.academicPeriod.name}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Data calon murid</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Nama</dt><dd className="mt-1 font-medium text-slate-800">{student.fullName}</dd></div>
            <div><dt className="text-slate-500">Status pendaftaran</dt><dd className="mt-1"><StatusBadge status={statusLabels[registration.status] ?? registration.status} /></dd></div>
            <div><dt className="text-slate-500">NISN</dt><dd className="mt-1 text-slate-800">{student.nisn ?? "—"}</dd></div>
            <div><dt className="text-slate-500">NIK</dt><dd className="mt-1 text-slate-800">{student.nationalId ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Email</dt><dd className="mt-1 text-slate-800">{student.user?.email ?? "Belum memiliki akun"}</dd></div>
            <div><dt className="text-slate-500">Telepon</dt><dd className="mt-1 text-slate-800">{student.phone ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Tempat, tanggal lahir</dt><dd className="mt-1 text-slate-800">{student.birthPlace ?? "—"}, {formatDate(student.birthDate)}</dd></div>
            <div><dt className="text-slate-500">Jenis kelamin</dt><dd className="mt-1 text-slate-800">{student.gender ?? "—"}</dd></div>
            <div className="sm:col-span-2"><dt className="text-slate-500">Alamat</dt><dd className="mt-1 text-slate-800">{student.address ?? "—"}</dd></div>
            <div><dt className="text-slate-500">Tanggal daftar</dt><dd className="mt-1 text-slate-800">{formatDate(registration.createdAt)}</dd></div>
            <div><dt className="text-slate-500">Tanggal pengajuan</dt><dd className="mt-1 text-slate-800">{formatDate(registration.submittedAt)}</dd></div>
          </dl>
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Asal sekolah dan wali</h2>
          {student.schoolOrigin ? (
            <div className="mb-5 text-sm">
              <p className="font-medium text-slate-800">{student.schoolOrigin.name}</p>
              <p className="mt-1 text-slate-600">{student.schoolOrigin.address ?? "Alamat belum diisi"} · {student.schoolOrigin.city ?? "Kota belum diisi"}</p>
              <p className="mt-1 text-slate-600">NPSN {student.schoolOrigin.npsn ?? "—"} · Lulus {student.schoolOrigin.graduationYear ?? "—"}</p>
            </div>
          ) : <p className="mb-5 text-sm text-slate-500">Data asal sekolah belum tersedia.</p>}
          {student.guardians.length ? <ul className="space-y-3">{student.guardians.map((guardian) => (
            <li key={guardian.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-800">{guardian.name} · {guardian.relationship}</p>
              <p className="mt-1 text-slate-600">{guardian.phone ?? "—"} · {guardian.email ?? "Email tidak tersedia"}</p>
              <p className="mt-1 text-slate-500">{guardian.occupation ?? "Pekerjaan belum diisi"}</p>
            </li>
          ))}</ul> : <p className="text-sm text-slate-500">Data wali belum tersedia.</p>}
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Berkas persyaratan</h2>
          {registration.documents.length ? <ul className="divide-y divide-slate-100">{registration.documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
              <div><p className="font-medium text-slate-800">{document.type.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{document.fileName} · {document.reviews[0] ? statusLabels[document.reviews[0].status] ?? document.reviews[0].status.replaceAll("_", " ") : "Belum ditinjau"}</p></div>
              <Link href={`/api/dokumen/${document.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Buka berkas</Link>
            </li>
          ))}</ul> : <p className="text-sm text-slate-500">Belum ada berkas yang diunggah.</p>}
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Pembayaran dan nilai rapor</h2>
          {registration.invoices.length ? <ul className="mb-5 space-y-3">{registration.invoices.map((invoice) => (
            <li key={invoice.id} className="rounded-lg border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium text-slate-800">{invoice.invoiceNo}</span><StatusBadge status={invoice.status.replaceAll("_", " ")} /></div>
              <p className="mt-1 text-slate-600">{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(invoice.amount))} · {invoice.payments.length} transaksi</p>
            </li>
          ))}</ul> : <p className="mb-5 text-sm text-slate-500">Belum ada tagihan.</p>}
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Nilai rapor</h3>
          {student.reportGrades.length ? (
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Mata pelajaran</th><th className="py-2">Semester</th><th className="py-2">Nilai</th></tr></thead><tbody className="divide-y divide-slate-100">{student.reportGrades.map((grade) => <tr key={grade.id}><td className="py-2">{grade.subject}</td><td className="py-2">{grade.semester}</td><td className="py-2">{Number(grade.score).toLocaleString("id-ID")}</td></tr>)}</tbody></table></div>
          ) : <p className="text-sm text-slate-500">Nilai rapor belum tersedia.</p>}
        </section>
      </div>
    </>
  );
}
