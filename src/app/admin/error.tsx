"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Kesalahan portal admin", { digest: error.digest });
  }, [error.digest]);

  return (
    <div role="alert" className="mx-auto max-w-xl rounded-xl border border-red-200 bg-white p-6 shadow-panel">
      <h1 className="text-xl font-semibold text-navy">Halaman admin belum dapat dimuat</h1>
      <p className="mt-2 text-sm text-slate-600">Terjadi kendala saat mengambil data. Coba muat ulang; jika masalah berlanjut, sampaikan kode referensi kepada pengelola sistem.</p>
      {error.digest && <p className="mt-3 text-xs text-slate-500">Kode referensi: {error.digest}</p>}
      <button type="button" onClick={reset} className="mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90">Coba lagi</button>
    </div>
  );
}
