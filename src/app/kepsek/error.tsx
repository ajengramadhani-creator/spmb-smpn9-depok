"use client";

export default function KepsekError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="rounded-xl border border-rose-200 bg-white p-6 shadow-panel" role="alert">
      <h2 className="text-lg font-semibold text-slate-900">Laporan belum dapat dimuat</h2>
      <p className="mt-2 text-sm text-slate-600">Terjadi kendala saat mengambil data monitoring. Coba muat ulang halaman.</p>
      <button type="button" onClick={reset} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">
        Coba lagi
      </button>
    </section>
  );
}
