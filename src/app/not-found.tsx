import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-5">
      <section className="max-w-md text-center">
        <p className="text-sm font-bold text-primary">404 · HALAMAN TIDAK DITEMUKAN</p>
        <h1 className="mt-3 text-2xl font-bold text-navy">Halaman yang Anda cari tidak tersedia.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Periksa kembali alamat halaman atau kembali ke beranda SPMB.</p>
        <Link href="/" className="mt-6 inline-block"><Button>Kembali ke beranda</Button></Link>
      </section>
    </main>
  );
}
