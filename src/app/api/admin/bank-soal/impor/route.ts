import ExcelJS from "exceljs";
import { Prisma, Role } from "@prisma/client";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

const maxSize = 5 * 1024 * 1024;
const headers = ["kategori", "pertanyaan", "a", "b", "c", "d", "kunci", "bobot"];

function cellText(row: ExcelJS.Row, index: number) {
  return String(row.getCell(index).text ?? "").trim();
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await requireRole([Role.ADMIN], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxSize + 128 * 1024) {
    return Response.json({ pesan: "Ukuran berkas impor maksimal 5 MB." }, { status: 413 });
  }
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.size < 4 || file.size > maxSize) {
    return Response.json({ pesan: "Pilih berkas Excel .xlsx berukuran maksimal 5 MB." }, { status: 400 });
  }
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return Response.json({ pesan: "Isi berkas bukan dokumen Excel yang valid." }, { status: 400 });

  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return Response.json({ pesan: "Berkas Excel tidak dapat dibaca." }, { status: 400 });
  }
  const sheet = workbook.worksheets[0];
  if (!sheet || headers.some((header, index) => cellText(sheet.getRow(1), index + 1).toLowerCase() !== header)) {
    return Response.json({ pesan: "Kolom templat tidak sesuai. Unduh templat resmi sebelum mengimpor." }, { status: 400 });
  }
  if (sheet.rowCount > 1001) return Response.json({ pesan: "Maksimal 1.000 baris dapat diimpor sekaligus." }, { status: 413 });

  const validRows: { rowNumber: number; category: string; prompt: string; options: [string, string, string, string]; answer: string; points: number }[] = [];
  const errors: { baris: number; pesan: string }[] = [];
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    if (headers.every((_, index) => !cellText(row, index + 1))) continue;
    const [category, prompt, optionA, optionB, optionC, optionD, answer, rawPoints] =
      headers.map((_, index) => cellText(row, index + 1));
    const points = Number(rawPoints || "1");
    const normalizedAnswer = answer.toUpperCase();
    const fields = [category, prompt, optionA, optionB, optionC, optionD];
    if (fields.some((value) => value.length === 0) || category.length > 80 || prompt.length > 5000 || fields.some((value) => value.length > 2000)) {
      errors.push({ baris: rowNumber, pesan: "Kategori, pertanyaan, dan empat pilihan wajib diisi serta sesuai batas panjang." });
      continue;
    }
    if (!["A", "B", "C", "D"].includes(normalizedAnswer) || !Number.isFinite(points) || points <= 0 || points > 100) {
      errors.push({ baris: rowNumber, pesan: "Kunci harus A–D dan bobot nilai harus lebih dari 0 hingga 100." });
      continue;
    }
    validRows.push({ rowNumber, category, prompt, options: [optionA, optionB, optionC, optionD], answer: normalizedAnswer, points });
  }
  if (!validRows.length) return Response.json({ pesan: "Tidak ada baris valid untuk diimpor.", imported: 0, errors }, { status: 422 });

  await prisma.$transaction(async (transaction) => {
    for (const row of validRows) {
      const category = await transaction.questionCategory.upsert({
        where: { name: row.category },
        create: { name: row.category },
        update: {},
      });
      const question = await transaction.question.create({
        data: {
          categoryId: category.id,
          prompt: row.prompt,
          points: new Prisma.Decimal(row.points),
          type: "PILIHAN_GANDA",
          options: {
            create: row.options.map((content, index) => ({
              label: String.fromCharCode(65 + index),
              content,
              isCorrect: row.answer === String.fromCharCode(65 + index),
            })),
          },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: admin.id,
          action: "QUESTION_IMPORTED",
          entity: "Question",
          entityId: question.id,
          metadata: { row: row.rowNumber },
        },
      });
    }
  });
  return Response.json({ pesan: "Impor selesai.", imported: validRows.length, errors }, { status: errors.length ? 207 : 201 });
}
