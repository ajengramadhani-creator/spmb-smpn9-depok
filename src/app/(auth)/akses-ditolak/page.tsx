import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessDeniedPage() {
  return <main className="grid min-h-screen place-items-center bg-background px-5"><section className="max-w-md text-center"><p className="text-sm font-bold text-danger">AKSES DITOLAK</p><h1 className="mt-3 text-2xl font-bold text-navy">Anda tidak memiliki izin untuk halaman ini.</h1><p className="mt-2 text-sm text-slate-500">Masuk menggunakan akun dengan peran yang sesuai.</p><Link href="/ruang-kerja" className="mt-6 inline-block"><Button>Kembali ke portal</Button></Link></section></main>;
}