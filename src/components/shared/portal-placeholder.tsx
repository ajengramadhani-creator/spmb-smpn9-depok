import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

const labels: Record<string, string> = {
  pendaftaran: "Pendaftaran",
  dokumen: "Dokumen persyaratan",
  pembayaran: "Pembayaran",
  pengumuman: "Pengumuman",
  pendaftar: "Data pendaftar",
  verifikasi: "Verifikasi dokumen",
  seleksi: "Pengelolaan seleksi",
  laporan: "Laporan pendaftaran",
  hasil: "Hasil seleksi",
};

export function PortalPlaceholder({ slug }: { slug: string[] }) {
  const title = labels[slug[0]] ?? "Halaman portal";
  return <><PageHeader title={title} description="Periode penerimaan murid baru 2027/2028" /><section className="rounded-xl border border-slate-200 bg-white shadow-panel"><EmptyState title="Belum ada data untuk ditampilkan" description="Informasi akan tersedia setelah tahapan pendaftaran dimulai." /></section></>;
}