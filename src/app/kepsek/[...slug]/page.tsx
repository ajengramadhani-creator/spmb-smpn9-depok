import { notFound } from "next/navigation";
import { BadgeCheck, ClipboardCheck, Wallet } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { getKepsekReportData } from "@/server/services/analytics";

const pageTitles: Record<string, string> = {
  pendaftaran: "Data Pendaftaran",
  "hasil-tes": "Hasil Tes Akademik",
  "hasil-seleksi": "Hasil Seleksi",
  statistik: "Statistik SPMB",
  pembayaran: "Laporan Pembayaran",
  "laporan-eksekutif": "Laporan Eksekutif",
};

const panelClass = "rounded-xl border border-slate-200 bg-white p-5 shadow-panel sm:p-6";
const statusLabels: Record<string, string> = {
  DRAF: "Draf",
  MENUNGGU_VERIFIKASI: "Menunggu verifikasi",
  PERLU_PERBAIKAN: "Perlu perbaikan",
  TERVERIFIKASI: "Terverifikasi",
  MENGIKUTI_SELEKSI: "Mengikuti seleksi",
  DITERIMA: "Diterima",
  DITOLAK: "Tidak diterima",
  CADANGAN: "Cadangan",
  BELUM_DIBAYAR: "Belum dibayar",
  MENUNGGU: "Menunggu",
  LUNAS: "Lunas",
  KADALUWARSA: "Kedaluwarsa",
  DIBATALKAN: "Dibatalkan",
  BERHASIL: "Berhasil",
  GAGAL: "Gagal",
  DIKEMBALIKAN: "Dikembalikan",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: Date | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(value)
    : "—";
}

