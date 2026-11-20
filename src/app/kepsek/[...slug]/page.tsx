import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

const pageTitles: Record<string, string> = {
  pendaftaran: "Data Pendaftaran",
  "hasil-tes": "Hasil Tes Akademik",
  "hasil-seleksi": "Hasil Seleksi",
  statistik: "Statistik SPMB",
  pembayaran: "Laporan Pembayaran",
  "laporan-eksekutif": "Laporan Eksekutif",
};

export default async function KepsekPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const title = pageTitles[slug.join("/")];
  if (!title) notFound();

  return (
    <>
      <Breadcrumb items={[{ label: "Dashboard Monitoring", href: "/kepsek" }, { label: title }]} />
      <PageHeader title={title} description="Ringkasan baca-saja pelaksanaan SPMB SMPN 9 Depok." />
      <section className="rounded-xl border border-slate-200 bg-white shadow-panel">
        <EmptyState
          title="Laporan belum tersedia"
          description="Informasi akan ditampilkan setelah data pada tahapan terkait tersedia."
        />
      </section>
    </>
  );
}
