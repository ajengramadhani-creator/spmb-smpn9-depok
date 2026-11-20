import Link from "next/link";
import { RegistrationStatus, ReviewStatus, type Prisma } from "@prisma/client";
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
import { prisma } from "@/lib/db/prisma";

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
