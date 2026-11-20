import ExcelJS from "exceljs";
import { prisma } from "@/lib/db/prisma";

export async function buildRegistrationWorkbook(academicPeriodId: string) {
  const registrations = await prisma.registration.findMany({
    where: { academicPeriodId },
    include: { student: true, track: true },
    orderBy: { createdAt: "asc" },
  });
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Pendaftar");
  sheet.columns = [
    { header: "Nomor pendaftaran", key: "registrationNo", width: 22 },
    { header: "Nama", key: "fullName", width: 32 },
    { header: "Jalur", key: "track", width: 20 },
    { header: "Status", key: "status", width: 24 },
    { header: "Tanggal daftar", key: "createdAt", width: 20 },
  ];
  for (const registration of registrations) {
    sheet.addRow({ registrationNo: registration.registrationNo, fullName: registration.student.fullName, track: registration.track.name, status: registration.status, createdAt: registration.createdAt });
  }
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
  return workbook.xlsx.writeBuffer();
}