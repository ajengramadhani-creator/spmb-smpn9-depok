"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-background px-5">
      <section className="max-w-md text-center">
        <p className="text-sm font-bold text-danger">TERJADI GANGGUAN</p>
        <h1 className="mt-3 text-2xl font-bold text-navy">Halaman belum dapat dimuat.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Silakan coba kembali. Jika gangguan berlanjut, hubungi sekretariat SPMB.</p>
        <Button className="mt-6" onClick={reset}>Coba lagi</Button>
      </section>
    </main>
  );
}
