"use client";

import { Button } from "@/components/ui/button";

export default function SiswaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-background px-5">
      <section role="alert" className="max-w-md text-center">
        <p className="text-sm font-bold text-danger">PORTAL SISWA TERGANGGU</p>
        <h1 className="mt-3 text-2xl font-bold text-navy">Data belum dapat dimuat.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Muat ulang halaman. Jika masalah berlanjut, hubungi sekretariat dan sertakan kode referensi berikut.
        </p>
        {error.digest && (
          <p className="mt-3 text-xs text-slate-500">Kode referensi: {error.digest}</p>
        )}
        <Button className="mt-6" onClick={reset}>Coba lagi</Button>
      </section>
    </main>
  );
}
