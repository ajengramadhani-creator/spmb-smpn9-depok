import Link from "next/link";
import { RegistrationStatus, ReviewStatus, Role, type Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  AnnouncementForm,
  DocumentReviewForm,
  ManualRegistrationForm,
  PaymentConfirmationForm,
  PaymentSettingsForm,
} from "@/components/admin/admin-tools";
import {
  PublishSelectionForm,
  QuestionCategoryForm,
  QuestionForm,
  QuestionImportForm,
  SelectionDraftForm,
  SessionTools,
  TestPackageForm,
  TestSessionForm,
} from "@/components/admin/assessment-tools";
import { AnalyticsCharts } from "@/components/admin/analytics-charts";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/authorization";
import { getRegistrationEligibility } from "@/server/services/assessment";
import { getAdminAnalyticsData } from "@/server/services/analytics";

const pageTitles: Record<string, string> = {
  pendaftaran: "Pendaftaran Siswa",
  verifikasi: "Verifikasi Berkas",
  "bank-soal": "Bank Soal TKA",
  tes: "Manajemen Tes",
  kelayakan: "Kelayakan TKA",
  seleksi: "Seleksi Siswa",
  pengumuman: "Pengumuman",
  laporan: "Laporan & Analitik",
  pembayaran: "Pembayaran",
};

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
  TERJADWAL: "Terjadwal",
  BERLANGSUNG: "Berlangsung",
  SELESAI: "Selesai",
  BELUM_DIBAYAR: "Belum dibayar",
  MENUNGGU: "Menunggu",
  LUNAS: "Lunas",
  KADALUWARSA: "Kedaluwarsa",
  DIBATALKAN: "Dibatalkan",
};

function formatStatus(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(date)
    : "—";
}

function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
}

