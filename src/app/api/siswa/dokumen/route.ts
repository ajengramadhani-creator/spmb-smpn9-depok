import { DocumentType, Role } from "@prisma/client";
import { createStorageKey, deletePrivateFile, storageConfigurationErrorResponse, uploadPrivateFile } from "@/lib/storage";
import { requireRole, roleErrorResponse } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

const maxSize = 2 * 1024 * 1024;
const allowedTypes: Record<string, DocumentType> = {
  KARTU_KELUARGA: DocumentType.KARTU_KELUARGA,
  AKTA_KELAHIRAN: DocumentType.AKTA_KELAHIRAN,
  RAPOR: DocumentType.RAPOR,
  PAS_FOTO: DocumentType.PAS_FOTO,
  IJAZAH: DocumentType.IJAZAH,
  BUKTI_PRESTASI: DocumentType.BUKTI_PRESTASI,
};

function detectedFileType(bytes: Buffer) {
  if (bytes.subarray(0, 5).toString() === "%PDF-") return { mime: "application/pdf", extension: "pdf" };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", extension: "jpg" };
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: "image/png", extension: "png" };
  return null;
}

export async function POST(request: Request) {
  let user;
  try {
    user = await requireRole([Role.SISWA], { redirectOnFailure: false });
  } catch (error) {
    return roleErrorResponse(error);
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxSize + 128 * 1024) {
    return Response.json({ pesan: "Ukuran berkas harus maksimal 2 MB." }, { status: 413 });
  }
  const form = await request.formData();
  const registrationId = String(form.get("registrationId") ?? "");
  const typeValue = String(form.get("type") ?? "");
  const file = form.get("file");
  if (!Object.hasOwn(allowedTypes, typeValue) || !(file instanceof File)) {
    return Response.json({ pesan: "Jenis dokumen atau berkas tidak valid." }, { status: 400 });
  }
  if (file.size < 1 || file.size > maxSize) {
    return Response.json({ pesan: "Ukuran berkas harus maksimal 2 MB." }, { status: 400 });
  }
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!["pdf", "jpg", "jpeg", "png"].includes(extension)) {
    return Response.json({ pesan: "Berkas harus berformat PDF, JPG, atau PNG." }, { status: 400 });
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectedFileType(bytes);
  if (!detected || (extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "png" ? "image/png" : "application/pdf") !== detected.mime || file.type !== detected.mime) {
    return Response.json({ pesan: "Isi berkas tidak sesuai dengan format yang dipilih." }, { status: 400 });
  }
  const registration = await prisma.registration.findFirst({
    where: { id: registrationId, student: { userId: user.id }, submittedAt: { not: null } },
    select: { id: true, registrationNo: true, track: { select: { type: true } } },
  });
  if (!registration) return Response.json({ pesan: "Pendaftaran tidak ditemukan." }, { status: 404 });
  const key = createStorageKey(`pendaftaran/${registration.registrationNo}/dokumen`, detected.extension);
  try {
    await uploadPrivateFile(key, bytes, detected.mime);
  } catch (error) {
    return storageConfigurationErrorResponse(error);
  }
  const previous = await prisma.document.findMany({
      where: { registrationId, type: allowedTypes[typeValue] },
      select: { id: true, storageKey: true },
  });
  let document;
  try {
    document = await prisma.$transaction(async (transaction) => {
      await transaction.document.deleteMany({ where: { registrationId, type: allowedTypes[typeValue] } });
      return transaction.document.create({
        data: {
          registrationId,
          type: allowedTypes[typeValue],
          fileName: file.name.replace(/[\r\n\\/]/g, "_").slice(0, 120),
          storageKey: key,
          mimeType: detected.mime,
          sizeBytes: bytes.length,
          encryptionIv: "",
          encryptionTag: "",
        },
      });
    });
  } catch (error) {
    await deletePrivateFile(key);
    throw error;
  }
  await Promise.all(previous
    .filter(({ storageKey }) => !storageKey.startsWith("http://") && !storageKey.startsWith("https://"))
    .map(({ storageKey }) => deletePrivateFile(storageKey)));
  return Response.json({ documentId: document.id, pesan: "Berkas berhasil diunggah." });
}
