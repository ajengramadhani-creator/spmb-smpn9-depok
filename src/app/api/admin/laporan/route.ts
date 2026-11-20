import { createElement } from "react";
import ExcelJS from "exceljs";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { getAdminAnalyticsData } from "@/server/services/analytics";

const pdfStyles = StyleSheet.create({
  page: { padding: 28, fontFamily: "Helvetica", color: "#0f172a", fontSize: 8 },
  title: { color: "#1d4ed8", fontSize: 16, marginBottom: 5 },
  subtitle: { color: "#64748b", fontSize: 9, marginBottom: 16 },
  header: { flexDirection: "row", backgroundColor: "#eff6ff", borderBottom: "1 solid #cbd5e1", paddingVertical: 6 },
  row: { flexDirection: "row", borderBottom: "1 solid #e2e8f0", paddingVertical: 5 },
  cell: { paddingHorizontal: 4 },
});

function safeFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "periode";
}

function csvCell(value: string) {
  const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function buildCsv(report: Awaited<ReturnType<typeof getAdminAnalyticsData>>) {
  const header = ["Nomor pendaftaran", "Nama", "Jalur", "Wilayah", "Asal sekolah", "Status", "Tanggal daftar"];
  const rows = report.registrations.map((item) => [
    item.registrationNo,
    item.student.fullName,
    item.track.name,
    item.student.schoolOrigin?.city ?? "",
    item.student.schoolOrigin?.name ?? "",
    item.status,
    new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeZone: "Asia/Jakarta" }).format(item.createdAt),
  ]);
  return `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

async function buildExcel(report: Awaited<ReturnType<typeof getAdminAnalyticsData>>) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SPMB SMPN 9 Depok";
  workbook.subject = `Laporan periode ${report.period?.name ?? ""}`;

  const summary = workbook.addWorksheet("Ringkasan Jalur");
  summary.columns = [
    { header: "Jalur", key: "name", width: 28 },
    { header: "Jumlah pendaftar", key: "jumlah", width: 20 },
    { header: "Kuota", key: "kuota", width: 16 },
  ];
  summary.addRows(report.byTrack);

  const cities = workbook.addWorksheet("Wilayah");
  cities.columns = [{ header: "Wilayah", key: "name", width: 32 }, { header: "Jumlah pendaftar", key: "jumlah", width: 20 }];
  cities.addRows(report.byCity);

  const schools = workbook.addWorksheet("Asal Sekolah");
  schools.columns = [{ header: "Asal sekolah", key: "name", width: 40 }, { header: "Jumlah pendaftar", key: "jumlah", width: 20 }];
  schools.addRows(report.bySchool);

  const trend = workbook.addWorksheet("Tren Harian");
  trend.columns = [{ header: "Tanggal", key: "label", width: 20 }, { header: "Pendaftar", key: "pendaftar", width: 16 }];
  trend.addRows(report.dailyRegistrations);

  const registrations = workbook.addWorksheet("Data Pendaftar");
  registrations.columns = [
    { header: "Nomor pendaftaran", key: "registrationNo", width: 24 },
    { header: "Nama", key: "name", width: 32 },
    { header: "Jalur", key: "track", width: 22 },
    { header: "Wilayah", key: "city", width: 24 },
    { header: "Asal sekolah", key: "school", width: 34 },
    { header: "Status", key: "status", width: 24 },
    { header: "Tanggal daftar", key: "createdAt", width: 24 },
  ];
  for (const item of report.registrations) {
    registrations.addRow({
      registrationNo: item.registrationNo,
      name: item.student.fullName,
      track: item.track.name,
      city: item.student.schoolOrigin?.city ?? "—",
      school: item.student.schoolOrigin?.name ?? "—",
      status: item.status,
      createdAt: item.createdAt,
    });
  }
  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true, color: { argb: "FF0F172A" } };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
  }
  return workbook.xlsx.writeBuffer();
}

function buildPdf(report: Awaited<ReturnType<typeof getAdminAnalyticsData>>) {
  const headers = ["Nomor daftar", "Nama", "Jalur", "Wilayah", "Asal sekolah", "Status"];
  const widths = ["15%", "20%", "14%", "14%", "22%", "15%"];
  const header = createElement(View, { style: pdfStyles.header, wrap: false },
    ...headers.map((value, index) => createElement(Text, { key: value, style: { ...pdfStyles.cell, width: widths[index], fontWeight: 700 } }, value)),
  );
  const rows = report.registrations.map((item) => createElement(View, { key: item.registrationNo, style: pdfStyles.row, wrap: false },
    createElement(Text, { style: { ...pdfStyles.cell, width: widths[0] } }, item.registrationNo),
    createElement(Text, { style: { ...pdfStyles.cell, width: widths[1] } }, item.student.fullName),
    createElement(Text, { style: { ...pdfStyles.cell, width: widths[2] } }, item.track.name),
    createElement(Text, { style: { ...pdfStyles.cell, width: widths[3] } }, item.student.schoolOrigin?.city ?? "—"),
    createElement(Text, { style: { ...pdfStyles.cell, width: widths[4] } }, item.student.schoolOrigin?.name ?? "—"),
    createElement(Text, { style: { ...pdfStyles.cell, width: widths[5] } }, item.status),
  ));
  return createElement(Document, { title: `Laporan SPMB ${report.period?.name ?? ""}` },
    createElement(Page, { size: "A4", orientation: "landscape", style: pdfStyles.page },
      createElement(Text, { style: pdfStyles.title }, "Laporan Analitik SPMB SMPN 9 Depok"),
      createElement(Text, { style: pdfStyles.subtitle }, `Periode ${report.period?.name ?? "—"} · ${report.total} pendaftar`),
      header,
      ...rows,
    ),
  );
}

export async function GET(request: Request) {
  try {
    await requireRole([Role.ADMIN], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }

  const query = new URL(request.url).searchParams;
  const report = await getAdminAnalyticsData(query.get("period") ?? undefined);
  if (!report.period) return Response.json({ pesan: "Periode penerimaan belum tersedia." }, { status: 404 });

  const format = query.get("format") ?? "csv";
  const baseName = `laporan-spmb-${safeFileName(report.period.name)}`;
  const headers = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (format === "csv") {
    return new Response(buildCsv(report), {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }
  if (format === "xlsx") {
    return new Response(new Uint8Array(await buildExcel(report)), {
      headers: {
        ...headers,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
      },
    });
  }
  if (format === "pdf") {
    const pdf = await renderToBuffer(buildPdf(report));
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
      },
    });
  }
  return Response.json({ pesan: "Format laporan tidak didukung." }, { status: 400 });
}
