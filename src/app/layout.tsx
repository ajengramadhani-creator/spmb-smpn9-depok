import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { QueryProvider } from "@/components/shared/query-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "SPMB SMPN 9 Depok 2027/2028", template: "%s | SPMB SMPN 9 Depok" },
  description: "Portal Penerimaan Murid Baru SMP Negeri 9 Depok Tahun Ajaran 2027/2028.",
  applicationName: "SPMB SMPN 9 Depok",
  keywords: ["SPMB", "SMPN 9 Depok", "penerimaan murid baru", "2027/2028"],
  openGraph: {
    title: "SPMB SMPN 9 Depok 2027/2028",
    description: "Informasi resmi penerimaan murid baru SMP Negeri 9 Depok.",
    locale: "id_ID",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body className={`${inter.variable} font-sans antialiased`}><QueryProvider>{children}</QueryProvider></body></html>;
}