function safeEvidenceKey(rawResponse: unknown) {
  if (!rawResponse || typeof rawResponse !== "object" || Array.isArray(rawResponse)) return false;
  return "evidenceKey" in rawResponse && typeof rawResponse.evidenceKey === "string" && rawResponse.evidenceKey.length > 0;
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }>;
  searchParams: SearchParams;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const title = pageTitles[slug.join("/")];
  if (!title) notFound();
  await requireRole([Role.ADMIN]);

  let content;
  if (slug[0] === "pendaftaran") {
    const activePeriod = await prisma.academicPeriod.findFirst({
      where: { isActive: true },
      orderBy: { startsAt: "desc" },
      select: { id: true },
    });
    const rawSearch = query.q;
    const search = typeof rawSearch === "string" ? rawSearch.trim().slice(0, 100) : "";
    const rawStatus = typeof query.status === "string" ? query.status : "";
    const selectedStatus = Object.values(RegistrationStatus).includes(rawStatus as RegistrationStatus)
      ? rawStatus as RegistrationStatus
      : "";
    const rawTrack = typeof query.track === "string" ? query.track : "";
    const requestedPage = Number(typeof query.page === "string" ? query.page : 1);
    const pageSize = 25;
    const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const where: Prisma.RegistrationWhereInput = {
      ...(activePeriod ? { academicPeriodId: activePeriod.id } : {}),
      ...(selectedStatus ? { status: selectedStatus } : {}),
      ...(rawTrack ? { trackId: rawTrack } : {}),
      ...(search ? {
        OR: [
          { registrationNo: { contains: search, mode: "insensitive" } },
          { student: { fullName: { contains: search, mode: "insensitive" } } },
          { student: { nisn: { contains: search } } },
          { student: { nationalId: { contains: search } } },
        ],
      } : {}),
    };
    const tracks = activePeriod
      ? await prisma.track.findMany({ where: { academicPeriodId: activePeriod.id }, orderBy: { name: "asc" }, select: { id: true, name: true } })
      : [];
    const total = await prisma.registration.count({ where });
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pageCount);
    const registrations = await prisma.registration.findMany({
      where,
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        registrationNo: true,
        status: true,
        createdAt: true,
        student: { select: { fullName: true, nisn: true, nationalId: true } },
        track: { select: { name: true } },
      },
    });
    const urlForPage = (nextPage: number) => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (selectedStatus) params.set("status", selectedStatus);
      if (rawTrack) params.set("track", rawTrack);
      params.set("page", String(nextPage));
      return `/admin/pendaftaran?${params.toString()}`;
    };

    content = (
      <div className="space-y-6">
        <section className={panelClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-navy">Daftar pendaftar</h2>
              <p className="mt-1 text-sm text-slate-500">{total.toLocaleString("id-ID")} data · 25 baris per halaman</p>
            </div>
            <Link href="/admin/pendaftaran/ekspor" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Unduh Excel</Link>
          </div>
          <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
            <Input name="q" defaultValue={search} placeholder="Cari nama, NISN, NIK, atau nomor daftar" aria-label="Cari pendaftar" />
            <Select name="status" defaultValue={selectedStatus} aria-label="Filter status">
              <option value="">Semua status</option>
              {Object.values(RegistrationStatus).map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
            </Select>
            <Select name="track" defaultValue={rawTrack} aria-label="Filter jalur">
              <option value="">Semua jalur</option>
              {tracks.map((track) => <option key={track.id} value={track.id}>{track.name}</option>)}
            </Select>
            <Button type="submit">Terapkan</Button>
          </form>
          {!registrations.length ? (
            <EmptyState title="Pendaftar belum ditemukan" description="Ubah kata pencarian atau filter, atau tambahkan pendaftar secara manual." />
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[780px] border-collapse text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr>
                    <th className="px-4 py-3">Nomor pendaftaran</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">NISN</th><th className="px-4 py-3">Jalur</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3">Detail</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">{registrations.map((registration) => (
                    <tr key={registration.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{registration.registrationNo}</td>
                      <td className="px-4 py-3 text-slate-700">{registration.student.fullName}</td>
                      <td className="px-4 py-3 text-slate-700">{registration.student.nisn ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-700">{registration.track.name}</td>
                      <td className="px-4 py-3"><StatusBadge status={formatStatus(registration.status)} /></td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(registration.createdAt)}</td>
                      <td className="px-4 py-3"><Link className="font-medium text-primary hover:underline" href={`/admin/pendaftaran/${registration.id}`}>Lihat</Link></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-500">Halaman {currentPage} dari {pageCount}</span>
                <div className="flex gap-2">
                  <Link href={urlForPage(Math.max(1, currentPage - 1))} aria-disabled={currentPage <= 1} className={`rounded-lg border px-3 py-2 ${currentPage <= 1 ? "pointer-events-none text-slate-400" : "hover:bg-slate-50"}`}>Sebelumnya</Link>
                  <Link href={urlForPage(Math.min(pageCount, currentPage + 1))} aria-disabled={currentPage >= pageCount} className={`rounded-lg border px-3 py-2 ${currentPage >= pageCount ? "pointer-events-none text-slate-400" : "hover:bg-slate-50"}`}>Berikutnya</Link>
                </div>
              </div>
            </>
          )}
        </section>
        <details className={panelClass}>
          <summary className="cursor-pointer font-semibold text-navy">Tambah pendaftaran manual</summary>
          <p className="my-4 text-sm text-slate-500">Pendaftaran manual dibuat sebagai draf dan belum memiliki akun siswa.</p>
          {tracks.length ? <ManualRegistrationForm tracks={tracks} /> : <EmptyState title="Belum ada jalur aktif" description="Atur jalur pada periode aktif sebelum menambahkan pendaftar." />}
        </details>
      </div>
    );
  } else if (slug[0] === "verifikasi") {
    const period = await prisma.academicPeriod.findFirst({ where: { isActive: true }, orderBy: { startsAt: "desc" }, select: { id: true } });
    const documents = period ? await prisma.document.findMany({
      where: { registration: { academicPeriodId: period.id } },
      take: 200,
      orderBy: { uploadedAt: "asc" },
      include: {
        registration: { select: { id: true, registrationNo: true, student: { select: { fullName: true } }, track: { select: { name: true } } } },
        reviews: { orderBy: { reviewedAt: "desc" }, take: 1, select: { status: true, note: true, reviewedAt: true } },
      },
    }) : [];
    const pending = documents.filter((document) => document.reviews[0]?.status !== ReviewStatus.DITERIMA);
    content = pending.length ? (
      <div className="space-y-4">
        {pending.map((document) => (
          <article key={document.id} className={panelClass}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-semibold text-navy">{document.type.replaceAll("_", " ")}</h2>
                <p className="mt-1 text-sm text-slate-600">{document.registration.student.fullName} · {document.registration.registrationNo} · {document.registration.track.name}</p>
                <p className="mt-1 text-xs text-slate-500">{document.fileName} · {Math.ceil(document.sizeBytes / 1024)} KB · Diunggah {formatDate(document.uploadedAt)}</p>
                {document.reviews[0] && <p className="mt-2 text-sm text-amber-700">Status sebelumnya: {formatStatus(document.reviews[0].status)}{document.reviews[0].note ? ` — ${document.reviews[0].note}` : ""}</p>}
              </div>
              <Link href={`/api/dokumen/${document.id}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline">Buka berkas</Link>
            </div>
            <DocumentReviewForm documentId={document.id} />
          </article>
        ))}
      </div>
    ) : <EmptyState title="Tidak ada berkas yang menunggu" description="Berkas yang perlu ditinjau akan muncul di sini." />;
  } else if (slug[0] === "pembayaran") {
    const period = await prisma.academicPeriod.findFirst({
      where: { isActive: true },
      orderBy: { startsAt: "desc" },
      include: { paymentSetting: true },
    });
    const [payments, bankAccount] = await Promise.all([
      period ? prisma.payment.findMany({
        where: { invoice: { registration: { academicPeriodId: period.id } } },
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          invoice: { select: { invoiceNo: true, amount: true, status: true, registration: { select: { registrationNo: true, student: { select: { fullName: true } } } } } },
        },
      }) : Promise.resolve([]),
      prisma.bankAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } }),
    ]);
    content = (
      <div className="space-y-6">
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Pengaturan biaya dan rekening</h2>
          {period ? (
            <PaymentSettingsForm amount={Number(period.paymentSetting?.amount ?? 0)} isEnabled={period.paymentSetting?.isEnabled ?? false} account={bankAccount ?? undefined} />
          ) : <EmptyState title="Periode aktif belum tersedia" description="Pengaturan pembayaran memerlukan periode penerimaan aktif." />}
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Transaksi pembayaran</h2>
          {payments.length ? (
            <div className="space-y-4">
              {payments.map((payment) => (
                <article key={payment.id} className="grid gap-3 rounded-lg border border-slate-200 p-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{payment.invoice.invoiceNo}</h3>
                      <StatusBadge status={formatStatus(payment.status)} />
                      <StatusBadge status={formatStatus(payment.invoice.status)} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{payment.invoice.registration.student.fullName} · {payment.invoice.registration.registrationNo}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatRupiah(Number(payment.amount))} · {payment.provider} · {formatDate(payment.createdAt)}</p>
                    {payment.provider === "MANUAL_TRANSFER" && safeEvidenceKey(payment.rawResponse) && <Link className="mt-2 inline-block text-sm font-medium text-primary hover:underline" href={`/api/admin/pembayaran/${payment.id}/bukti`} target="_blank" rel="noreferrer">Lihat bukti transfer</Link>}
                  </div>
                  {payment.provider === "MANUAL_TRANSFER" && payment.status === "MENUNGGU" && <PaymentConfirmationForm paymentId={payment.id} />}
                </article>
              ))}
            </div>
          ) : <EmptyState title="Belum ada transaksi" description="Transaksi siswa pada periode aktif akan ditampilkan di sini." />}
        </section>
      </div>
    );
  } else if (slug[0] === "pengumuman") {
    const [periods, announcements] = await Promise.all([
      prisma.academicPeriod.findMany({ orderBy: { startsAt: "desc" }, select: { id: true, name: true } }),
      prisma.announcement.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { academicPeriod: { select: { name: true } } } }),
    ]);
    content = (
      <div className="space-y-6">
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Buat pengumuman</h2>
          <AnnouncementForm periods={periods} />
        </section>
        <section className={`${panelClass} space-y-3`}>
          <h2 className="font-semibold text-navy">Pengumuman tersimpan</h2>
          {announcements.length ? announcements.map((announcement) => {
            const state = !announcement.publishedAt ? "Draf" : announcement.publishedAt > new Date() ? "Terjadwal" : "Terbit";
            return (
              <details key={announcement.id} className="rounded-lg border border-slate-200 p-4">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">{announcement.title}</span>
                  <span className="text-xs text-slate-500">{state} · {announcement.academicPeriod?.name ?? "Semua periode"} · {formatDate(announcement.publishedAt)}</span>
                </summary>
                <div className="mt-4 border-t border-slate-100 pt-4"><AnnouncementForm periods={periods} initial={announcement} /></div>
              </details>
            );
          }) : <EmptyState title="Belum ada pengumuman" description="Buat pengumuman pertama untuk pendaftar." />}
        </section>
      </div>
    );
  } else if (slug[0] === "bank-soal") {
    const [categories, questions] = await Promise.all([
      prisma.questionCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.question.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: { category: { select: { name: true } }, options: { orderBy: { label: "asc" }, select: { label: true, content: true, isCorrect: true } } },
      }),
    ]);
    content = (
      <div className="space-y-6">
        <section className={panelClass}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="font-semibold text-navy">Impor soal dari Excel</h2><p className="mt-1 text-sm text-slate-500">Format .xlsx: kategori, pertanyaan, pilihan A–D, kunci, dan bobot nilai. Maksimal 1.000 baris.</p></div>
            <Link href="/api/admin/bank-soal/templat" className="text-sm font-semibold text-primary hover:underline">Unduh templat Excel</Link>
          </div>
          <QuestionImportForm />
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Kategori</h2>
          <div className="mb-4 flex flex-wrap gap-2">{categories.map((category) => <span key={category.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">{category.name}</span>)}</div>
          <QuestionCategoryForm />
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Tambah soal</h2>
          {categories.length ? <QuestionForm categories={categories} /> : <EmptyState title="Buat kategori terlebih dahulu" description="Soal harus dimasukkan ke dalam kategori." />}
        </section>
        <section className={`${panelClass} space-y-3`}>
          <h2 className="font-semibold text-navy">Daftar soal ({questions.length})</h2>
          {questions.length ? questions.map((question) => (
            <details key={question.id} className="rounded-lg border border-slate-200 p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-slate-800">{question.prompt}</span>
                <span className="text-xs text-slate-500">{question.category.name} · {Number(question.points)} poin · {question.isActive ? "Aktif" : "Nonaktif"}</span>
              </summary>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <QuestionForm categories={categories} initial={{ id: question.id, categoryId: question.categoryId, prompt: question.prompt, points: Number(question.points), isActive: question.isActive, options: question.options }} />
              </div>
            </details>
          )) : <EmptyState title="Belum ada soal" description="Buat soal pilihan ganda atau impor dari berkas Excel." />}
        </section>
      </div>
    );
  } else if (slug[0] === "tes") {
    const period = await prisma.academicPeriod.findFirst({ where: { isActive: true }, orderBy: { startsAt: "desc" }, select: { id: true, name: true } });
    const [questions, packages, sessions] = await Promise.all([
      prisma.question.findMany({ where: { isActive: true, type: "PILIHAN_GANDA" }, orderBy: { createdAt: "desc" }, take: 100, include: { category: { select: { name: true } } } }),
      prisma.testPackage.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, include: { questions: { select: { questionId: true } } } }),
      period ? prisma.testSession.findMany({
        where: { academicPeriodId: period.id },
        take: 30,
        orderBy: { startsAt: "desc" },
        include: {
          testPackage: { select: { name: true, durationMin: true } },
          _count: { select: { participants: true } },
        },
      }) : Promise.resolve([]),
    ]);
    const sessionIds = sessions.map((session) => session.id);
    const [startedParticipants, submittedParticipants] = sessionIds.length ? await Promise.all([
      prisma.testParticipant.groupBy({ by: ["sessionId"], where: { sessionId: { in: sessionIds }, startedAt: { not: null } }, _count: { _all: true } }),
      prisma.testParticipant.groupBy({ by: ["sessionId"], where: { sessionId: { in: sessionIds }, submittedAt: { not: null } }, _count: { _all: true } }),
    ]) : [[], []];
    const startedBySession = new Map(startedParticipants.map((item) => [item.sessionId, item._count._all]));
    const submittedBySession = new Map(submittedParticipants.map((item) => [item.sessionId, item._count._all]));
    const packagesForForm = packages.map((item) => ({ id: item.id, name: item.name, durationMin: item.durationMin }));
    const questionsForPackage = questions.map((question) => ({ id: question.id, prompt: question.prompt, category: question.category.name }));
    content = (
      <div className="space-y-6">
        <section className={panelClass}><h2 className="mb-4 font-semibold text-navy">Buat paket soal</h2>{questionsForPackage.length ? <TestPackageForm questions={questionsForPackage} /> : <EmptyState title="Soal aktif belum tersedia" description="Tambahkan soal aktif pada Bank Soal TKA terlebih dahulu." />}</section>
        <section className={panelClass}><h2 className="mb-4 font-semibold text-navy">Jadwalkan sesi ujian</h2>{period ? <TestSessionForm packages={packagesForForm} /> : <EmptyState title="Periode aktif belum tersedia" description="Sesi ujian harus terhubung ke periode penerimaan aktif." />}</section>
        <section className={`${panelClass} space-y-3`}>
          <h2 className="font-semibold text-navy">Sesi ujian · {period?.name ?? "Periode tidak aktif"}</h2>
          {sessions.length ? sessions.map((session) => {
            const started = startedBySession.get(session.id) ?? 0;
            const submitted = submittedBySession.get(session.id) ?? 0;
            return (
              <article key={session.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><h3 className="font-semibold text-slate-800">{session.title}</h3><p className="mt-1 text-sm text-slate-600">{session.testPackage.name} · {session.testPackage.durationMin} menit · {session._count.participants} peserta · {started} mulai · {submitted} selesai</p><p className="mt-1 text-xs text-slate-500">{formatDate(session.startsAt)} – {formatDate(session.endsAt)} WIB</p></div>
                <StatusBadge status={formatStatus(session.status)} />
              </div>
              <SessionTools sessionId={session.id} status={session.status} />
            </article>
            );
          }) : <EmptyState title="Belum ada sesi ujian" description="Buat paket soal lalu jadwalkan sesi." />}
        </section>
      </div>
    );
  } else if (slug[0] === "kelayakan") {
    const period = await prisma.academicPeriod.findFirst({ where: { isActive: true }, orderBy: { startsAt: "desc" }, select: { id: true, name: true } });
    const candidates = period ? await getRegistrationEligibility(period.id) : [];
    content = period ? candidates.length ? (
      <section className={panelClass}>
        <p className="mb-4 text-sm text-slate-500">Syarat: status pendaftaran terverifikasi, lima berkas wajib disetujui, dan tagihan lunas. Periode {period.name}.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr><th className="px-3 py-3">Pendaftar</th><th className="px-3 py-3">Jalur</th><th className="px-3 py-3">Status kelayakan</th><th className="px-3 py-3">Alasan</th><th className="px-3 py-3">Ujian</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{candidates.map((candidate) => (
            <tr key={candidate.id}><td className="px-3 py-3"><p className="font-medium text-slate-800">{candidate.student.fullName}</p><p className="text-xs text-slate-500">{candidate.registrationNo}</p></td><td className="px-3 py-3">{candidate.track.name}</td><td className="px-3 py-3"><StatusBadge status={candidate.isEligible ? "Terverifikasi" : "Belum layak"} /></td><td className="max-w-sm px-3 py-3 text-xs text-slate-600">{candidate.reasons.length ? candidate.reasons.join("; ") : "Memenuhi syarat"}</td><td className="px-3 py-3">{candidate.completedTest ? "Hasil tersedia" : "Belum mengikuti"}</td></tr>
          ))}</tbody>
        </table></div>
      </section>
    ) : <EmptyState title="Belum ada pendaftar" description="Data pendaftar pada periode aktif akan ditampilkan di sini." /> : <EmptyState title="Periode aktif belum tersedia" description="Kelayakan peserta memerlukan periode penerimaan aktif." />;
  } else if (slug[0] === "seleksi") {
    const [periods, versions] = await Promise.all([
      prisma.academicPeriod.findMany({ orderBy: { startsAt: "desc" }, select: { id: true, name: true } }),
      prisma.selectionVersion.findMany({
        take: 20,
        orderBy: [{ academicPeriod: { startsAt: "desc" } }, { version: "desc" }],
        include: {
          academicPeriod: { select: { name: true } },
          _count: { select: { results: true } },
          results: {
            take: 40,
            orderBy: { rank: "asc" },
            include: { registration: { select: { registrationNo: true, student: { select: { fullName: true } }, track: { select: { name: true } } } } },
          },
        },
      }),
    ]);
    content = (
      <div className="space-y-6">
        <section className={panelClass}><h2 className="mb-4 font-semibold text-navy">Buat draf hasil seleksi</h2><SelectionDraftForm periods={periods} /></section>
        <section className={`${panelClass} space-y-3`}>
          <h2 className="font-semibold text-navy">Versi hasil seleksi</h2>
          {versions.length ? versions.map((version) => (
            <details key={version.id} className="rounded-lg border border-slate-200 p-4">
              <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2"><span className="font-medium text-slate-800">Versi {version.version} · {version.academicPeriod.name}</span><span className="flex items-center gap-2"><StatusBadge status={version.status === "TERBIT" ? "Terbit" : version.status === "DRAF" ? "Draf" : "Dibatalkan"} /><span className="text-xs text-slate-500">{version._count.results} hasil</span></span></summary>
              <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">{version.notes ?? "Belum ada catatan penilaian."}{version.results.length < version._count.results ? ` · Menampilkan ${version.results.length} hasil pertama.` : ""}</p>
                {version.results.length ? <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Peringkat</th><th className="py-2">Pendaftar</th><th className="py-2">Jalur</th><th className="py-2">Skor</th><th className="py-2">Hasil</th></tr></thead><tbody className="divide-y divide-slate-100">{version.results.map((result) => <tr key={result.id}><td className="py-2">{result.rank ?? "—"}</td><td className="py-2">{result.registration.student.fullName} · {result.registration.registrationNo}</td><td className="py-2">{result.registration.track.name}</td><td className="py-2">{result.score === null ? "—" : Number(result.score).toFixed(2)}</td><td className="py-2">{formatStatus(result.status)}</td></tr>)}</tbody></table></div> : <EmptyState title="Tidak ada hasil" description="Draf belum memiliki hasil untuk ditinjau." />}
                {version.status === "DRAF" && <PublishSelectionForm selectionVersionId={version.id} />}
              </div>
            </details>
          )) : <EmptyState title="Belum ada versi seleksi" description="Buat draf untuk menghitung hasil berdasarkan data pendaftaran, rapor, ujian, dan berkas." />}
        </section>
      </div>
    );
  } else if (slug[0] === "laporan") {
    const rawPeriodId = typeof query.period === "string" ? query.period : undefined;
    const report = await getAdminAnalyticsData(rawPeriodId);
    content = report.period ? (
      <div className="space-y-6">
        <section className={panelClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-semibold text-navy">Laporan penerimaan · {report.period.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{report.total.toLocaleString("id-ID")} pendaftar pada periode ini.</p>
            </div>
            <form method="get" className="flex flex-wrap items-end gap-3">
              <div className="min-w-52">
                <label htmlFor="report-period" className="mb-1.5 block text-sm font-medium text-slate-700">Periode laporan</label>
                <Select id="report-period" name="period" defaultValue={report.period.id}>
                  {report.periods.map((period) => <option key={period.id} value={period.id}>{period.name}{period.isActive ? " · Aktif" : ""}</option>)}
                </Select>
              </div>
              <Button type="submit">Tampilkan</Button>
            </form>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["csv", "xlsx", "pdf"] as const).map((format) => (
              <Link key={format} href={`/api/admin/laporan?period=${encodeURIComponent(report.period!.id)}&format=${format}`} className="inline-flex h-9 items-center rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                Unduh {format.toUpperCase()}
              </Link>
            ))}
          </div>
        </section>
        <AnalyticsCharts
          byTrack={report.byTrack}
          byCity={report.byCity.slice(0, 10)}
          bySchool={report.bySchool}
          dailyRegistrations={report.dailyRegistrations}
        />
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Pendaftar per jalur</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr><th className="px-3 py-3">Nomor pendaftaran</th><th className="px-3 py-3">Nama</th><th className="px-3 py-3">Jalur</th><th className="px-3 py-3">Wilayah</th><th className="px-3 py-3">Asal sekolah</th><th className="px-3 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{report.registrations.slice(0, 100).map((registration) => (
                <tr key={registration.registrationNo}><td className="px-3 py-3 font-medium text-slate-800">{registration.registrationNo}</td><td className="px-3 py-3 text-slate-700">{registration.student.fullName}</td><td className="px-3 py-3 text-slate-700">{registration.track.name}</td><td className="px-3 py-3 text-slate-700">{registration.student.schoolOrigin?.city ?? "—"}</td><td className="px-3 py-3 text-slate-700">{registration.student.schoolOrigin?.name ?? "—"}</td><td className="px-3 py-3"><StatusBadge status={formatStatus(registration.status)} /></td></tr>
              ))}</tbody>
            </table>
          </div>
          {report.total > 100 && <p className="mt-3 text-sm text-slate-500">Menampilkan 100 pendaftar terbaru dari {report.total.toLocaleString("id-ID")}. Ekspor memuat seluruh data periode.</p>}
          {!report.total && <EmptyState title="Belum ada data pendaftar" description="Data laporan akan muncul setelah pendaftaran masuk." />}
        </section>
      </div>
    ) : <EmptyState title="Periode penerimaan belum tersedia" description="Laporan analitik akan tersedia setelah periode penerimaan dibuat." />;
  } else {
    content = (
      <EmptyState
        title="Fitur belum tersedia"
        description={`Halaman ${title.toLowerCase()} belum memiliki data atau tindakan yang dapat digunakan.`}
      />
    );
  }

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard", href: "/admin" }, { label: title }]} />
      <PageHeader title={title} description="Pengelolaan penerimaan murid baru SMPN 9 Depok." />
      {content}
    </>
  );
}