function statusLabel(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

function DataTable({ children, minWidth = "min-w-[700px]" }: { children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className={`w-full ${minWidth} text-left text-sm`}>{children}</table>
    </div>
  );
}

function TableHead({ labels }: { labels: string[] }) {
  return (
    <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
      <tr>{labels.map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr>
    </thead>
  );
}

function KepsekReportContent({ data }: { data: Awaited<ReturnType<typeof getKepsekReportData>> }) {
  if (data.kind === "empty") {
    return <EmptyState title="Periode aktif belum tersedia" description="Laporan akan tersedia setelah periode penerimaan diaktifkan." />;
  }

  if (data.kind === "pendaftaran") {
    return data.registrations.length ? (
      <section className={panelClass}>
        <p className="mb-4 text-sm text-slate-500">{formatNumber(data.total)} pendaftar · menampilkan maksimal 100 data terbaru untuk periode {data.periodName}.</p>
        <DataTable>
          <TableHead labels={["Nomor pendaftaran", "Nama", "Jalur", "Status", "Tanggal daftar"]} />
          <tbody className="divide-y divide-slate-100">
            {data.registrations.map((item) => (
              <tr key={item.registrationNo}>
                <td className="px-3 py-3 font-medium text-slate-800">{item.registrationNo}</td>
                <td className="px-3 py-3 text-slate-700">{item.student.fullName}</td>
                <td className="px-3 py-3 text-slate-700">{item.track.name}</td>
                <td className="px-3 py-3 text-slate-700">{statusLabel(item.status)}</td>
                <td className="px-3 py-3 text-slate-600">{formatDate(item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
    ) : <EmptyState title="Belum ada pendaftar" description={`Data pendaftaran periode ${data.periodName} akan muncul di sini.`} />;
  }

  if (data.kind === "hasil-tes") {
    return data.results.length ? (
      <section className={panelClass}>
        <p className="mb-4 text-sm text-slate-500">{formatNumber(data.total)} hasil tes · menampilkan maksimal 100 hasil terbaru.</p>
        <DataTable>
          <TableHead labels={["Nomor pendaftaran", "Nama", "Jalur", "Nilai", "Nilai maksimal", "Tanggal penilaian"]} />
          <tbody className="divide-y divide-slate-100">
            {data.results.map((item) => (
              <tr key={`${item.participant.registration.registrationNo}-${item.gradedAt.toISOString()}`}>
                <td className="px-3 py-3 font-medium text-slate-800">{item.participant.registration.registrationNo}</td>
                <td className="px-3 py-3 text-slate-700">{item.participant.registration.student.fullName}</td>
                <td className="px-3 py-3 text-slate-700">{item.participant.registration.track.name}</td>
                <td className="px-3 py-3 text-slate-700">{Number(item.score).toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-700">{Number(item.maxScore).toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-600">{formatDate(item.gradedAt)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>
    ) : <EmptyState title="Hasil tes belum tersedia" description={`Hasil tes yang telah dinilai untuk periode ${data.periodName} akan muncul di sini.`} />;
  }

  if (data.kind === "hasil-seleksi") {
    return data.version ? (
      <section className={panelClass}>
        <p className="mb-4 text-sm text-slate-500">
          Versi {data.version.version} · diterbitkan {formatDate(data.version.publishedAt)} · {formatNumber(data.version._count.results)} hasil
          {data.version.results.length < data.version._count.results ? " · menampilkan 100 hasil pertama." : "."}
        </p>
        {data.version.results.length ? (
          <DataTable>
            <TableHead labels={["Peringkat", "Nomor pendaftaran", "Nama", "Jalur", "Nilai", "Hasil"]} />
            <tbody className="divide-y divide-slate-100">
              {data.version.results.map((item) => (
                <tr key={item.registration.registrationNo}>
                  <td className="px-3 py-3 text-slate-700">{item.rank ?? "—"}</td>
                  <td className="px-3 py-3 font-medium text-slate-800">{item.registration.registrationNo}</td>
                  <td className="px-3 py-3 text-slate-700">{item.registration.student.fullName}</td>
                  <td className="px-3 py-3 text-slate-700">{item.registration.track.name}</td>
                  <td className="px-3 py-3 text-slate-700">{item.score === null ? "—" : Number(item.score).toFixed(2)}</td>
                  <td className="px-3 py-3 text-slate-700">{statusLabel(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        ) : <EmptyState title="Belum ada hasil pada versi terbit" description="Tidak ada hasil yang tersimpan pada versi seleksi ini." />}
      </section>
    ) : <EmptyState title="Hasil seleksi belum diterbitkan" description="Halaman ini hanya menampilkan hasil dari versi seleksi yang sudah diterbitkan." />;
  }

  if (data.kind === "statistik") {
    return (
      <div className="space-y-6">
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Pendaftar per jalur</h2>
          {data.tracks.length ? (
            <DataTable minWidth="min-w-[520px]">
              <TableHead labels={["Jalur", "Pendaftar", "Kuota", "Keterisian"]} />
              <tbody className="divide-y divide-slate-100">
                {data.tracks.map((track) => (
                  <tr key={track.name}>
                    <td className="px-3 py-3 font-medium text-slate-800">{track.name}</td>
                    <td className="px-3 py-3 text-slate-700">{formatNumber(track.jumlah)}</td>
                    <td className="px-3 py-3 text-slate-700">{formatNumber(track.kuota)}</td>
                    <td className="px-3 py-3 text-slate-700">{track.kuota ? `${Math.round((track.jumlah / track.kuota) * 100)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : <EmptyState title="Data jalur belum tersedia" description="Jalur penerimaan akan ditampilkan setelah dibuat." />}
        </section>
        <div className="grid gap-6 xl:grid-cols-2">
          {[
            { title: "Pendaftar per wilayah", rows: data.cities },
            { title: "Asal sekolah terbanyak", rows: data.schools },
          ].map(({ title, rows }) => (
            <section key={title} className={panelClass}>
              <h2 className="mb-4 font-semibold text-navy">{title}</h2>
              {rows.length ? (
                <ul className="divide-y divide-slate-100">
                  {rows.map((row) => <li key={row.name} className="flex justify-between gap-3 py-3 text-sm"><span className="text-slate-700">{row.name}</span><span className="font-semibold text-navy">{formatNumber(row.jumlah)}</span></li>)}
                </ul>
              ) : <EmptyState title="Data belum tersedia" description="Informasi akan muncul setelah asal sekolah terisi." />}
            </section>
          ))}
        </div>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Pendaftaran harian · 30 hari terakhir</h2>
          {data.dailyRegistrations.some((item) => item.pendaftar > 0) ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {data.dailyRegistrations.map((item) => <li key={item.label} className="rounded-lg bg-slate-50 p-3 text-sm"><span className="block text-slate-500">{item.label}</span><span className="mt-1 block font-semibold text-navy">{formatNumber(item.pendaftar)} pendaftar</span></li>)}
            </ul>
          ) : <EmptyState title="Belum ada pendaftaran terbaru" description="Tren harian akan muncul setelah pendaftaran periode ini dibuat." />}
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Status pendaftaran</h2>
          {data.statuses.length ? (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.statuses.map((item) => <li key={item.name} className="rounded-lg border border-slate-200 p-4"><span className="block text-sm text-slate-500">{statusLabel(item.name)}</span><span className="mt-1 block text-xl font-semibold text-navy">{formatNumber(item.jumlah)}</span></li>)}
            </ul>
          ) : <EmptyState title="Belum ada status pendaftaran" description="Ringkasan status akan muncul setelah data pendaftaran tersedia." />}
        </section>
      </div>
    );
  }

  if (data.kind === "pembayaran") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Tagihan lunas" value={formatNumber(data.paidCount)} detail="Tagihan berstatus lunas" icon={BadgeCheck} />
          <StatCard label="Total pembayaran lunas" value={formatCurrency(data.paidAmount)} detail={`Periode ${data.periodName}`} icon={Wallet} />
        </div>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Rekap tagihan</h2>
          {data.invoices.length ? (
            <DataTable minWidth="min-w-[520px]">
              <TableHead labels={["Status", "Jumlah tagihan", "Total nominal"]} />
              <tbody className="divide-y divide-slate-100">{data.invoices.map((item) => <tr key={item.status}><td className="px-3 py-3 text-slate-700">{statusLabel(item.status)}</td><td className="px-3 py-3 text-slate-700">{formatNumber(item.jumlah)}</td><td className="px-3 py-3 text-slate-700">{formatCurrency(item.total)}</td></tr>)}</tbody>
            </DataTable>
          ) : <EmptyState title="Belum ada tagihan" description="Rekap pembayaran akan muncul setelah tagihan dibuat." />}
        </section>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Transaksi terbaru</h2>
          {data.payments.length ? (
            <DataTable>
              <TableHead labels={["Nama", "Nomor pendaftaran", "Nomor tagihan", "Nominal", "Status", "Tanggal"]} />
              <tbody className="divide-y divide-slate-100">{data.payments.map((item, index) => <tr key={`${item.invoice.invoiceNo}-${item.createdAt.toISOString()}-${index}`}><td className="px-3 py-3 text-slate-700">{item.invoice.registration.student.fullName}</td><td className="px-3 py-3 text-slate-700">{item.invoice.registration.registrationNo}</td><td className="px-3 py-3 text-slate-700">{item.invoice.invoiceNo}</td><td className="px-3 py-3 text-slate-700">{formatCurrency(Number(item.amount))}</td><td className="px-3 py-3 text-slate-700">{statusLabel(item.status)}</td><td className="px-3 py-3 text-slate-600">{formatDate(item.createdAt)}</td></tr>)}</tbody>
            </DataTable>
          ) : <EmptyState title="Belum ada transaksi" description="Transaksi pembayaran pada periode aktif akan ditampilkan di sini." />}
        </section>
      </div>
    );
  }

  if (data.kind === "laporan-eksekutif") {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total pendaftar" value={formatNumber(data.summary.total)} detail="Seluruh jalur" icon={ClipboardCheck} />
          <StatCard label="Pendaftaran dikirim" value={formatNumber(data.summary.submitted)} detail="Formulir telah dikirim" icon={ClipboardCheck} />
          <StatCard label="Diterima" value={formatNumber(data.summary.accepted)} detail="Hasil seleksi terbit" icon={BadgeCheck} />
          <StatCard label="Pembayaran lunas" value={formatCurrency(data.summary.paidAmount)} detail={`${formatNumber(data.summary.paidCount)} tagihan lunas`} icon={Wallet} />
        </div>
        <section className={panelClass}>
          <h2 className="mb-4 font-semibold text-navy">Ringkasan per jalur</h2>
          {data.tracks.length ? (
            <DataTable minWidth="min-w-[620px]">
              <TableHead labels={["Jalur", "Pendaftar", "Diterima", "Kuota", "Keterisian kuota"]} />
              <tbody className="divide-y divide-slate-100">{data.tracks.map((track) => <tr key={track.name}><td className="px-3 py-3 font-medium text-slate-800">{track.name}</td><td className="px-3 py-3 text-slate-700">{formatNumber(track.total)}</td><td className="px-3 py-3 text-slate-700">{formatNumber(track.accepted)}</td><td className="px-3 py-3 text-slate-700">{formatNumber(track.quota)}</td><td className="px-3 py-3 text-slate-700">{track.quota ? `${Math.round((track.accepted / track.quota) * 100)}%` : "—"}</td></tr>)}</tbody>
            </DataTable>
          ) : <EmptyState title="Data jalur belum tersedia" description="Ringkasan akan muncul setelah jalur penerimaan dibuat." />}
          <p className="mt-4 text-sm text-slate-500">Tidak diterima: {formatNumber(data.summary.rejected)} · Cadangan: {formatNumber(data.summary.reserve)}</p>
        </section>
      </div>
    );
  }

  return null;
}

export default async function KepsekPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = slug.join("/");
  const title = pageTitles[page];
  if (!title) notFound();

  const data = await getKepsekReportData(page);
  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard Monitoring", href: "/kepsek" }, { label: title }]} />
      <PageHeader title={title} description={`Ringkasan baca-saja pelaksanaan SPMB periode ${data.periodName}.`} />
      <KepsekReportContent data={data} />
    </>
  );
}
