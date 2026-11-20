import { notFound } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/badge";
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

function formatStatus(status: string) {
  const labels: Record<string, string> = {
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
  return labels[status] ?? status;
}

function formatDate(date: Date | null) {
  return date
    ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(date)
    : "—";
}

type RegistrationRow = {
  registrationNo: string;
  status: string;
  createdAt: Date;
  student: { fullName: string };
  track: { name: string };
};
const registrationColumns: ColumnDef<RegistrationRow>[] = [
  { accessorKey: "registrationNo", header: "Nomor pendaftaran" },
  { accessorFn: (row) => row.student.fullName, id: "nama", header: "Nama calon murid" },
  { accessorFn: (row) => row.track.name, id: "jalur", header: "Jalur" },
  { accessorFn: (row) => formatStatus(row.status), id: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
  { accessorFn: (row) => formatDate(row.createdAt), id: "tanggal", header: "Tanggal daftar" },
];

type PaymentRow = {
  invoiceNo: string;
  amount: number;
  status: string;
  dueAt: Date | null;
  registration: { registrationNo: string; student: { fullName: string } };
};
const paymentColumns: ColumnDef<PaymentRow>[] = [
  { accessorKey: "invoiceNo", header: "Nomor tagihan" },
  { accessorFn: (row) => row.registration.registrationNo, id: "pendaftaran", header: "Nomor pendaftaran" },
  { accessorFn: (row) => row.registration.student.fullName, id: "nama", header: "Nama calon murid" },
  { accessorFn: (row) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.amount), id: "jumlah", header: "Jumlah" },
  { accessorFn: (row) => formatStatus(row.status), id: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
  { accessorFn: (row) => formatDate(row.dueAt), id: "jatuhTempo", header: "Jatuh tempo" },
];

type AnnouncementRow = {
  title: string;
  type: string;
  publishedAt: Date | null;
  academicPeriod: { name: string } | null;
};
const announcementColumns: ColumnDef<AnnouncementRow>[] = [
  { accessorKey: "title", header: "Judul pengumuman" },
  { accessorFn: (row) => row.type, id: "jenis", header: "Jenis" },
  { accessorFn: (row) => row.academicPeriod?.name ?? "Semua periode", id: "periode", header: "Periode" },
  { accessorFn: (row) => row.publishedAt ? "Terbit" : "Draf", id: "status", header: "Status", cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
  { accessorFn: (row) => formatDate(row.publishedAt), id: "tanggal", header: "Tanggal terbit" },
];

export default async function AdminPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const title = pageTitles[slug.join("/")];
  if (!title) notFound();

  let content;
  if (slug[0] === "pendaftaran") {
    const data = await prisma.registration.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        registrationNo: true,
        status: true,
        createdAt: true,
        student: { select: { fullName: true } },
        track: { select: { name: true } },
      },
    });
    const rows: RegistrationRow[] = data.map((row) => ({ ...row, status: formatStatus(row.status) }));
    content = <DataTable columns={registrationColumns} data={rows} selectable={false} searchPlaceholder="Cari pendaftar..." />;
  } else if (slug[0] === "pembayaran") {
    const data = await prisma.invoice.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: {
        invoiceNo: true,
        amount: true,
        status: true,
        dueAt: true,
        registration: {
          select: { registrationNo: true, student: { select: { fullName: true } } },
        },
      },
    });
    const rows: PaymentRow[] = data.map((row) => ({
      ...row,
      amount: Number(row.amount),
      status: formatStatus(row.status),
    }));
    content = <DataTable columns={paymentColumns} data={rows} selectable={false} searchPlaceholder="Cari nomor tagihan atau nama..." />;
  } else if (slug[0] === "pengumuman") {
    const data = await prisma.announcement.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      select: { title: true, type: true, publishedAt: true, academicPeriod: { select: { name: true } } },
    });
    content = <DataTable columns={announcementColumns} data={data} selectable={false} searchPlaceholder="Cari pengumuman..." />;
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
      <section className={panelClass}>{content}</section>
    </>
  );
}
