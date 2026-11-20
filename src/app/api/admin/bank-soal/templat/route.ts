import ExcelJS from "exceljs";
import { Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";

export async function GET() {
  try {
    await requireRole([Role.ADMIN], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Bank Soal");
  sheet.addRow(["Kategori", "Pertanyaan", "A", "B", "C", "D", "Kunci", "Bobot"]);
  sheet.getRow(1).font = { bold: true };
  sheet.columns = [
    { width: 24 }, { width: 60 }, { width: 32 }, { width: 32 },
    { width: 32 }, { width: 32 }, { width: 12 }, { width: 12 },
  ];
  return new Response(new Uint8Array(await workbook.xlsx.writeBuffer()), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=\"templat-bank-soal.xlsx\"",
      "Cache-Control": "private, no-store",
    },
  });
}
