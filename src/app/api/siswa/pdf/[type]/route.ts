import { createElement } from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", color: "#0f172a", fontSize: 11 },
  title: { color: "#1d4ed8", fontSize: 20, marginBottom: 8 },
  subtitle: { color: "#64748b", marginBottom: 24 },
  row: { borderBottom: "1 solid #e2e8f0", paddingVertical: 11, flexDirection: "row" },
  label: { width: 150, color: "#64748b" },
  value: { flex: 1, fontWeight: 700 },
});

function documentPdf(title: string, rows: Array<[string, string]>) {
  return createElement(Document, { title }, createElement(Page, { size: "A4", style: styles.page },
    createElement(Text, { style: styles.title }, "SPMB SMPN 9 Depok"),
    createElement(Text, { style: styles.subtitle }, title),
    createElement(View, null, ...rows.map(([label, value]) => createElement(View, { key: label, style: styles.row },
      createElement(Text, { style: styles.label }, label),
      createElement(Text, { style: styles.value }, value),
    ))),
    createElement(Text, { style: { marginTop: 32, color: "#64748b", fontSize: 9 } }, "Dokumen resmi Portal SPMB SMPN 9 Depok 2027/2028."),
  ));
}

export async function GET(request: Request, { params }: { params: Promise<{ type: string }> }) {
  let user;
  try {
    user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const { type } = await params;
  const query = new URL(request.url).searchParams;
  let title = "";
  let rows: Array<[string, string]> = [];
  let fileName = "";

  if (type === "kwitansi") {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: query.get("invoiceId") ?? "",
        status: "LUNAS",
        registration: { student: { userId: user.id } },
        payments: { some: { status: "BERHASIL" } },
      },
      include: { registration: { include: { student: true, track: true, academicPeriod: true } } },
    });
    if (!invoice) return Response.json({ pesan: "Kwitansi hanya tersedia untuk pembayaran yang telah lunas." }, { status: 404 });
    title = "Kwitansi pembayaran";
    fileName = `kwitansi-${invoice.invoiceNo}.pdf`;
    rows = [
      ["Nomor tagihan", invoice.invoiceNo],
      ["Nomor pendaftaran", invoice.registration.registrationNo],
      ["Nama", invoice.registration.student.fullName],
      ["Jalur pendaftaran", invoice.registration.track.name],
      ["Periode", invoice.registration.academicPeriod.name],
      ["Jumlah dibayar", new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(invoice.amount))],
      ["Status", "LUNAS"],
    ];
  } else if (type === "kartu-peserta") {
    const participant = await prisma.testParticipant.findFirst({
      where: { registration: { student: { userId: user.id } } },
      include: { session: true, registration: { include: { student: true, track: true } } },
      orderBy: { session: { startsAt: "asc" } },
    });
    if (!participant) return Response.json({ pesan: "Kartu peserta belum tersedia." }, { status: 404 });
    title = "Kartu peserta Tes Kemampuan Akademik";
    fileName = `kartu-peserta-${participant.registration.registrationNo}.pdf`;
    rows = [
      ["Nomor peserta", participant.registration.registrationNo],
      ["Nama", participant.registration.student.fullName],
      ["Jalur pendaftaran", participant.registration.track.name],
      ["Sesi ujian", participant.session.title],
      ["Jadwal", new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(participant.session.startsAt) + " WIB"],
      ["Status", participant.session.status === "DIBATALKAN" ? "Dibatalkan" : "Terdaftar"],
    ];
  } else if (type === "surat-keputusan") {
    const result = await prisma.selectionResult.findFirst({
      where: { registration: { student: { userId: user.id } }, selectionVersion: { status: "TERBIT" } },
      include: { registration: { include: { student: true, track: true, academicPeriod: true } }, selectionVersion: true },
      orderBy: { selectionVersion: { publishedAt: "desc" } },
    });
    if (!result) return Response.json({ pesan: "Surat keputusan belum tersedia." }, { status: 404 });
    title = "Surat keputusan hasil seleksi";
    fileName = `hasil-seleksi-${result.registration.registrationNo}.pdf`;
    rows = [
      ["Nomor pendaftaran", result.registration.registrationNo],
      ["Nama", result.registration.student.fullName],
      ["Jalur pendaftaran", result.registration.track.name],
      ["Periode", result.registration.academicPeriod.name],
      ["Hasil", result.status],
      ["Nilai seleksi", result.score === null ? "—" : String(result.score)],
      ["Versi hasil", String(result.selectionVersion.version)],
      ["Diterbitkan", result.selectionVersion.publishedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(result.selectionVersion.publishedAt) : "—"],
    ];
  } else {
    return Response.json({ pesan: "Jenis dokumen tidak tersedia." }, { status: 404 });
  }

  const buffer = await renderToBuffer(documentPdf(title, rows));
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName.replace(/[\r\n"\\/;]/g, "_")}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
