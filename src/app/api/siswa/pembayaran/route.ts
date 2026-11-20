import { randomUUID } from "node:crypto";
import { Role } from "@prisma/client";
import { createStorageKey, deletePrivateFile, uploadPrivateFile } from "@/lib/storage";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";
import { manualTransferProvider, midtransProvider, type StudentPaymentMethod } from "@/server/services/payment-providers";

const methods = ["TRANSFER_BANK", "VIRTUAL_ACCOUNT", "QRIS", "E_WALLET"] as const;
const maxFileSize = 2 * 1024 * 1024;

function isAllowedProof(file: File, bytes: Buffer) {
  if (file.type === "application/pdf") return file.name.toLowerCase().endsWith(".pdf") && bytes.subarray(0, 5).toString() === "%PDF-";
  if (file.type === "image/jpeg") return /\.(jpe?g)$/i.test(file.name) && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return file.name.toLowerCase().endsWith(".png") && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return false;
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxFileSize + 128 * 1024) {
    return Response.json({ pesan: "Ukuran bukti transfer harus maksimal 2 MB." }, { status: 413 });
  }
  const form = await request.formData();
  const invoiceId = String(form.get("invoiceId") ?? "");
  const method = String(form.get("method") ?? "");
  if (!methods.includes(method as StudentPaymentMethod)) return Response.json({ pesan: "Pilih metode pembayaran yang tersedia." }, { status: 400 });
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, registration: { student: { userId: user.id } } },
    include: {
      registration: { include: { student: { include: { user: true } } } },
      payments: { where: { status: "MENUNGGU" }, select: { id: true }, take: 1 },
    },
  });
  if (!invoice) return Response.json({ pesan: "Tagihan tidak ditemukan." }, { status: 404 });
  if (invoice.status === "LUNAS" || invoice.status === "DIBATALKAN") return Response.json({ pesan: "Tagihan ini tidak dapat dibayar." }, { status: 409 });
  if (invoice.status === "KADALUWARSA" || (invoice.dueAt && invoice.dueAt.getTime() < Date.now())) {
    return Response.json({ pesan: "Batas pembayaran telah lewat." }, { status: 409 });
  }
  if (invoice.payments.length) return Response.json({ pesan: "Pembayaran tagihan ini masih menunggu konfirmasi." }, { status: 409 });
  const providerRequest = {
    invoiceNo: invoice.invoiceNo,
    amount: Number(invoice.amount),
    studentName: invoice.registration.student.fullName,
    studentEmail: invoice.registration.student.user?.email ?? user.email ?? "",
    method: method as StudentPaymentMethod,
  };
  let evidenceKey: string | undefined;
  let providerResult;
  if (method === "TRANSFER_BANK") {
    const evidence = form.get("evidence");
    if (!(evidence instanceof File) || evidence.size < 1 || evidence.size > maxFileSize) {
      return Response.json({ pesan: "Bukti transfer wajib diunggah (maksimal 2 MB)." }, { status: 400 });
    }
    const bytes = Buffer.from(await evidence.arrayBuffer());
    if (!isAllowedProof(evidence, bytes)) return Response.json({ pesan: "Bukti harus berupa PDF, JPG, atau PNG yang valid." }, { status: 400 });
    evidenceKey = createStorageKey(`pendaftaran/${invoice.registration.registrationNo}/pembayaran`, evidence.name.split(".").pop()?.toLowerCase() ?? "pdf");
    await uploadPrivateFile(evidenceKey, bytes, evidence.type);
    try {
      providerResult = await manualTransferProvider.createPayment({ ...providerRequest, evidenceKey });
    } catch (error) {
      await deletePrivateFile(evidenceKey);
      return Response.json({ pesan: error instanceof Error ? error.message : "Pembayaran tidak dapat diproses." }, { status: 502 });
    }
  } else {
    try {
      providerResult = await midtransProvider.createPayment(providerRequest);
    } catch (error) {
      return Response.json({ pesan: error instanceof Error ? error.message : "Penyedia pembayaran belum dapat memproses permintaan ini." }, { status: 502 });
    }
  }
  try {
    const payment = await prisma.$transaction(async (transaction) => {
      await transaction.invoice.update({ where: { id: invoice.id }, data: { status: "MENUNGGU" } });
      return transaction.payment.create({
        data: {
          invoiceId: invoice.id,
          provider: method === "TRANSFER_BANK" ? "MANUAL_TRANSFER" : "MIDTRANS_SANDBOX",
          providerRef: providerResult.providerRef || randomUUID(),
          amount: invoice.amount,
          status: "MENUNGGU",
          rawResponse: {
            evidenceKey: providerResult.evidenceKey ?? null,
            redirectUrl: providerResult.redirectUrl ?? null,
            instructions: providerResult.instructions ?? null,
          },
        },
      });
    });
    return Response.json({ paymentId: payment.id, redirectUrl: providerResult.redirectUrl, instructions: providerResult.instructions });
  } catch (error) {
    if (evidenceKey) {
      const { deletePrivateFile } = await import("@/lib/storage");
      await deletePrivateFile(evidenceKey);
    }
    throw error;
  }
}
